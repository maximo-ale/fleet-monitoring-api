# Architecture

The current version uses a direct-ingestion architecture. The API receives an
HTTP request, validates the data, and writes directly to PostgreSQL/PostGIS.

## Current Components

- `backend/src/server.ts`: initializes Express, loads environment variables,
  prepares the database, registers routes, and mounts the error middleware.
- `backend/src/config/dbConfig.ts`: creates the PostgreSQL connection pool.
- `backend/src/utils/createTables.ts`: creates extensions and the required
  vehicle position and alert tables.
- `backend/src/utils/dropTables.ts`: clears the current tables when
  `RESET_DB=true` or tests/simulator reset data.
- `backend/src/middlewares/schemaValidator.ts`: validates requests with Zod.
- `backend/src/middlewares/errorHandler.ts`: centralizes error responses.
- `backend/src/models/health`: exposes `GET /api/health`.
- `backend/src/models/vehicles`: contains routes, controller, service,
  repository, interfaces, and schemas for the position flow.
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
10. The service commits the transaction.
11. The API responds with `201` and the created position.

## Simulator Flow

The simulator is a local load-generation script for the ingestion endpoint.

1. The script clears the `vehicle_positions` table.
2. It generates random vehicle position payloads using known vehicle UUIDs and
   a current event timestamp.
3. It schedules requests according to the configured target events per second.
4. It sends `POST /api/vehicles/positions` requests to the local API.
5. It tracks attempted, sent, successful, failed, in-flight, and dropped
   requests.
6. It records request latency and reports average, p50, p95, p99, and worst
   request latency at the end.

This simulator is intended to measure the current direct-ingestion path only.
It does not represent full backend capacity once additional domain processing
is added, such as route checks, geofencing, or other PostGIS validity checks.

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
- `alert_type`: alert type. The current supported value is
  `SPEED_LIMIT_EXCEEDED`.
- `speed`: speed reported by the vehicle event.
- `position`: geographic point as `geography(POINT, 4326)`.
- `event_time`: vehicle event timestamp with time zone.

## Database

On startup, the application creates the following if needed:

- `postgis` extension.
- `pgcrypto` extension.
- `vehicle_positions` table.
- `vehicle_last_state` table.
- `vehicle_alerts` table.

This allows the initial version to run without external migrations.

## Error Handling

Data validation responds directly with `400` from the schema middleware. Custom
errors that extend `DefaultError` are handled by the centralized middleware.
Any other error is returned as `500 Internal server error`.

## Current Limitations

- There is no authentication or authorization.
- There are no endpoints for querying stored positions.
- There are no update or delete endpoints.
- There is no message broker or asynchronous processing.
- There are no workers.
- There are no bulk inserts.
- There are no position validity checks or geofencing rules.
- There are no geofence alerts.
- There are no alert notification, acknowledgement, or resolution workflows.
- There are no per-vehicle speed limits.
- The current benchmark script measures ingestion only.
- There is no formal API versioning.
- Table creation is embedded in application startup.
- The current `docker-compose.yml` defines the database, but not a complete
  service setup for running backend and database together.
