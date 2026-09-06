// Diagnostic only: no application imports, database access, or production changes.
const http = require('node:http');
const net = require('node:net');
const dc = require('node:diagnostics_channel');
const { fork } = require('node:child_process');
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');

if (process.argv[2] === 'server') {
  const express = require('../backend/node_modules/express');
  const app = express();
  let received = 0, connections = 0, active = 0, peak = 0, closed = 0;
  const loop = monitorEventLoopDelay({ resolution: 10 }); loop.enable();
  const cpu = process.cpuUsage(); const start = performance.now();
  app.post('/api/empty', (req, res) => { received++; res.status(202).json({ message: 'Accepted' }); });
  const server = http.createServer(app);
  server.on('connection', socket => {
    connections++; active++; peak = Math.max(peak, active);
    socket.on('close', () => { active--; closed++; });
  });
  server.listen(0, '0.0.0.0', () => process.send({ port: server.address().port }));
  process.on('message', () => {
    const usage = process.cpuUsage(cpu);
    process.send({ received, connections, active, peak, closed,
      cpuCorePercent: (usage.user + usage.system) / ((performance.now() - start) * 10),
      loopP99Ms: loop.percentile(99) / 1e6 });
  });
} else if (process.argv[2] === 'client') {
  (async () => {
    const cfg = JSON.parse(process.argv[3]);
    let child, port = 3000;
    if (!cfg.external) {
      child = fork(__filename, ['server'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
      port = (await new Promise(resolve => child.once('message', resolve))).port;
    }
    const url = `http://${cfg.host}:${port}/api/empty`;
    let connects = 0, connectionAttempts = 0, attemptFailed = 0, attemptTimeout = 0, connectsClosed = 0;
    const addressEvents = {};
    const record = (kind, ip, family, code = '') => {
      const key = `${kind}:${ip}:${family}:${code}`; addressEvents[key] = (addressEvents[key] || 0) + 1;
    };
    const originalConnect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function (...args) {
      connects++;
      this.on('connectionAttempt', (ip, port, family) => { connectionAttempts++; record('attempt', ip, family); });
      this.on('connectionAttemptFailed', (ip, port, family, error) => { attemptFailed++; record('failed', ip, family, error.code); });
      this.on('connectionAttemptTimeout', (ip, port, family) => { attemptTimeout++; record('timeout', ip, family); });
      this.on('close', () => connectsClosed++);
      return originalConnect.apply(this, args);
    };
    const created = new WeakMap(); let headersSent = 0, bodyComplete = 0;
    const queueMs = [];
    dc.channel('undici:request:create').subscribe(({ request }) => created.set(request, performance.now()));
    dc.channel('undici:client:sendHeaders').subscribe(({ request }) => {
      headersSent++; if (created.has(request)) queueMs.push(performance.now() - created.get(request));
    });
    dc.channel('undici:request:trailers').subscribe(() => bodyComplete++);
    const agent = new http.Agent({ keepAlive: true, maxSockets: cfg.sockets || 64 });
    const payload = JSON.stringify({ vehicleId: '550e8400-e29b-41d4-a716-446655440000', lon: 45, lat: 45, speed: 60, eventTime: new Date().toISOString() });
    let attempted = 0, sent = 0, dropped = 0, inFlight = 0, peakInFlight = 0, accepted = 0, failed = 0, reused = 0;
    const errors = {}, latencies = [], ticks = [];
    const loop = monitorEventLoopDelay({ resolution: 10 }); loop.enable();
    const cpu = process.cpuUsage(); const start = performance.now(); let lastTick = start;
    const send = async () => {
      const began = performance.now();
      try {
        if (cfg.client === 'http') {
          await new Promise((resolve, reject) => {
            const req = http.request(url, { method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } }, res => {
              if (req.reusedSocket) reused++;
              res.resume(); res.on('end', () => res.statusCode >= 200 && res.statusCode < 300 ? resolve() : reject(new Error(`status-${res.statusCode}`)));
              res.on('error', reject);
            });
            req.on('error', reject); req.setTimeout(10000, () => req.destroy(new Error('timeout'))); req.end(payload);
          });
        } else {
          const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, signal: AbortSignal.timeout(10000) });
          if (cfg.consume) await response.arrayBuffer();
          if (!response.ok) throw new Error(`status-${response.status}`);
        }
        accepted++; latencies.push(performance.now() - began);
      } catch (error) { failed++; const key = error.cause?.code || error.message; errors[key] = (errors[key] || 0) + 1; }
      finally { inFlight--; }
    };
    const load = await new Promise(resolve => {
      const timer = setInterval(() => {
        const now = performance.now(), elapsed = now - start; ticks.push(now - lastTick); lastTick = now;
        const due = Math.min(Math.floor(elapsed / 1000 * cfg.rps), cfg.rps * cfg.seconds);
        const count = due - attempted;
        for (let i = 0; i < count; i++) {
          attempted++; if (inFlight >= cfg.cap) { dropped++; continue; }
          sent++; inFlight++; peakInFlight = Math.max(peakInFlight, inFlight); void send();
        }
        if (elapsed >= cfg.seconds * 1000) { clearInterval(timer); resolve({ elapsed, completed: accepted + failed, inFlight }); }
      }, cfg.tick);
    });
    while (inFlight) await new Promise(resolve => setTimeout(resolve, 5));
    const totalMs = performance.now() - start;
    const usage = process.cpuUsage(cpu);
    const stats = arr => {
      arr.sort((a,b) => a-b); return { mean: arr.reduce((a,b) => a+b,0)/(arr.length || 1), p95: arr[Math.max(0,Math.ceil(arr.length*.95)-1)] || 0, max: arr.at(-1) || 0 };
    };
    let server;
    if (child) { child.send('stats'); server = await new Promise(resolve => child.once('message', resolve)); }
    console.log(JSON.stringify({ cfg, attempted, sent, dropped, accepted, failed, errors, peakInFlight,
      load, totalMs, completionRps: (accepted+failed)/totalMs*1000, admittedRps: sent/load.elapsed*1000,
      latencyMs: stats(latencies), ticksMs: stats(ticks), createToHeadersMs: stats(queueMs), headersSent, bodyComplete,
      connects, connectionAttempts, attemptFailed, attemptTimeout, connectsClosed, reused, addressEvents,
      cpuCorePercent: (usage.user+usage.system)/(totalMs*10), loopP99Ms: loop.percentile(99)/1e6, server }));
    agent.destroy(); if (child) child.kill(); process.exit(0);
  })().catch(error => { console.error(error); process.exit(1); });
} else {
  (async () => {
    const configs = [];
    for (const host of ['localhost', '127.0.0.1']) for (const cap of [300, 1000])
      configs.push({ host, cap, client: 'fetch', consume: false, tick: 200 });
    for (const host of ['localhost', '127.0.0.1']) {
      configs.push({ host, cap: 1000, client: 'fetch', consume: true, tick: 200 });
      configs.push({ host, cap: 1000, client: 'http', tick: 200 });
      configs.push({ host, cap: 300, client: 'fetch', consume: true, tick: 10 });
    }
    for (const cfg of configs) {
      const child = fork(__filename, ['client', JSON.stringify({ rps: 3000, seconds: 8, ...cfg })], { stdio: 'inherit' });
      await new Promise(resolve => child.on('exit', resolve));
    }
  })();
}
