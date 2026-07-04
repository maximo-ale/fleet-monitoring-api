import crypto from 'crypto';
import request from 'supertest';

import app from '../src/app';
import { cleanTables } from '../src/utils/dropTables';
import pool from '../src/config/dbConfig';
import { getLastState, getResponses, getVehiclePositions } from './helper';

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
            
            console.log(`reqs.length---------------------- ${reqs.length}`);

            const responses = await Promise.all(reqs);

            const valid = responses.filter(res => res.status === 201);
            const invalid = responses.filter(res => res.status >= 400);

            expect(valid.length).toBe(validExpected);
            expect(invalid.length).toBe(invalidExpected);

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

            const responses: any = await getResponses(vehicles, prefix);

            for (let i = 0; i < responses.length; i++){
                expect(responses[i].status).toBe(201);
            }
            
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
            
            const responses: any = await getResponses(vehicles, prefix);

            for (let i = 0; i < responses.length; i++){
                expect(responses[i].status).toBe(201);
            }
            
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
    });
});