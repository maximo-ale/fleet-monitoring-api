Fleet simulator HTTP-path investigation — 2026-09-05

The strongest findings are burst scheduling, excessive concurrent connection establishment with localhost address-family fallback, and load-generator CPU/event-loop overhead. There is no evidence that RabbitMQ, PostgreSQL, or workers cause these HTTP-only results. This investigation does not establish a Node version regression, Windows port exhaustion, or the validity of the historical 7500 RPS claim.

No application source was changed by this investigation. Only this diagnostics directory was added. The existing simulator was not executed: it truncates database tables and creates a geofence even when pointed at the empty endpoint. Diagnostics POSTed only to /api/empty, either on the running backend or on a separate child-process Express server with the identical handler. No infrastructure configuration was changed.

The working tree already contained edits to app.ts, simulate.ts, and positionWorker.ts. simulate.ts changed again while the investigation ran. At initial inspection its settings were 200 RPS, maxInFlight=100, tickMs=200, duration=15 seconds, targeting /api/vehicles/positions. These are not the settings described in the question. Observations below distinguish the initial and later snapshots where necessary.

**The scheduler imposes a capacity limit before HTTP performance enters the picture.**

On each interval callback, simulate.ts calculates:

```text
due = min(floor(elapsedSeconds * requestsPerSecond), targetRps * duration)
batch = due - attempted
```

It then synchronously iterates over the entire batch. Each iteration increments attempted. If inFlight is at the cap, it increments dropped; otherwise it increments sent and inFlight, generates a vehicle, and invokes sendRequest(). There is no await inside the dispatch loop. Fetch completions cannot decrement inFlight during that synchronous loop.

This is an open-loop arrival schedule with admission shedding: response completion does not determine the requested arrival times, but available capacity determines admission. It is not a smoothly paced network workload. The first dispatch is after one tick. Delayed callbacks calculate all elapsed arrivals and produce catch-up bursts, with no burst bound. A late last tick can attempt the remaining workload after the nominal deadline.

Even with zero network latency, each callback admits at most maxInFlight requests. Thus the approximate ideal dispatch ceiling is maxInFlight / tickSeconds; timer delays and outstanding requests lower it further. At target=3000, tick=200 ms produces approximately 600 arrivals per callback. cap=300 permits only about 1500 admissions/s and at least about 50% dropping. Increasing the cap to 1000 removes that particular bound but exposes larger fetch/socket bursts. At target=7500 and cap=900, a 200 ms tick permits only about 4500 admissions/s, so less than 10% dropping would be impossible for a sustained run under those settings. A 100 ms tick permits up to about 9000/s, so the older tick does not rule out the claimed result.

The supplied 1616/s example is above the approximate ceiling for cap=300/tick=200 ms. It therefore cannot be matched exactly to the current settings without the original tick, duration, counts, and metric denominator. The committed tick was 100 ms.

**Metrics measure different stages and must not be used interchangeably.**

| Metric | Actual meaning | Interpretation |
|---|---|---|
| attempted | Elapsed-time arrival slots processed by the scheduler, including dropped slots | Trustworthy accounting of intended arrivals, not HTTP traffic |
| sent | Incremented before vehicle creation and before calling sendRequest/fetch | Application admissions; not socket writes or server arrivals |
| accepted / earlier succeeded | sendRequest resolves after fetch returns an HTTP response with response.ok=true | Any 2xx response, not specifically 202; no proof of business processing or full body consumption |
| failed | Non-2xx responses and fetch rejections both count here | Conflates HTTP and transport failures; catch discards status/error cause |
| dropped | An arrival skipped locally because inFlight >= cap | No fetch call; not a network drop or backend rejection |
| inFlight | Admitted promises that have not completed their finally handler | Includes connect/queue/HTTP waits; excludes bodies still outstanding after fetch resolution; not a socket count |
| live RPS | sent / elapsed time during load; sent / loadElapsed afterwards | Cumulative admission rate, not a one-second rate or wire throughput |
| live APS | accepted / elapsed during load; accepted / frozen loadElapsed afterwards | Cumulative successful-header rate; can rise during drain using a frozen denominator |
| Load throughput | attempted / loadElapsed | Particularly misleading as delivered load: includes every dropped attempt |
| HTTP completion throughput; later renamed Acceptance throughput | (accepted + failed) / acceptedElapsed | Rate of settled operations through the final HTTP promise; includes failures and ends at headers, so not a successful/full-body throughput metric |
| latency | performance.now around JSON.stringify and fetch until response headers; recorded before response.ok check | Includes client scheduling, connection and transport waits; excludes pre-admission arrival delay, vehicle generation, body consumption, and all transport-rejected requests |
| processed / processing throughput | COUNT(*) from vehicle_positions, divided by elapsed time for throughput | Not applicable to /api/empty; not a run-correlated HTTP counter |

