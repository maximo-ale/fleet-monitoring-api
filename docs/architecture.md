# Architecture

The current version uses a direct-ingestion architecture. The API receives an
HTTP request, validates the data, and writes directly to PostgreSQL/PostGIS.

## Current Components

- `backend/src/server.ts`: initializes Express, loads environment variables,
  prepares the database, registers routes, and mounts the error middleware.
- `backend/src/config/dbConfig.ts`: creates the PostgreSQL connection pool.
- `backend/src/utils/createTables.ts`: creates extensions and the
  `vehicle_positions` table.
- `backend/src/utils/dropTables.ts`: drops the current table when
  `RESET_DB=true`.
- `backend/src/middlewares/schemaValidator.ts`: validates requests with Zod.
- `backend/src/middlewares/errorHandler.ts`: centralizes error responses.
- `backend/src/models/health`: exposes `GET /api/health`.
- `backend/src/models/vehicles`: contains routes, controller, service,
  repository, interfaces, and schemas for the position flow.

## Ingestion Flow

1. The client sends `POST /api/vehicles/positions`.
2. Express receives the request and parses the JSON body.
3. The validation middleware applies `createPositionSchema`.
4. If the data is invalid, the API responds with `400`.
5. If the data is valid, the controller calls the service.
6. The service delegates persistence to the repository.
7. The repository executes the `INSERT` in PostgreSQL/PostGIS.
8. The API responds with `201` and the created position.

## Current Data Model

Table: `vehicle_positions`

Columns:

- `id`: UUID generated with `gen_random_uuid()`.
- `vehicle_id`: vehicle UUID.
- `position`: geographic point as `geography(POINT, 4326)`.
- `speed`: speed as `DOUBLE PRECISION`.
- `created_at`: timestamp with time zone.

## Database

On startup, the application creates the following if needed:

- `postgis` extension.
- `pgcrypto` extension.
- `vehicle_positions` table.

This allows the initial version to run without external migrations.

## Error Handling

Data validation responds directly with `400` from the schema middleware. Custom
errors that extend `DefaultError` are handled by the centralized middleware.
Any other error is returned as `500 Internal server error`.

## Current Limitations

- There are no automated tests.
- There is no authentication or authorization.
- There are no endpoints for querying stored positions.
- There are no update or delete endpoints.
- There is no vehicle simulator.
- There is no message broker or asynchronous processing.
- There are no workers.
- There are no bulk inserts.
- There is no alert system.
- There are no benchmarks.
- There is no formal API versioning.
- Table creation is embedded in application startup.
- The current `docker-compose.yml` defines the database, but not a complete
  service setup for running backend and database together.
