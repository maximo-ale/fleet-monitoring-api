# Benchmarks

This document records historical benchmark results for an earlier
direct-ingestion baseline. The results have not been refreshed for the current
synchronous flow, which also updates latest vehicle state and evaluates speed
and active-geofence rules. Do not treat the numbers below as a measurement of
the current implementation.

## 10 Requests per Second

Historical goal: validate that the architecture under test could sustain 10
position ingestion requests per second.

### Historical Architecture Under Test

- Express API.
- Direct PostgreSQL/PostGIS insert per request.
- No message broker.
- No workers.
- No batching.

### Endpoint

```http
POST /api/vehicles/positions
```

### Benchmark Conditions

- Duration: `60` seconds.
- Target rate: `10` events per second.
- Expected total events: `600`.
- Payloads: generated vehicle position events with valid UUIDs, longitude,
  latitude, speed, and event timestamp values.
- Persistence: each accepted request is inserted into `vehicle_positions`.

### Acceptance Criteria

- Error rate below `1%`.
- No uncontrolled memory growth.
- Database stores the received events.
- Results are documented.

### Result

The architecture measured at the time satisfied the Level 1 target. The
ingestion simulator sent fixed-rate position events to the API, and the
direct-ingestion path handled the required `10` requests per second.

The current simulator has also been used at rates above the Level 1 target,
including more than `700` requests per second for ingestion-only testing. Those
higher-rate runs are useful as an early capacity signal, but they do not
represent the final backend capacity once additional domain behavior is added.

### Observed Limitations

- The benchmark measures only the ingestion path.
- Speed limit alert evaluation now runs in the ingestion transaction, but this
  benchmark does not measure alert delivery or downstream alert workflows.
- The historical run did not measure the current active-geofence check or
  `GEOFENCE_EXIT` alert creation.
- The API still does not run route checks or additional PostGIS-heavy domain
  rules.
- The benchmark does not include workers, queues, batching, or alert delivery.

Because of those limitations, this result should be treated as a historical
Level 1 direct-write baseline. A new benchmark is needed for the current
synchronous ingestion, latest-state, alerting, and geospatial workload.
