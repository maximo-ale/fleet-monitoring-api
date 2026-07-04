import app from "../src/app";
import pool from "../src/config/dbConfig";
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