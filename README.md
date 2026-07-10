# Fleet Monitoring API

Initial backend for receiving and storing vehicle positions.

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
- Automatic extension and table setup on application startup.
- Centralized error handling middleware.
- Automated API test setup with Jest and Supertest.
- Vehicle position ingestion simulator.
- Fixed-rate ingestion benchmark metrics.
- Speed limit alert persistence for positions above the configured limit.
- Dockerfile for the backend.
- Docker Compose setup for PostgreSQL/PostGIS.

Not implemented yet:

- Message broker.
- Workers.
- Bulk inserts.
- Position validity checks or geofencing rules.
- Geofence alerts.
- Alert notifications.
- Alert acknowledgement or resolution.
- Per-vehicle speed limits.
- Authentication.

## Documentation

- [Setup](docs/setup.md)
- [API](docs/api.md)
- [Architecture](docs/architecture.md)
- [Benchmarks](docs/benchmarks.md)
