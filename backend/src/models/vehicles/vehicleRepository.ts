import { Request, Response, NextFunction } from 'express';
import { CreatePosition, VehicleData } from './vehicleInterface';
import pool from '../../config/dbConfig';

export const createPosition = async(data: CreatePosition): Promise<VehicleData> => {
    const { vehicleId, speed, lon, lat } = data;

    const result = await pool.query(`
        INSERT INTO vehicle_positions (vehicle_id, position, speed, created_at)
        VALUES (
            $1,
            ST_SetSRID(ST_MakePoint($2, $3), 4326),
            $4,
            NOW()
        )
        RETURNING
            vehicle_id "vehicleId",
            ST_X(position::geometry) "lon",
            ST_Y(position::geometry) "lat",
            speed,
            created_at "createdAt"
    `, [vehicleId, lon, lat, speed]);

    return result.rows[0];
}

