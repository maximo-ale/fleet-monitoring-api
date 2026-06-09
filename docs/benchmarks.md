# Benchmarks

This document records benchmark results for the current direct-ingestion
architecture.

## 10 Requests per Second

Goal: validate that the current backend architecture can sustain 10 position
ingestion requests per second.

### Architecture Under Test

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
  latitude, and speed values.
- Persistence: each accepted request is inserted into `vehicle_positions`.

### Acceptance Criteria

- Error rate below `1%`.
- No uncontrolled memory growth.
- Database stores the received events.
- Results are documented.

### Result

The current architecture satisfies the Level 1 target. The ingestion simulator
can send fixed-rate position events to the API, and the direct-ingestion path is
able to handle the required `10` requests per second.

The current simulator has also been used at rates above the Level 1 target,
including more than `700` requests per second for ingestion-only testing. Those
higher-rate runs are useful as an early capacity signal, but they do not
represent the final backend capacity once additional domain behavior is added.

### Observed Limitations

- The benchmark measures only the ingestion path.
- The API does not yet evaluate speed alerts.
- The API does not yet validate whether a vehicle is inside an allowed position
  or geofence.
- The API does not yet run route checks or other PostGIS-heavy domain rules.
- The benchmark does not include workers, queues, batching, or alert delivery.

Because of those limitations, this result should be treated as a Level 1
baseline for direct writes, not as a guarantee for future alerting or geospatial
processing workloads.