At stable observation points, attempted = sent + dropped and sent = accepted + failed + inFlight. Small promise-microtask transitions can temporarily affect the second identity. In-flight percentages also use inconsistent denominators between the live and initial final outputs. All error/drop percentages use attempted, not sent.

Latency percentiles are computed by sorting all retained header-latency samples and using ceil(n*p)-1. They include non-2xx responses but omit fetch rejections and drops, so cannot characterize all offered work. The live mean scans the entire growing array every second; end-of-run sorting is outside the load window. Empty samples produce NaN/undefined, and worstReq.toFixed can throw. Live logs await a database query after capturing elapsed time, so counters can advance while their denominator remains stale; overlapping async interval callbacks are also possible.

At initial inspection, the drain timeout compared performance.now() (absolute process-relative time) with acceptedElapsed (duration since load start), mixing time origins. In the later snapshot the timeout was removed entirely, processedAtLoadEnd moved to after HTTP completion, and "Acceptance throughput" still included failed. Consequently the later "Processed during load" includes HTTP drain, and an empty-endpoint run can poll the database indefinitely because it creates no position rows. These issues affect reporting/termination, not the demonstrated HTTP-path bottleneck. Fix HTTP-only mode before using the production simulator for this endpoint.

**Controlled measurements support connection-establishment and client-side bottlenecks.**

Raw output is in http-path-results.jsonl, http-path-extra.jsonl, and http-path-controls.jsonl. The harness is http-path.cjs. Each case starts a fresh client process; isolated cases start a separate Express process bound to IPv4. Payload is a fixed representative position JSON object. Cases use the simulator's elapsed-time catch-up/admission loop. They omit database polling, console logging during load, and random payload generation. Fetch has a diagnostic 10-second deadline; no deadline failures occurred. The node:http control consumes responses and uses keepAlive=true, maxSockets=64, without HTTP pipelining.

These are short exploratory runs of 8–10 seconds including cold connection setup, not repeated warmed capacity benchmarks. Other existing processes were left running. CPU figures use process.cpuUsage relative to wall time; 100% means one CPU core, and worker/GC threads can take process CPU above 100%. No stack profile or packet trace was collected, so exact CPU attribution and kernel-level causes remain unresolved. The live backend was not instrumented or restarted; only the isolated server provides an independent request counter.

