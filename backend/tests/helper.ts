import app from "../src/app";
import pool from "../src/config/dbConfig";
import { createGeofence } from "../src/models/geofences/geofenceRepository";
import { saveVehiclePosition } from "../src/models/vehicles/vehicleService";
import { ValidVehicleBody } from "./vehiclePositionTests.test";
import request from 'supertest';

export const getVehiclePositions = async() => {
    return await pool.query(`
        SELECT vehicle_id "vehicleId", speed, event_time "eventTime"
        FROM vehicle_positions
        ORDER BY event_time ASC
    `);
}

export const getLastState = async() => {
    return await pool.query(`
        SELECT
            vehicle_id "vehicleId",
            speed,
            updated_at "eventTime",
            last_state_time "lastStateTime"
        FROM vehicle_last_state;
    `);    
}


export const getResponses = async(vehicles: ValidVehicleBody[], prefix: string) => {
    const responses = [];

    for (let i = 0; i < vehicles.length; i++){
        responses[i] = await request(app)
            .post(`${prefix}/positions`)
            .send(vehicles[i])
    }

    return responses;
}

export const processVehicle = async(
    vehicle: ValidVehicleBody
) => {
    return saveVehiclePosition({
        eventId: crypto.randomUUID(),
        ...vehicle,
    });
}

export const processVehicles = async(
    vehicles: ValidVehicleBody[]
) => {
    for (let vehicle of vehicles){
        await saveVehiclePosition({
            eventId: crypto.randomUUID(),
            ...vehicle,
        })
    }
}

// Creates global geofence to avoid alerts
export const createGlobalGeofence = async() => {
    await createGeofence({
        name: 'Global geofence',
        area: [
            [-179, -89],
            [179, -89],
            [179, 89],
            [-179, 89],
            [-179, -89],
        ],
        isActive: true,
    });
}