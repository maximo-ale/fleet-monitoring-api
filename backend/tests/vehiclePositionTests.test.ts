import crypto from 'crypto';
import request from 'supertest';

import app from '../src/app';
import { cleanTables } from '../src/utils/dropTables';

const prefix = '/api/vehicles';

type UUID = string;

interface ValidVehicleBody {
    vehicleId: UUID,
    speed: number,
    lat: number,
    lon: number,
}

interface InvalidVehicleBody {
    vehicleId?: unknown,
    speed?: unknown,
    lat?: unknown,
    lon?: unknown,
}

interface ValidCreatePosition {
    caseName: string,
    body: ValidVehicleBody,
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
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: 30,
                    lon: 30,
                },
            },
            {
                caseName: 'Valid data 2',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: -30,
                    lon: 30.312,
                },
            },
            {
                caseName: 'Valid data 3',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 50,
                    lat: -90,
                    lon: 180,
                },
            },
            {
                caseName: 'Valid data 4',
                body: {
                    vehicleId: "123e4567-e89b-12d3-a456-426614174000",
                    speed: 0,
                    lat: -23,
                    lon: 1,
                },
            },
        ];

        it.each(validTestCases)('$caseName', async({ body }) => {
            const res = await request(app)
                .post(`${prefix}/positions`)
                .send(body)

            expect(res.status).toBe(201);
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
    })
});