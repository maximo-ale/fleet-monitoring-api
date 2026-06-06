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
```

`RESET_DB=true` drops the `vehicle_positions` table on startup and then creates
it again. Use it only when you want to reset the current data structure.

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
- Creates the `vehicle_positions` table if it does not exist.
- Exposes the API on the port defined by `PORT`.

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
