# API

The current version exposes HTTP endpoints with Express. The main functional
scope is direct vehicle position ingestion.

## Health check

```http
GET /api/health
```

Success response:

```json
{
  "status": "ok",
  "uptime": 12.345,
  "timestamp": "2026-06-06T12:00:00.000Z"
}
```

## Create Vehicle Position

```http
POST /api/vehicles/positions
Content-Type: application/json
```

Registers one position in the `vehicle_positions` table.
It also updates `vehicle_last_state` and creates a `SPEED_LIMIT_EXCEEDED`
alert in `vehicle_alerts` when `speed` is greater than the configured
`SPEED_LIMIT`.

### Body

```json
{
  "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
  "speed": 42.5,
  "lon": -58.3816,
  "lat": -34.6037,
  "eventTime": "2026-06-06T12:00:00.000Z"
}
```

### Validation Rules

- `vehicleId`: valid UUID.
- `speed`: number greater than or equal to `0`.
- `lon`: number between `-180` and `180`.
- `lat`: number between `-90` and `90`.
- `eventTime`: valid ISO date/time string.

`lon` and `lat` use Zod numeric coercion, so numeric strings can be converted
to numbers during validation.

### Success Response

Status:

```http
201 Created
```

Body:

```json
{
  "positionCreated": {
    "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
    "lon": -58.3816,
    "lat": -34.6037,
    "speed": 42.5,
    "eventTime": "2026-06-06T12:00:00.000Z",
    "createdAt": "2026-06-06T12:00:00.000Z"
  }
}
```

The position is stored in PostgreSQL/PostGIS using `ST_MakePoint(lon, lat)`
with SRID `4326`. The event timestamp is stored as `event_time`, separately
from the database-generated `created_at` timestamp.

### Validation Error

Status:

```http
400 Bad Request
```

Example:

```json
{
  "message": "Invalid data",
  "errors": {
    "vehicleId": ["Invalid UUID"],
    "speed": ["Too small: expected number to be >=0"]
  },
  "formErrors": []
}
```

The exact contents of `errors` depend on the error returned by Zod.

### Internal Error

Status:

```http
500 Internal Server Error
```

Example:

```json
{
  "message": "Internal server error"
}
```

This can happen, for example, if the API cannot connect to the database or the
insert fails.