| Server | Client / response handling | Target | Tick | Cap | Completed/s | Mean / p95 ms | Connections opened |
|---|---|---:|---:|---:|---:|---:|---:|
| Isolated, localhost | fetch / unread | 3000 | 200 | 300 | 832 | 244 / 657 | 300 |
| Isolated, localhost | fetch / unread | 3000 | 200 | 1000 | 875 | 915 / 4096 | 1000 |
| Isolated, IPv4 | fetch / unread | 3000 | 200 | 300 | 1378 | 75 / 165 | 300 |
| Isolated, IPv4 | fetch / unread | 3000 | 200 | 1000 | 2393 | 210 / 469 | 1054 |
| Isolated, localhost | fetch / consumed | 3000 | 200 | 1000 | 1243 | 620 / 2814 | 1000 |
| Isolated, IPv4 | fetch / consumed | 3000 | 200 | 1000 | 2590 | 169 / 388 | 1000 |
| Isolated, IPv4 | fetch / consumed | 3000 | 10 | 300 | 2648 | 42 / 133 | 319 |
| Live backend, localhost | fetch / unread | 3000 | 200 | 300 | 1218 | 116 / 254 | 300 |
| Live backend, localhost | fetch / unread | 3000 | 200 | 1000 | 1363 | 565 / 3016 | 1000 |
| Live backend, IPv4 | fetch / unread | 3000 | 200 | 300 | 848 | 237 / 474 | 300 |
| Live backend, IPv4 | fetch / unread | 3000 | 200 | 1000 | 2055 | 266 / 961 | 1000 |
| Isolated, IPv4 | fetch / unread | 7500 | 100 | 900 | 2635 | 267 / 467 | 900 |
| Isolated, IPv4 | node:http / consumed | 7500 | 100 | 900 | 5334 | 111 / 210 | 64 |
| Isolated, IPv4 | fetch / consumed | 7500 | 10 | 900 | 2470 | 339 / 485 | 900 |
| Isolated, IPv4 | node:http / consumed | 7500 | 10 | 900 | 5594 | 143 / 225 | 64 |

Every isolated case had server received = client accepted = client sent, with zero failures. Fetch sendHeaders and response-trailers counters also matched. For example, the 7500-target fetch case counted 60,000 attempts but only 21,674 server requests in 8.227 seconds including completion tail: 2635/s and 63.9% locally dropped. Its attempted-rate display would be approximately 7454/s. The matching 100 ms node:http case delivered 54,490 requests in 10.215 seconds. Different run durations and pooling mean this is a diagnostic implementation/configuration comparison, not a pure API microbenchmark.

The 7500-target/100 ms fetch client used about 158% of one core, with client event-loop p99=267 ms; the isolated server used about 85%. The corresponding node:http run used about 102% client CPU, event-loop p99=34 ms, and approximately 100% server CPU. Thus the trivial endpoint can exceed the fetch run's throughput substantially; the fetch path and connection policy are material limitations. At roughly 5300–5600/s, the control has both server and client near one core, so that is not a demonstrated network ceiling. Simply shortening fetch's tick to 10 ms did not make 7500 RPS achievable.

The smaller-cap live IPv4 result was worse than localhost in that single pair, illustrating variability and backend/environment contributions. Raising the cap did not reduce throughput in every measured pair, although it consistently exposed worse latency in the relevant burst tests. These results explain the mechanism and reproduce multi-second tails, not the precise ordering of every supplied throughput number.

**Global fetch already reuses connections, but its default pool is not bounded by an explicit socket budget.**

Runtime inspection of Node's bundled Undici source found Pool connections defaulting to null, allowing additional Clients when none is available; each default HTTP/1.1 Client has pipelining=1. Keep-alive defaults were 4000 ms, maximum 600000 ms, with a 2000 ms server-timeout threshold adjustment. The application sets no dispatcher or connection limits. maxInFlight is a promise budget, not a transport pool setting. Hundreds of same-origin admissions can therefore open hundreds of connections. In-flight completion at headers also means its cap is not a strict lifetime socket cap; an isolated cap=1000 test opened 1054 total connections.

Keep-alive reuse is proven by, for example, 7185 requests over 1000 connections with zero closes in one isolated localhost run. Large numbers of initial SYNs do not by themselves prove keep-alive failure or connection churn. Some IPv4 cases did close connections during load, but the dominant measured pattern was connection fan-out and reuse, not a connection per request. The harness's node:http reused counter is only req.reusedSocket and undercounts reuse when sockets transfer directly to queued requests; use server request/connection totals as the reliable reuse evidence.

