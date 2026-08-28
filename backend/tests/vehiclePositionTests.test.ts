import request from 'supertest';

import app from '../src/app';
import { cleanTables } from '../src/utils/dropTables';
import pool from '../src/config/dbConfig';
import { createGlobalGeofence, getLastState, getVehiclePositions, processVehicle, processVehicles } from './helper';
import { createGeofence } from '../src/models/geofences/geofenceRepository';
import { saveVehiclePosition } from '../src/models/vehicles/vehicleService';

const prefix = '/api/vehicles';

type UUID = string;

export interface ValidVehicleBody {
    vehicleId: UUID,
    speed: number,
    lat: number,
    lon: number,
    eventTime: string,
}

interface InvalidVehicleBody {
    vehicleId?: unknown,
    speed?: unknown,
    lat?: unknown,
    lon?: unknown,
    eventTime?: unknown,
}

interface ValidCreatePosition {
    caseName: string,
    requests: ValidVehicleBody[],
    validExpected: number,
    invalidExpected: number,
}

interface InvalidCreatePosition {
    caseName: string,
    body?: InvalidVehicleBody
    expected: number,
}

interface Geofence {
    name: string,
    area: number[][],
    isActive: boolean,
}

interface GeofenceExitAlerts {
    caseName: string,
    geofences: Geofence[],
    vehicle: ValidVehicleBody,
    expectAlertToBeCreated: boolean,
}

