# API

The current version exposes HTTP endpoints with Express for asynchronous
vehicle-position ingestion and monitoring reads.

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

Validates and queues one position event for background processing. It does not
wait for the position to be stored, latest state to be updated, or speed and
geofence alerts to be evaluated.

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

Clients do not send `eventId`. The backend generates it after validation,
includes it in the RabbitMQ message, and returns it so the accepted event can
be identified.

### Success Response

Status:

```http
202 Accepted
```

Body:

```json
{
  "eventId": "123e4567-e89b-42d3-a456-426614174000"
}
```

The response is sent only after RabbitMQ confirms publication. It confirms
acceptance for asynchronous processing, not completed persistence. The worker
stores the position in PostgreSQL/PostGIS using `ST_MakePoint(lon, lat)` with
SRID `4326`; it stores the event timestamp as `event_time` separately from the
database-generated `created_at` timestamp.

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

This can happen, for example, if the API cannot connect to RabbitMQ or RabbitMQ
does not confirm the publication.

## List Latest Vehicle States

```http
GET /api/vehicles/latest
```

Returns the latest stored state for every vehicle, ordered by event time from
newest to oldest.

Success status:

```http
200 OK
```

Example body:

```json
[
  {
    "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
    "lon": -58.3816,
    "lat": -34.6037,
    "speed": 42.5,
    "eventTime": "2026-06-06T12:00:00.000Z",
    "updatedAt": "2026-06-06T12:00:00.000Z"
  }
]
```

When no vehicle state has been stored, the endpoint returns `200 OK` with an
empty array.

## Get One Latest Vehicle State

```http
GET /api/vehicles/:vehicleId/latest
```

Returns the latest stored state for the specified vehicle.

Success status and body follow the same object shape used by the list endpoint:

```http
200 OK
```

If `vehicleId` is not a valid UUID, the endpoint returns `400 Bad Request` with
the standard validation error body. If the UUID is valid but no latest state
exists for it, the endpoint returns:

```http
404 Not Found
```

```json
{
  "message": "Latest vehicle state not found"
}
```

## List Recent Alerts

```http
GET /api/alerts
GET /api/alerts?limit=N
```

Returns alerts ordered by event time from newest to oldest. The optional
`limit` query parameter must be an integer greater than or equal to `1` and
restricts the number of returned rows.

Success status:

```http
200 OK
```

Example body:

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
    "alertType": "GEOFENCE_EXIT",
    "speed": 42.5,
    "lon": -58.3816,
    "lat": -34.6037,
    "eventTime": "2026-06-06T12:00:00.000Z"
  }
]
```

Supported alert types are:

- `SPEED_LIMIT_EXCEEDED`: the reported speed is greater than `SPEED_LIMIT`.
- `GEOFENCE_EXIT`: the reported position is not covered by any active
  geofence.

When there are no alerts, the endpoint returns `200 OK` with an empty array.
An invalid `limit`, including zero, a negative number, a non-integer, or a
non-numeric value, returns `400 Bad Request` with the standard validation error
body.