sendHeaders instrumentation occurs immediately before the first socket write, not after server receipt or a TCP acknowledgment. In the live localhost cap=1000 test, time from Undici request creation to sendHeaders had mean=251 ms and p95=2499 ms. Much of the tail therefore existed before the request could reach the backend. This interval includes connection establishment, pool scheduling and event-loop delay; it does not isolate only queue wait. With a bounded Agent, admitted requests can explicitly queue awaiting a free socket too. [Undici diagnostic event definitions](https://github.com/nodejs/undici/blob/v7.18.2/docs/docs/api/DiagnosticsChannel.md).

The simulator never consumes or cancels response bodies. Undici recommends explicitly consuming or cancelling them because garbage collection is not a reliable connection-release strategy. However, all these tiny JSON responses reached the response-trailers event even in unread mode, and sockets were reused. Consuming bodies did not eliminate the localhost multi-second tails. This is a necessary reliability fix, not a proven sole cause of this regression; draining is preferable to cancellation when preserving HTTP/1.1 reuse. [Undici body-lifecycle guidance](https://raw.githubusercontent.com/nodejs/undici/v7.18.2/README.md).

**Windows/localhost connection pressure is real; port exhaustion is not established.**

localhost resolves here to ::1 then 127.0.0.1. Node's family autoselection is enabled, with an initial 250 ms attempt timeout. The live backend listens on both 0.0.0.0:3000 and [::]:3000, PID 36884; direct IPv6 returned 202. An initial IPv4-only netstat query hid the IPv6 listener, so a missing IPv6 listener is not the explanation for the live backend.

In the live cap=1000 localhost test, 1000 ::1 attempts led to 898 connectionAttemptTimeout events and 898 additional IPv4 attempts: 1898 address attempts for 1000 logical socket connections. No final request failed, and no logical socket closed during that run. On explicit IPv4 there were 1000 attempts and no family timeouts. This proves fallback under pressure, but not whether delayed connects originate in Windows accept/backlog handling, competing CPU work, or another host-level component. Autoselection is staggered fallback, not two unconditional simultaneous requests; address attempts must not be counted as duplicate HTTP requests. Event-loop stalls can delay a nominal 250 ms timeout as well. [Node family-selection documentation](https://nodejs.org/download/release/latest-v20.x/docs/api/net.html).

The deliberately IPv4-only isolated server is a useful fallback stress control, not an exact model of the live dual-stack binding. There cap=1000 produced 2000 address attempts, including 884 timeouts and 116 failures of the first family. The live test above separately confirms that fallback also occurs against the actual endpoint.

IPv4 and IPv6 dynamic TCP ranges are both 49152–65535 (16384 ports). Incidental whole-host TIME_WAIT snapshots were 183 and later 1254, not near that range's size; no diagnostic request reported EADDRNOTAVAIL, address exhaustion, or a connect failure. These snapshots are not peak measurements or proof against prior exhaustion. TCP cumulative failure/retransmission counters had no run-specific baseline, so they cannot establish causality. Capturing SYN/FIN/RST and per-process socket-state deltas during a longer fixed run remains necessary to attribute the user's observed churn or distinguish Windows networking from general connection overload. No OS tuning is justified by the present evidence.

**Git and runtime evidence cannot validate a two-day regression or the old 7500 figure.**

Current runtime is Node v24.13.1 with bundled Undici 7.18.2; details are saved in runtime.json. NODE_OPTIONS and NODE_USE_ENV_PROXY were unset. package.json has no direct Undici dependency or custom dispatcher. @types/node does not determine the executing runtime. Global fetch uses the Undici bundled with the Node executable, not an independently upgraded package-lock dependency. No prior runtime record or second runtime comparison exists here.

HEAD is 6a1a4af, dated August 28. Its simulator change from b2e5301 changed target 550 to 400 and eventTime to an ISO string; it did not change fetch, body handling, or the scheduler. HEAD settings were cap=5000, tick=100 ms, duration=120 seconds. The current uncommitted changes doubled tickMs to 200 and revised metrics/drain, besides changing target/cap/duration. These are established differences, but git cannot date individual uncommitted edits or reconstruct settings used two days earlier.

Searching tracked documentation, simulator history, all git refs and recent reflog found no 7500/900 benchmark record. docs/benchmarks.md records an older synchronous baseline around 550/s and does not validate the later claim. Earlier committed live RPS was sent/elapsed (admissions), while its final report separately printed attempted, sent and completion throughput. Therefore it would be wrong to assert that every old RPS metric counted attempted requests: only the actual old output can identify which number was read.

Verdict: 7500 HTTP requests/s with less than 10% dropping is unverified and was not reproduced. It is mathematically incompatible with cap=900 and tick=200 ms, but possible in principle with the committed 100 ms tick. The demonstrated attempted-rate illusion is a plausible misinterpretation, not historical proof. Validate an old run only from its duration, attempted/sent/success/failed/drop totals, outstanding count and drain, ideally corroborated by server request counts or an HTTP-level trace. With negligible failures and drops genuinely below 10%, at least about 6750 admissions/s would be expected at a 7500 target; a low-drop claim alone still cannot prove those requests reached the server during the load window.

**Small permanent changes should make stages and resource budgets explicit.**

1. Add HTTP-only mode and CLI/env configuration for URL, RPS, duration, tick and connection/admission budgets. HTTP-only mode must skip table truncation, geofence creation, database polling and processed-based drain.
2. Pace smaller arrival batches (for example 5–10 ms), bound catch-up work, and count overdue arrivals explicitly. Do not silently recover unlimited timer debt or silently lower the offered rate. Record scheduled-versus-actual dispatch delay and deadline overrun.
3. Consume every response body before releasing the admission slot. Record separate header and full-response latency. Include failures/timeouts in their own distributions and preserve error causes/status codes. Add a per-request wall-clock deadline and a bounded final HTTP drain with cancellation/accounting.
4. Keep fetch initially, but give it an explicit compatible Undici Pool/Agent connection budget, independently configurable from maxInFlight; 32/64/128 are test points, not established optimums. Use 127.0.0.1 for a deterministic local IPv4 baseline, with IPv6/localhost separate cases. A bounded dispatcher may queue, so instrument queue time. The node:http harness is a diagnostic control, not a production refactor recommendation.
5. Rename sent to admitted and Load throughput to scheduled/attempted rate. Report one-second counter deltas and common-window admitted, socket-write-start, server-received, successful full responses, failures, drops and outstanding counts. Never label successes plus failures as acceptance throughput or use a frozen load denominator for drain completions.
6. Separate actual load end, final HTTP completion, and optional business drain using one monotonic origin. Use bounded histograms instead of repeated full-array scans for longer runs. Record exact Node/Undici versions, settings, commit and dirty diff with every result.

These are recommendations only; no permanent fixes were applied or declared validated.

**Future capacity measurements need a fixed, independently observed workload.**

Use the isolated empty route first, then the actual backend empty route. Keep request/response size, client build, runtime, connection limit and address family fixed. Run client and server separately; use a second machine to establish backend capacity beyond the local generator's CPU ceiling. Avoid watch mode for stable measurements and retain the exact source/runtime configuration.

Warm the chosen pool and JIT, discard the warm-up interval, then run at least 60–120 seconds at each offered-rate step. Repeat at least three times with varied ordering and report variability. Capture per-second offered/admitted/write/server-received/full-success rates, drops, timeouts and outstanding work in the same window. Capture client and server CPU/event-loop delay plus connection opens/closes, address attempts, and TCP states during that window. Reconcile counts again after bounded drain, reporting the drain separately.

Compare address families, tick size, connection budget and client implementation one variable at a time. A valid claimed capacity must satisfy the agreed loss/error and latency limits while server arrivals and successful completions sustain the claimed rate, queues remain bounded, and the generator has headroom. A target or attempted-rate display alone is never a capacity result.

To rerun the initial isolated diagnostic matrix from the repository root:

```powershell
node diagnostics/http-path.cjs
```

Individual cases use `node diagnostics/http-path.cjs client <JSON-config>`; inspect the runner in the file for the schema. `external:true` targets only /api/empty on local port 3000. The saved results are the evidence from this investigation, not assertions of repeatable benchmark capacity. `node --check diagnostics/http-path.cjs` passed; the diagnostic cases themselves exercised both clients and reconciled isolated server counts.
