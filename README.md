# Fleet Monitoring API

Backend for receiving vehicle positions and exposing the current monitoring
state.

The project is currently in an initial functional version. It includes an
Express API, PostgreSQL/PostGIS connectivity, automatic setup of the basic
database structure, Zod validation, centralized error handling, and a direct
vehicle position ingestion endpoint.

## Current Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- PostGIS
- pg
- Zod
- dotenv
- Jest
- Supertest
- Docker / Docker Compose

## Current Status

Implemented:

- Express server.
- Health endpoint: `GET /api/health`.
- Position ingestion endpoint: `POST /api/vehicles/positions`.
- Request body validation with Zod.
- Position insertion into PostgreSQL/PostGIS.
- Latest vehicle state persistence and read endpoints.
- Automatic extension and table setup on application startup.
- Centralized error handling middleware.
- Automated API test setup with Jest and Supertest.
- Vehicle position ingestion simulator with speed-limit and geofence-exit
  event generation.
- Fixed-rate ingestion benchmark metrics.
- Speed limit alert persistence for positions above the configured limit.
- Active-geofence checks with PostGIS and geofence exit alert persistence.
- Recent alert read endpoint with an optional result limit.
- Dockerfile for the backend.
- Docker Compose setup for PostgreSQL/PostGIS.

Not implemented yet:

- Message broker.
- Workers.
- Asynchronous ingestion and alert processing.
- Bulk inserts.
- Alert notifications.
- Alert acknowledgement or resolution.
- Per-vehicle speed limits.
- Public geofence CRUD endpoints.
- Dashboard or user interface.
- Authentication.

## Documentation

- [Setup](docs/setup.md)
- [API](docs/api.md)
- [Architecture](docs/architecture.md)
- [Benchmarks](docs/benchmarks.md)
