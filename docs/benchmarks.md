# Historical Synchronous Ingestion Benchmark

This benchmark records the synchronous vehicle-position ingestion baseline
measured before the current RabbitMQ-based asynchronous flow was introduced.
It is historical context only; it does not measure the current worker or
end-to-end asynchronous processing.

## Summary

The observed stable throughput is approximately **550 requests per second** in
the local benchmark environment. The 550 RPS validation run sustained the
target for two minutes, accepted all 66,000 requests, produced no failures or
drops, and required only 0.13 seconds to finish the remaining in-flight work.

At 600 RPS, a shorter run still completed successfully but showed clear latency
degradation and additional drain time. At 700 RPS, the simulator could not
maintain the target: requests were dropped, requests failed, and latency rose
sharply. The result should therefore be treated as an approximate local
capacity boundary rather than a universal production limit.

## System Under Test

- Express and TypeScript API running locally with Node.js.
- PostgreSQL/PostGIS 16-3.5 running in Docker and exposed on local port 5433.
- Endpoint: `POST /api/vehicles/positions`.
- One request and database transaction per vehicle-position event.
- No message broker, workers, batching, or bulk inserts at the time of
  measurement.

Each accepted request synchronously:

1. Inserts the position into `vehicle_positions`.
2. Upserts the vehicle's latest state in `vehicle_last_state`.
3. Evaluates the configured speed limit and persists an alert when exceeded.
4. Checks the position against the active PostGIS geofence and persists an
   exit alert when outside it.

The API and simulator ran on the same development machine. Machine CPU and RAM
specifications were not captured, so these numbers are intended for comparing
future versions in a similar local environment, not for production sizing.

## Workload and Method

The existing simulator in `backend/src/scripts/simulate.ts` was run against the
local ingestion endpoint at several fixed target rates. Before every run it
truncated the position, latest-state, alert, and geofence tables and created one
active rectangular geofence.

The simulator selected vehicles from 20 UUIDs and generated a realistic event
mix for the current project:

- Approximately 1% of events exceeded the speed limit.
- Approximately 10% of events fell outside the active geofence.
- Requests were dispatched every 100 ms.
- At most 5,000 requests could be in flight; additional attempts were counted
  as dropped.

The load duration measures the dispatch window. Total duration also includes
the time required for responses still in flight after dispatch ended. Send rate
is calculated over the load duration, while completion throughput is calculated
over total duration.

## Results

| Target RPS | Load duration | Attempted | Sent | Succeeded | Failed | Dropped | Completion throughput | p50 | p95 | p99 | Average | Outcome |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 500 | 60.01 s | 30,000 | 30,000 | 30,000 | 0 | 0 | 499.24/s | 56.96 ms | 167.70 ms | 316.57 ms | 67.30 ms | Stable |
| 550 | 120.09 s | 66,000 | 66,000 | 66,000 | 0 | 0 | 549.00/s | 122.44 ms | 892.78 ms | 977.54 ms | 281.14 ms | Stable, long validation |
| 575 | 60.00 s | 34,500 | 34,500 | 34,500 | 0 | 0 | 573.97/s | 61.78 ms | 187.56 ms | 372.94 ms | 74.77 ms | Successful exploratory run |
| 600 | 60.05 s | 36,000 | 36,000 | 36,000 | 0 | 0 | 589.21/s | 129.14 ms | 1,022.60 ms | 1,241.52 ms | 247.44 ms | Degraded / boundary |
| 700 | 61.22 s | 42,000 | 33,844 | 28,321 | 5,523 | 8,156 | 511.08/s | 6,906.33 ms | 14,997.72 ms | 15,818.89 ms | 7,887.85 ms | Unstable |

The 550 RPS validation generated 589 speed-limit events and 6,576 geofence-exit
events. Its worst observed request latency was 1,141.52 ms. Total duration was
120.22 seconds, only 0.13 seconds longer than the load window.

## Observed Limit

For planning the next project stage, **approximately 550 RPS is the maximum
validated stable synchronous throughput**. A short 575 RPS exploratory run also
completed cleanly, so 550 RPS is a conservative operating boundary rather than
a claim that failure begins at exactly 551 RPS.

The transition is evident above that range: 600 RPS increased tail latency and
needed about one additional second to drain, while 700 RPS could not dispatch
or complete the requested workload successfully. Pinpointing a narrower limit
was not necessary for this baseline because performance depends on the local
machine and the next architectural work will change the processing model.

## Limitations

- Results describe one local development environment and one simulator/API
  process arrangement.
- CPU, RAM, and resource utilization were not recorded.
- The simulator and API shared the host, so client load generation also used
  host resources.
- Event selection is random, causing small differences in alert counts and
  latency between runs.
- The benchmark does not test multiple API instances, production networking,
  route checks, alert delivery, delayed or out-of-order events, or future
  asynchronous processing.
- No database or application optimization was performed as part of this work.

## Historical Baseline

An earlier ingestion-only benchmark validated 10 RPS before latest-state and
geofence processing were part of the complete synchronous flow. That result is
superseded by the benchmark above for the current implementation.
