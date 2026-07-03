import { Request, Response, NextFunction } from 'express';
import { CreatePosition, VehicleData } from './vehicleInterface';
import pool from '../../config/dbConfig';
import { PoolClient } from 'pg';

export const createPosition = async(client: PoolClient, data: CreatePosition): Promise<VehicleData> => {
    const { vehicleId, speed, lon, lat, eventTime } = data;

    const result = await client.query(`
        INSERT INTO vehicle_positions (vehicle_id, position, speed, created_at, event_time)
        VALUES (
            $1,
            ST_SetSRID(ST_MakePoint($2, $3), 4326),
            $4,
            NOW(),
            $5
        )
        RETURNING
            vehicle_id "vehicleId",
            ST_X(position::geometry) "lon",
            ST_Y(position::geometry) "lat",
            speed,
            created_at "createdAt",
            event_time "eventTime"
    `, [vehicleId, lon, lat, speed, eventTime]);

    return result.rows[0];
}

export const upsertLatestVehicleState = async(client: PoolClient, data: CreatePosition): Promise<VehicleData> => {
    const { vehicleId, speed, lon, lat, eventTime } = data;

    const result = await client.query(`
        INSERT INTO vehicle_last_state (vehicle_id, position, speed, last_state_time)
        VALUES (
            $1,
            ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
            $4,
            $5
        )
        ON CONFLICT (vehicle_id)
        DO UPDATE SET
            position = EXCLUDED.position,
            speed = EXCLUDED.speed,
            last_state_time = EXCLUDED.last_state_time,
            updated_at = CURRENT_TIMESTAMP
        RETURNING
            vehicle_id "vehicleId",
            ST_X(position::geometry) "lon",
            ST_Y(position::geometry) "lat",
            speed,
            last_state_time "eventTime",
            updated_at "updatedAt";
    `, [vehicleId, lon, lat, speed, eventTime]);

    return result.rows[0];
}