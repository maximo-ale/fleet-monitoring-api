import { CreatePosition } from '../models/vehicles/vehicleInterface';
import { cleanTables } from '../utils/dropTables';

let success = 0;
let failed = 0;
let sent = 0;
let inFlight = 0;
let dropped = 0;
let attempted = 0;

const maxInFlight = 5000;

const requestsPerSecond = 500;
const tickMs = 100;
const timeToWork = 300;

const requestsToAttempt = requestsPerSecond * timeToWork;

const minLon: number = -180;
const maxLon: number = 180;
const minLat: number = -90;
const maxLat: number = 90;
const maxSpeed: number = 200;

const apiUrl: string = 'http://localhost:3000/api/vehicles/positions'; 

let elapsed = 0;

let latencies: number[] = [];

const uuids = [
  "550e8400-e29b-41d4-a716-446655440000",
  "6f1ed002-abd2-4c8a-bb64-4f6c0978a111",
  "c3d9b8f2-1a4e-4e6d-9d3b-7f2c1a9e5b22",
  "a9e2f1c4-8b7d-4f3a-9c2e-1d6b8f0a3c33",
  "12b9e6a4-5c8f-4d2a-91e3-7a0c4f9b8d44",
  "e84c7b2a-3d91-4f6e-a2b8-9c5d1f0a6e55",
  "9d4f2a1b-6c8e-4b3f-9a7d-2e5c0f8b1a66",
  "f1a6c8d2-9b4e-4f7a-83c1-6d0e2b5a9f77",
  "3c9e1f6a-7b2d-4a8f-91c5-e0d6b3a2f888",
  "b7a2d9c1-4e6f-4b8a-93d5-1f0c6e9a2b99",
  "0f8a6c3d-2b9e-4d1f-a7c5-6e2b9d0f1aaa",
  "d2b7f1a9-6c3e-4f8a-91d0-b5e6c2a9fbbb",
  "7a1c9e4f-2d6b-4a8f-b3e5-0c9d1f6a2ccc",
  "4f6b9d2a-8c1e-4a7f-93b5-d0e2c6a9fddd",
  "a1d9f6c3-7b2e-4f8a-91c5-e6b0d2a9feee",
  "c8e2a6f1-9d4b-4a7c-b3e5-1f0d6a2c9fff",
  "2b9f6a1d-4c8e-4f7a-91d3-e5b0c6a2d111",
  "e6c3a9f1-2d7b-4a8e-b5c1-0f9d6a2e3222",
  "91f2c6a3-8d4e-4b7a-a5c1-6e0d9f2b4333",
  "5a9d1f6c-3e7b-4a8f-92c5-d0e6b2a9f444",
];

const randomLon = (): number => {
    return Math.random() * (maxLon - minLon) + minLon;
}

const randomLat = (): number => {
    return Math.random() * (maxLat - minLat) + minLat;
}

const randomSpeed = (): number => {
    return Math.random() * maxSpeed;
}

const getPercentile = (arr: number[], n: number): number => {
    if (arr.length === 0) return 0;

    const index = Math.ceil(arr.length * n) - 1;
    const safeIndex = Math.max(0, Math.min(index, arr.length - 1));

    return arr[safeIndex];
}

const showResults = () => {
    latencies.sort((a, b) => a - b);

    const averageLatency = latencies.reduce((acc, current) => acc + current, 0) / latencies.length;
    
    const p50 = getPercentile(latencies, 0.5);
    const p95 = getPercentile(latencies, 0.95);
    const p99 = getPercentile(latencies, 0.99);

    const worstReq = latencies[latencies.length - 1];

    console.log('');
    console.log('--------Work Finished--------')
    console.log(`Time tested: ${Math.floor(elapsed / 1000)}s`);
    console.log('');
    console.log(`Attempted requests: ${attempted} ${Number((attempted / elapsed * 1000).toFixed(2))}/s`);
    console.log(`Total requests sent: ${sent} ${Number((sent / elapsed * 1000).toFixed(2))}/s`);
    console.log('');
    console.log(`Requests succeeded: ${success} ${Number((success / elapsed * 1000).toFixed(2))}/s`);
    console.log('');
    console.log(`Requests failed: ${failed}`);
    console.log(`Requests in flight: ${inFlight}`);
    console.log(`Requests dropped: ${dropped}`);
    console.log('');
    console.log(`p50: ${p50}`);
    console.log(`p95: ${p95}`);
    console.log(`p99: ${p99}`);
    console.log(`Worst req: ${worstReq}`);
    console.log(`Average latency: ${Number(averageLatency.toFixed(2))}ms`);
}

const createVehicle = (): CreatePosition => {
    return {
        vehicleId: uuids[Math.floor(Math.random() * uuids.length)],
        lon: randomLon(),
        lat: randomLat(),
        speed: randomSpeed(),
        eventTime: new Date(),
    }
}

const sendRequest = async(vehicle: CreatePosition) => {
    const start = performance.now();

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(vehicle),
    });

    const latency = performance.now() - start;

    latencies.push(latency);
    
    if (!response.ok){
        throw new Error('Error');
    }

}

const main = async() => {
    await cleanTables();
    const start = performance.now();

    const logsInterval = setInterval(() => {

        const timeElapsed = performance.now() - start;
        const averageLatency = latencies.reduce((acc, current) => acc + current, 0) / latencies.length;
        
        console.log('');
        console.log(`Time elapsed: ${Math.floor(timeElapsed / 1000)}s`);
        console.log(`Sent: ${sent}`);
        console.log(`RPS: ${Number((sent / timeElapsed * 1000).toFixed(2))}`);
        console.log(`SPS: ${Number((success / timeElapsed * 1000).toFixed(2))}`);
        console.log(`Succeeded: ${success}`);
        console.log(`Failed: ${failed}`);
        console.log(`In flight: ${inFlight}`);
        console.log(`Dropped: ${dropped}`);
        console.log(`Attempted: ${attempted}`);
        console.log(`Average latency: ${Number(averageLatency.toFixed(2))}ms`);
        console.log('');
        console.log('');
    }, 1000);

    const sendRequestsInterval = setInterval(async() => {
        elapsed = performance.now() - start;

        const shouldHaveAttempted = Math.min(
            Math.floor((elapsed / 1000) * requestsPerSecond),
            requestsToAttempt,
        );
    
        const toSendNow = shouldHaveAttempted - attempted;
        
        for (let i = 0; i < toSendNow; i++){
            attempted++;

            if (inFlight >= maxInFlight){
                dropped++;
                continue;
            }

            sent++;
            inFlight++;
            
            const vehicle: CreatePosition = createVehicle();


            sendRequest(vehicle)
                .then(() => {
                    success++;
                })
                .catch(() => {
                    failed++;
                })
                .finally(() => {
                    inFlight--;
                    
                    if (attempted >= requestsToAttempt && inFlight === 0){
                        clearInterval(logsInterval);
                        elapsed = performance.now() - start;
                        showResults();
                    }
                });
        }

        if (elapsed >= timeToWork * 1000){
            clearInterval(sendRequestsInterval);

            console.log('------------------------------------------------------');
            console.log(`All requests were attempted`);
            console.log(`Attempted ${attempted} requests in ${Number(elapsed.toFixed(3))} ms`);
            console.log('------------------------------------------------------');
        }
    }, tickMs);
}

main();