# Setup

This guide covers how to run the current version of the project. The backend
lives inside `backend/`, uses PostgreSQL/PostGIS as its database, and uses
RabbitMQ to queue position events.

## Requirements

- Node.js
- npm
- Docker and Docker Compose, for the local PostgreSQL/PostGIS and RabbitMQ
  infrastructure

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
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

`RESET_DB=true` clears the current database tables on startup after ensuring
they exist. This truncates `vehicle_positions`, `vehicle_last_state`,
`vehicle_alerts`, and `geofences`. Use it only when you intend to remove all
current monitoring and geofence data.

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
docker compose up -d postgres rabbitmq
```

This starts the local infrastructure used by the backend and worker.

PostgreSQL/PostGIS is configured with:

- User: `postgres`
- Password: `postgres`
- Database: `pg_db`
- Local port: `5433`
- Internal container port: `5432`

RabbitMQ is configured with:

- AMQP port: `5672`
- Management UI: `http://localhost:15672`
- Local credentials: `guest` / `guest`

## Run the Backend and Worker Locally

With Docker infrastructure running and the `.env` file configured, start the
Express backend in one terminal:

```bash
cd backend
npm run dev
```

Start the RabbitMQ position worker in a second terminal:

```bash
cd backend
npm run worker
```

Docker Compose currently runs PostgreSQL/PostGIS and RabbitMQ only. The Express
backend and worker run separately on the host with the commands above.

On startup, the backend:

- Loads environment variables.
- Connects to PostgreSQL.
- Creates the `postgis` and `pgcrypto` extensions if they do not exist.
- Creates the required vehicle position, latest-state, alert, and geofence
  tables if they do not exist.
- Connects to RabbitMQ and declares the position-event queue.
- Exposes the API on the port defined by `PORT`.

The worker connects to the same RabbitMQ instance, declares the queue, and
processes position events one at a time.

## Run Tests

The backend is configured with Jest, ts-jest, and Supertest for TypeScript API
tests. The suite also connects to RabbitMQ, so start `rabbitmq` as well as the
database before running it.

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
at a fixed target rate. It distinguishes HTTP acceptance by the asynchronous
ingestion endpoint from worker processing: `processed` is the number of rows
persisted in PostgreSQL after worker processing.

Start the Docker infrastructure, backend, and worker first, then run:

```bash
cd backend
npm run simulate
```

The checked-in benchmark configuration targets:

- API URL: `http://localhost:3000/api/vehicles/positions`
- Target rate: `400` requests per second
- Duration: `15` seconds
- Dispatch tick: `100` milliseconds
- Max in-flight requests: `200`

Before each run, the simulator clears `vehicle_positions`,
`vehicle_last_state`, `vehicle_alerts`, and `geofences`, then creates a default
active rectangular geofence. This is destructive and removes existing
monitoring and geofence data. For benchmark isolation, RabbitMQ must also start
clean, with `Ready = 0` and `Unacked = 0`; the simulator does not currently
purge RabbitMQ automatically. During the run it prints live counters, including
sent requests, HTTP acceptance, processed rows, failed responses, in-flight
requests, dropped requests, attempted requests, and average latency.

At the end it prints a benchmark summary with:

- Load duration and load throughput.
- Acceptance throughput.
- End-to-end processing throughput.
- Processed during load and processed during drain.
- Drain duration and final processed count.
- Attempted requests.
- Total requests sent.
- Successful responses.
- Failed responses.
- Requests still in flight.
- Dropped requests.
- p50, p95, and p99 latency.
- Worst request latency.
- Average latency.
- Generated speed-alert events.
- Generated geofence-exit events.

After load generation ends and the pending HTTP requests finish, the simulator
waits for accepted events to be processed before the benchmark is complete. If
the drain timeout is reached before all accepted events are processed, treat the
run as incomplete/failed, not as a successful completed benchmark. Wait for
`Work Finished` and for the command to return before changing the target or
starting another run. Running simulators concurrently invalidates the result
because both processes target the same API and clear the same tables. Historical
synchronous-ingestion measurements are recorded in [`benchmarks.md`](benchmarks.md).

The simulator generates requests with valid UUIDs and an `eventTime` timestamp
serialized as an ISO date/time string. Approximately 90% of generated
positions are inside its default geofence and 10% use a longitude outside it.
Approximately 99% of generated speeds are within `SPEED_LIMIT` and 1% are
generated at or above the configured threshold. The generated counters describe
the chosen event distribution; persisted alerts are still determined by the
API rules. The simulator submits position events to the API. The resulting
background processing includes latest-state updates, speed-limit checks, and
geofence checks. It waits for persisted position rows, but does not validate
alert outcomes. It does not exercise alert delivery, route validation, delayed
or out-of-order events.

## Run with Docker

The project includes a `Dockerfile` inside `backend/` for building a backend
image.

Example from `backend/`:

```bash
docker build -t fleet-monitoring-api .
docker run --env-file .env -p 3000:3000 fleet-monitoring-api
```

If the backend runs in a separate container while PostgreSQL and RabbitMQ run
with Docker Compose, `DB_HOST` and `RABBITMQ_URL` must point to hosts or
services reachable from that container. The current `docker-compose.yml` does
not define backend or worker services.

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
