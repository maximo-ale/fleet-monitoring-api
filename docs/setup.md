# Setup

This guide covers how to run the current version of the project. The backend
lives inside `backend/` and uses PostgreSQL/PostGIS as its database.

## Requirements

- Node.js
- npm
- Docker and Docker Compose, if you want to run the database with Docker

## Environment Variables

The backend reads configuration from environment variables using `dotenv`.
Create a `.env` file inside `backend/` with values similar to these:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=pg_db
RESET_DB=false
SPEED_LIMIT=120
```

`RESET_DB=true` clears the current database tables on startup after ensuring
they exist. Use it only when you want to reset the current data.

`SPEED_LIMIT` configures the speed threshold used for
`SPEED_LIMIT_EXCEEDED` alerts. Positions with `speed` greater than this value
create an alert; positions at or below the value do not.

## Local Installation

From the project root:

```bash
cd backend
npm install
```

## Run the Database with Docker

From the project root:

```bash
docker compose up -d postgres
```

The current `docker-compose.yml` starts PostgreSQL/PostGIS with:

- User: `postgres`
- Password: `postgres`
- Database: `pg_db`
- Local port: `5433`
- Internal container port: `5432`

## Run the Backend Locally

With the database running and the `.env` file configured:

```bash
cd backend
npm run dev
```

On startup, the application:

- Loads environment variables.
- Connects to PostgreSQL.
- Creates the `postgis` and `pgcrypto` extensions if they do not exist.
- Creates the required vehicle position and alert tables if they do not exist.
- Exposes the API on the port defined by `PORT`.

## Run Tests

The backend is configured with Jest, ts-jest, and Supertest for TypeScript API
tests.

With the database running and the `.env` file configured:

```bash
cd backend
npm test
```

For watch mode:

```bash
cd backend
npm run test:watch
```

Test files live in `backend/tests/` and use the `.test.ts` extension. The test
setup file creates the required database structure before the suite and closes
the PostgreSQL pool after it finishes.

## Run the Ingestion Simulator

The backend includes a simulator for sending vehicle position events to the API
at a fixed target rate. It is useful for testing the current direct-ingestion
path before adding alerts, geofencing, workers, or other backend behavior.

Start the database and backend first, then run:

```bash
cd backend
npm run simulate
```

The current script targets:

- API URL: `http://localhost:3000/api/vehicles/positions`
- Target rate: `500` requests per second
- Duration: `300` seconds
- Dispatch tick: `100` milliseconds
- Max in-flight requests: `5000`

Before starting, the simulator clears the `vehicle_positions` table. During the
run it prints live counters, including sent requests, effective RPS, successful
responses, failed responses, in-flight requests, dropped requests, attempted
requests, and average latency.

At the end it prints a benchmark summary with:

- Attempted requests.
- Total requests sent.
- Successful responses.
- Failed responses.
- Requests still in flight.
- Dropped requests.
- p50, p95, and p99 latency.
- Worst request latency.
- Average latency.

The simulator generates requests with valid UUIDs, random longitude and
latitude values within the accepted API ranges, random speed values, and an
`eventTime` timestamp serialized as an ISO date/time string. It currently
measures only ingestion throughput for `POST /api/vehicles/positions`; it does
not exercise alert delivery, route validation, geofencing, delayed events,
out-of-order events, or other domain rules.

## Run with Docker

The project includes a `Dockerfile` inside `backend/` for building a backend
image.

Example from `backend/`:

```bash
docker build -t fleet-monitoring-api .
docker run --env-file .env -p 3000:3000 fleet-monitoring-api
```

If the backend runs in a separate container and the database runs with Docker
Compose, `DB_HOST` must point to a host or service reachable from that
container. The current `docker-compose.yml` only defines the database service.

## Quick Check

With the API running:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "uptime": 12.345,
  "timestamp": "2026-06-06T12:00:00.000Z"
}
```
