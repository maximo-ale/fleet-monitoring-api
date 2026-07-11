# Architecture

The current version uses a direct-ingestion architecture. The API receives an
HTTP request, validates the data, and writes directly to PostgreSQL/PostGIS.

## Current Components

- `backend/src/server.ts`: loads the application and starts the HTTP listener.
- `backend/src/app.ts`: initializes Express, prepares the database, optionally
  clears its tables, registers routes, and mounts the error middleware.
- `backend/src/config/dbConfig.ts`: creates the PostgreSQL connection pool.
- `backend/src/utils/createTables.ts`: creates extensions and the required
  vehicle position, latest-state, alert, and geofence tables.
- `backend/src/utils/dropTables.ts`: clears the current tables when
  `RESET_DB=true` or tests/simulator reset data.
- `backend/src/middlewares/schemaValidator.ts`: validates requests with Zod.
- `backend/src/middlewares/errorHandler.ts`: centralizes error responses.
- `backend/src/models/health`: exposes `GET /api/health`.
- `backend/src/models/vehicles`: contains routes, controller, service,
  repository, interfaces, and schemas for position ingestion and latest-state
  reads.
- `backend/src/models/alerts`: exposes recent alert reads and their optional
  result limit.
- `backend/src/models/geofences`: contains the current geofence data interface
  and persistence used by tests and the simulator. There are no public
  geofence CRUD endpoints yet.
- `backend/src/scripts/simulate.ts`: sends simulated vehicle position events to
  the ingestion endpoint at a fixed target rate and reports benchmark metrics.
- `backend/tests`: contains Jest/Supertest API tests and shared test setup.
- `backend/jest.config.cjs`: configures Jest to run TypeScript tests in the
  current ESM project.

## Ingestion Flow

1. The client sends `POST /api/vehicles/positions`.
2. Express receives the request and parses the JSON body.
3. The validation middleware applies `createPositionSchema`.
4. If the data is invalid, the API responds with `400`.
5. If the data is valid, the controller calls the service.
6. The service starts a database transaction.
7. The repository stores the position event.
8. The repository upserts the latest vehicle state.
9. If `speed` is greater than `SPEED_LIMIT`, the repository stores a
   `SPEED_LIMIT_EXCEEDED` alert with the vehicle, speed, position, and event
   timestamp.
10. The repository uses PostGIS `ST_Covers` to check whether the position is
    covered by at least one active geofence.
11. If no active geofence covers the position, the repository stores a
    `GEOFENCE_EXIT` alert.
12. The service commits the transaction.
13. The API responds with `201` and the created position.

Position storage, latest-state persistence, and any generated alerts are part
of the same database transaction. With no active geofence covering a reported
point, that position produces a `GEOFENCE_EXIT` alert.

## Simulator Flow

The simulator is a local load-generation script for the ingestion endpoint.

1. The script clears `vehicle_positions`, `vehicle_last_state`,
   `vehicle_alerts`, and `geofences`.
2. It creates a default active rectangular geofence for the simulation.
3. It generates random vehicle position payloads using known vehicle UUIDs and
   a current event timestamp. Most positions fall inside the geofence, while a
   small percentage fall outside it. Most speeds stay within `SPEED_LIMIT`,
   while a small percentage exceed it.
4. It schedules requests according to the configured target events per second.
5. It sends `POST /api/vehicles/positions` requests to the local API.
6. It tracks attempted, sent, successful, failed, in-flight, and dropped
   requests.
7. It records request latency and reports average, p50, p95, p99, worst
   request latency, and generated speed-alert and geofence-exit counters.

This simulator is intended to measure the current direct-ingestion path only.
It exercises the current synchronous speed and geofence checks, but does not
represent capacity with future asynchronous processing, route checks, or
additional PostGIS rules.

## Current Data Model

Table: `vehicle_positions`

Columns:

- `id`: UUID generated with `gen_random_uuid()`.
- `vehicle_id`: vehicle UUID.
- `position`: geographic point as `geography(POINT, 4326)`.
- `speed`: speed as `DOUBLE PRECISION`.
- `event_time`: vehicle event timestamp with time zone.
- `created_at`: database insertion timestamp with time zone.

Table: `vehicle_last_state`

Columns:

- `vehicle_id`: unique vehicle UUID.
- `position`: latest geographic point as `geography(POINT, 4326)`.
- `speed`: latest speed as `DOUBLE PRECISION`.
- `last_state_time`: latest vehicle event timestamp with time zone.
- `updated_at`: latest-state row update timestamp with time zone.

Table: `vehicle_alerts`

Columns:

- `id`: UUID generated with `gen_random_uuid()`.
- `vehicle_id`: vehicle UUID related to the alert.
- `alert_type`: alert type. Supported values are `SPEED_LIMIT_EXCEEDED` and
  `GEOFENCE_EXIT`.
- `speed`: speed reported by the vehicle event.
- `position`: geographic point as `geography(POINT, 4326)`.
- `event_time`: vehicle event timestamp with time zone.

Table: `geofences`

Columns:

- `id`: UUID generated with `gen_random_uuid()`.
- `name`: geofence name, up to 100 characters.
- `area`: PostGIS polygon as `geometry(POLYGON, 4326)`.
- `is_active`: whether the geofence participates in position checks.
- `created_at`: database insertion timestamp with time zone.

## Database

On startup, the application creates the following if needed:

- `postgis` extension.
- `pgcrypto` extension.
- `vehicle_positions` table.
- `vehicle_last_state` table.
- `vehicle_alerts` table.
- `geofences` table.

This allows the initial version to run without external migrations.

## Error Handling

Data validation responds directly with `400` from the schema middleware. Custom
errors that extend `DefaultError` are handled by the centralized middleware.
Any other error is returned as `500 Internal server error`.

## Current Limitations

- There is no authentication or authorization.
- There is no endpoint for querying position history; only latest-state reads
  are currently available.
- There are no update or delete endpoints.
- There is no message broker or asynchronous processing.
- There are no workers.
- There are no bulk inserts.
- There are no public geofence CRUD endpoints.
- There are no alert notification, acknowledgement, or resolution workflows.
- There are no per-vehicle speed limits.
- The current benchmark script drives only the position-ingestion endpoint,
  including its synchronous latest-state, speed, and geofence processing.
- There is no formal API versioning.
- Table creation is embedded in application startup.
- The current `docker-compose.yml` defines the database, but not a complete
  service setup for running backend and database together.
