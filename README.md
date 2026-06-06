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
- Dockerfile for the backend.
- Docker Compose setup for PostgreSQL/PostGIS.

Not implemented yet:

- Automated tests.
- Vehicle simulator.
- Benchmarks.
- Message broker.
- Workers.
- Bulk inserts.
- Alert system.
- Authentication.

## Documentation

- [Setup](docs/setup.md)
- [API](docs/api.md)
- [Architecture](docs/architecture.md)