describe('/api/vehicles', () => {
    beforeEach(async() => {
        await cleanTables();
    });

    describe('POST /', () => {
        const validTestCases: ValidCreatePosition[] = [
            {
                caseName: 'Valid data 1',
                requests: [
                    {
                        vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                        speed: 50,
                        lat: 30,
                        lon: 30,
                        eventTime: new Date().toISOString(),
                    }
                ],
                validExpected: 1,
                invalidExpected: 0,
            },
            {
                caseName: 'Valid data 2',
                requests: [
                    {
                        vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                        speed: 50,
                        lat: -30,
                        lon: 30.312,
                        eventTime: new Date().toISOString(),
                    }
                ],
                validExpected: 1,
                invalidExpected: 0,
            },
            {
                caseName: 'Valid data 3',
                requests: [
                    {
                        vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                        speed: 50,
                        lat: -90,
                        lon: 180,
                        eventTime: new Date().toISOString(),
                    }
                ],
                validExpected: 1,
                invalidExpected: 0,
            },
            {
                caseName: 'Valid data 4',
                requests: [
                    {
                        vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                        speed: 0,
                        lat: -23,
                        lon: 1,
                        eventTime: new Date().toISOString(),
                    }
                ],
                validExpected: 1,
                invalidExpected: 0,
            },
        ];

        it.each(validTestCases)('$caseName', async({ requests, validExpected, invalidExpected }) => {
            const reqs = [];

            for (let i = 0; i < requests.length; i++){
                reqs[i] = request(app)
                    .post(`${prefix}/positions`)
                    .send(requests[i]);
            }

            const responses = await Promise.all(reqs);

            const valid = responses.filter(res => res.status === 202);
            const invalid = responses.filter(res => res.status >= 400);

            expect(valid.length).toBe(validExpected);
            expect(invalid.length).toBe(invalidExpected);

            for (let i = 0; i < responses.length; i++){
                expect(responses[i].body.eventId).toBeDefined();
                expect(responses[i].body.eventId).toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                );
            }

        });

        const invalidTestCases: InvalidCreatePosition[] = [
            {
                caseName: 'No body',
                expected: 400,
            },
            {
                caseName: 'Invalid UUID',
                body: {
                    vehicleId: "123",
                    speed: 0,
                    lat: -23,
                    lon: 1,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid speed',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: -1,
                    lat: -23,
                    lon: 1,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid lon',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 100,
                    lat: -23,
                    lon: 181,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid lat',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 55,
                    lat: -91,
                    lon: 10,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid speed type',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: true,
                    lat: -15,
                    lon: 10,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid lat type',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 25,
                    lat: [93],
                    lon: 10,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid lon type',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 25,
                    lat: 55,
                    lon: "100a",
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'Invalid vehicleId type',
                body: {
                    vehicleId: 123,
                    speed: 25,
                    lat: 55,
                    lon: 100,
                    eventTime: new Date().toISOString(),
                },
                expected: 400,
            },
            {
                caseName: 'No event time',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 25,
                    lat: 55,
                    lon: 100,
                },
                expected: 400,
            },
            {
                caseName: 'Invalid event time type',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 25,
                    lat: 55,
                    lon: 100,
                    eventTime: true
                },
                expected: 400,
            },
        ];

        it.each(invalidTestCases)('$caseName', async({ body, expected }) => {
            const res = await request(app)
                .post(`${prefix}/positions`)
                .send(body)

            expect(res.status).toBe(expected);
        });
    });

    describe('latest vehicle state', () => {
        it('creates latest state after first valid event', async() => {
            const vehicles = [
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: 30,
                    lon: 30,
                    eventTime: '2026-07-04T10:00:00.000Z',
                },
            ];
            
            await processVehicles(vehicles);
            
            const vehiclePositionsRes = await getVehiclePositions();
            const lastStateRes = await getLastState();

            expect(vehiclePositionsRes.rows.length).toBe(1);
            expect(lastStateRes.rows.length).toBe(1);
            
            expect(vehiclePositionsRes.rows[0].vehicleId).toBe(vehicles[0].vehicleId);
            expect(lastStateRes.rows[0].vehicleId).toBe(vehicles[0].vehicleId);
        });

        it('updates latest state after second event from same vehicle', async() => {
            const vehicles = [
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: 30,
                    lon: 30,
                    eventTime: '2026-07-04T10:00:00.000Z',
                },
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 60,
                    lat: 30.23,
                    lon: 28.111,
                    eventTime: '2026-07-04T10:01:00.000Z',
                }
            ];
            
            await processVehicles(vehicles);
            
            const vehiclePositionsRes = await getVehiclePositions();
            const lastStateRes = await getLastState();

            expect(vehiclePositionsRes.rows.length).toBe(2);
            expect(lastStateRes.rows.length).toBe(1);
            
            expect(vehiclePositionsRes.rows[0].vehicleId).toBe(vehicles[0].vehicleId);
            expect(lastStateRes.rows[0].vehicleId).toBe(vehicles[1].vehicleId);
            expect(lastStateRes.rows[0].speed).toBe(vehicles[1].speed);
            expect(new Date(lastStateRes.rows[0].lastStateTime).toISOString())
                .toBe(vehicles[1].eventTime);
        });

        it('lists all latest vehicle states', async() => {
            const vehicles = [
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: 30,
                    lon: 30,
                    eventTime: '2026-07-04T10:00:00.000Z',
                },
                {
                    vehicleId: "512e4567-e89b-12d3-a456-426614174000",
                    speed: 60,
                    lat: 30.23,
                    lon: 28.111,
                    eventTime: '2026-07-04T10:01:00.000Z',
                },
            ];

            await processVehicles(vehicles);

            const response = await request(app)
                .get(`${prefix}/latest`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(vehicles.length);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        vehicleId: vehicles[0].vehicleId,
                        speed: vehicles[0].speed,
                    }),
                    expect.objectContaining({
                        vehicleId: vehicles[1].vehicleId,
                        speed: vehicles[1].speed,
                    }),
                ])
            );
        });

        it('gets one vehicle latest state by vehicle id', async() => {
            const vehicles = [
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: 30,
                    lon: 30,
                    eventTime: '2026-07-04T10:00:00.000Z',
                },
                {
                    vehicleId: "512e4567-e89b-12d3-a456-426614174000",
                    speed: 60,
                    lat: 30.23,
                    lon: 28.111,
                    eventTime: '2026-07-04T10:01:00.000Z',
                },
            ];

            await processVehicles(vehicles);

            const response = await request(app)
                .get(`${prefix}/${vehicles[1].vehicleId}/latest`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(
                expect.objectContaining({
                    vehicleId: vehicles[1].vehicleId,
                    speed: vehicles[1].speed,
                })
            );
            expect(new Date(response.body.eventTime).toISOString()).toBe(vehicles[1].eventTime);
            expect(Number(response.body.lat)).toBeCloseTo(vehicles[1].lat);
            expect(Number(response.body.lon)).toBeCloseTo(vehicles[1].lon);
        });

        it('returns 404 when a vehicle has no latest state', async() => {
            const response = await request(app)
                .get(`${prefix}/123e4567-e89b-12d3-a456-426614174000/latest`);

            expect(response.status).toBe(404);
        });

        it('rejects invalid vehicle ids', async() => {
            const response = await request(app)
                .get(`${prefix}/invalid-vehicle-id/latest`);

            expect(response.status).toBe(400);
        });
    });

    describe('speed limit alerts', () => {
        const testCases = [
            {
                caseName: 'generates speed alert only when speed is above limit',
                vehicles: [
                    {
                        vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                        speed: 140,
                        lat: 30,
                        lon: 30,
                        eventTime: '2026-07-04T10:00:00.000Z',
                    },
                    {
                        vehicleId: "512e4567-e89b-12d3-a456-426614174000",
                        speed: 120,
                        lat: 30.23,
                        lon: 30.15,
                        eventTime: '2026-07-04T10:01:00.000Z',
                    },
                    {
                        vehicleId: "612e4567-e89b-12d3-a456-426614174000",
                        speed: 80,
                        lat: 29.18,
                        lon: 31.2,
                        eventTime: '2026-07-04T10:02:00.000Z',
                    },
                ],
                vehiclesToGenerateAlerts: [
                    {
                        vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                        alertType: 'SPEED_LIMIT_EXCEEDED',
                        speed: 140,
                        lat: 30,
                        lon: 30,
                        eventTime: '2026-07-04T10:00:00.000Z',
                    }
                ],
            }
        ];
    
        it.each(testCases)('$caseName', async ({ vehicles, vehiclesToGenerateAlerts }) => {
            await createGlobalGeofence();
            
            await processVehicles(vehicles);

            const vehiclePositionsRes = await getVehiclePositions();
            const lastStateRes = await getLastState();

            expect(vehiclePositionsRes.rowCount).toBe(vehicles.length);
            expect(lastStateRes.rowCount).toBe(vehicles.length);
        
            const result = await pool.query(`
                SELECT
                    vehicle_id "vehicleId",
                    alert_type "alertType",
                    speed,
                    ST_X(position::geometry) lon,
                    ST_Y(position::geometry) lat,
                    event_time "eventTime"
                FROM vehicle_alerts
                ORDER BY event_time ASC;
            `);
            
            expect(result.rowCount).toBe(vehiclesToGenerateAlerts.length);
            
            for (const alert of result.rows) {
                const expectedAlert = vehiclesToGenerateAlerts.find(vehicle =>
                    vehicle.vehicleId === alert.vehicleId
                );
            
                expect(expectedAlert).toBeDefined();
            
                expect(alert).toEqual(
                    expect.objectContaining({
                        vehicleId: expectedAlert!.vehicleId,
                        alertType: expectedAlert!.alertType,
                        speed: expectedAlert!.speed,
                    })
                );
            
                expect(new Date(alert.eventTime).toISOString()).toBe(expectedAlert!.eventTime);
                expect(Number(alert.lat)).toBeCloseTo(expectedAlert!.lat);
                expect(Number(alert.lon)).toBeCloseTo(expectedAlert!.lon);
            }
        });
    });

    describe('GET /api/alerts', () => {
        it('lists recent alerts newest to oldest', async() => {
            await createGlobalGeofence();

            const vehicles = [
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 140,
                    lat: 30,
                    lon: 30,
                    eventTime: '2026-07-04T10:00:00.000Z',
                },
                {
                    vehicleId: "512e4567-e89b-12d3-a456-426614174000",
                    speed: 130,
                    lat: 30.23,
                    lon: 30.15,
                    eventTime: '2026-07-04T10:02:00.000Z',
                },
                {
                    vehicleId: "612e4567-e89b-12d3-a456-426614174000",
                    speed: 80,
                    lat: 29.18,
                    lon: 31.2,
                    eventTime: '2026-07-04T10:01:00.000Z',
                },
            ];

            await processVehicles(vehicles);

            const response = await request(app)
                .get('/api/alerts');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toEqual(
                expect.objectContaining({
                    vehicleId: vehicles[1].vehicleId,
                    alertType: 'SPEED_LIMIT_EXCEEDED',
                    speed: vehicles[1].speed,
                })
            );
            expect(response.body[1]).toEqual(
                expect.objectContaining({
                    vehicleId: vehicles[0].vehicleId,
                    alertType: 'SPEED_LIMIT_EXCEEDED',
                    speed: vehicles[0].speed,
                })
            );
        });

        it('returns an empty array when there are no alerts', async() => {
            const response = await request(app)
                .get('/api/alerts');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('respects the optional alerts limit query parameter', async() => {
            await createGlobalGeofence();
            
            const vehicles = [
                {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 140,
                    lat: 30,
                    lon: 30,
                    eventTime: '2026-07-04T10:00:00.000Z',
                },
                {
                    vehicleId: "512e4567-e89b-12d3-a456-426614174000",
                    speed: 130,
                    lat: 30.23,
                    lon: 30.15,
                    eventTime: '2026-07-04T10:01:00.000Z',
                },
                {
                    vehicleId: "612e4567-e89b-12d3-a456-426614174000",
                    speed: 150,
                    lat: 29.18,
                    lon: 31.2,
                    eventTime: '2026-07-04T10:02:00.000Z',
                },
            ];

            await processVehicles(vehicles);

            const response = await request(app)
                .get('/api/alerts?limit=2');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].vehicleId).toBe(vehicles[2].vehicleId);
            expect(response.body[1].vehicleId).toBe(vehicles[1].vehicleId);
        });
    });

    describe('Geofence exit alerts', () => {
        const testCases: GeofenceExitAlerts[] = [
            {
                caseName: 'Valid vehicle inside position',
                geofences: [
                    {
                        name: 'Geofence1',
                        area: [
                            [50, 50],
                            [51, 50],
                            [50, 51],
                            [51, 51],
                            [50, 50],
                        ],
                        isActive: true,
                    },
                ],
                vehicle: {
                    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
                    speed: 50,
                    lon: 50.5,
                    lat: 50.5,
                    eventTime: '2026-01-01T10:02:00.000Z'
                },
                expectAlertToBeCreated: false,
            },
            {
                caseName: 'Valid vehicle in edge position',
                geofences: [
                    {
                        name: 'Geofence1',
                        area: [
                            [50, 50],
                            [51, 50],
                            [50, 51],
                            [51, 51],
                            [50, 50],
                        ],
                        isActive: true,
                    },
                ],
                vehicle: {
                    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
                    speed: 50,
                    lon: 50.5,
                    lat: 51,
                    eventTime: '2026-01-01T10:02:00.000Z'
                },
                expectAlertToBeCreated: false,
            },
            {
                caseName: 'Valid vehicle in corner position',
                geofences: [
                    {
                        name: 'Geofence1',
                        area: [
                            [50, 50],
                            [51, 50],
                            [50, 51],
                            [51, 51],
                            [50, 50],
                        ],
                        isActive: true,
                    },
                ],
                vehicle: {
                    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
                    speed: 50,
                    lon: 51,
                    lat: 51,
                    eventTime: '2026-01-01T10:02:00.000Z'
                },
                expectAlertToBeCreated: false,
            },
            {
                caseName: 'Vehicle outside position',
                geofences: [
                    {
                        name: 'Geofence1',
                        area: [
                            [50, 50],
                            [51, 50],
                            [50, 51],
                            [51, 51],
                            [50, 50],
                        ],
                        isActive: true,
                    },
                ],
                vehicle: {
                    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
                    speed: 50,
                    lon: 52,
                    lat: 52,
                    eventTime: '2026-01-01T10:02:00.000Z'
                },
                expectAlertToBeCreated: true,
            },
            {
                caseName: 'Vehicle inside an inactive geofence',
                geofences: [
                    {
                        name: 'Geofence1',
                        area: [
                            [50, 50],
                            [51, 50],
                            [50, 51],
                            [51, 51],
                            [50, 50],
                        ],
                        isActive: false,
                    },
                ],
                vehicle: {
                    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
                    speed: 50,
                    lon: 50.5,
                    lat: 50.5,
                    eventTime: '2026-01-01T10:02:00.000Z'
                },
                expectAlertToBeCreated: true,
            },
            {
                caseName: 'Vehicle inside in both an inactive and an active geofence at the same time',
                geofences: [
                    {
                        name: 'Geofence1',
                        area: [
                            [50, 50],
                            [50, 60],
                            [60, 50],
                            [60, 60],
                            [50, 50],
                        ],
                        isActive: false,
                    },
                    {
                        name: 'Geofence2',
                        area: [
                            [55, 55],
                            [55, 65],
                            [65, 55],
                            [65, 65],
                            [55, 55],
                        ],
                        isActive: true,
                    },
                ],
                vehicle: {
                    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
                    speed: 50,
                    lon: 57.5,
                    lat: 57.5,
                    eventTime: '2026-01-01T10:02:00.000Z'
                },
                expectAlertToBeCreated: false,
            },
        ];

        it.each(testCases)('$caseName', async({ geofences, vehicle, expectAlertToBeCreated }) => {
            for (let i = 0; i < geofences.length; i++){
                await createGeofence(geofences[i]);
            }

            await processVehicle(vehicle);

            const alerts = await pool.query(`
                SELECT vehicle_id "vehicleId"
                FROM vehicle_alerts
                WHERE alert_type = 'GEOFENCE_EXIT'
            `);

            if (expectAlertToBeCreated){
                expect(alerts.rowCount).toBe(1);
                expect(alerts.rows[0].vehicleId).toBe(vehicle.vehicleId);
            } else {
                expect(alerts.rowCount).toBe(0);
            }
        })
    });

    describe('Idempotency tests', () => {
        it('does not process the same event twice', async() => {
            const event = {
                eventId: crypto.randomUUID(),
                vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                speed: 25,
                lat: 55,
                lon: 100,
                eventTime: new Date().toISOString(),
            };

            const firstResponse = await saveVehiclePosition(event);
            const secondResponse = await saveVehiclePosition(event);

            expect(firstResponse.status).toBe('SUCCESS');
            expect(secondResponse.status).toBe('DUPLICATE');

            const positions = await getVehiclePositions();

            expect(positions.rowCount).toBe(1);
        });

        it('does not create duplicate alerts for the same event', async() => {
            const event = {
                eventId: crypto.randomUUID(),
                vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                speed: 150,
                lat: 55,
                lon: 100,
                eventTime: new Date().toISOString(),
            };

            await saveVehiclePosition(event);
            await saveVehiclePosition(event);

            const positions = await getVehiclePositions();

            const alerts = await pool.query(`
                SELECT *
                FROM vehicle_alerts
                WHERE vehicle_id = $1
                  AND alert_type = 'SPEED_LIMIT_EXCEEDED';
            `, [event.vehicleId]);

            expect(positions.rowCount).toBe(1);
            expect(alerts.rowCount).toBe(1);
        })
    });
});
    