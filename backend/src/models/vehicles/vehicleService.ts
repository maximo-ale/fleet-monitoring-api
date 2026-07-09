import { PoolClient } from 'pg';
import pool from '../../config/dbConfig';
import { envConfig } from '../../config/envConfig';
import { CreatePosition, VehicleData } from './vehicleInterface';
import * as vehicleRepository from './vehicleRepository';

export const saveVehiclePosition = async(data: CreatePosition): Promise<VehicleData> => {
    const client: PoolClient = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const { vehicleId, speed, lon, lat, eventTime } = data;
        
        const newPosition: VehicleData = await vehicleRepository.createPosition(client, data);
        await vehicleRepository.upsertLatestVehicleState(client, data);

        if (speed > envConfig.SPEED_LIMIT) {
            await vehicleRepository.createVehicleAlert(client, {
                vehicleId,
                alertType: 'SPEED_LIMIT_EXCEEDED',
                speed,
                lon,
                lat,
                eventTime
            });
        }

        await client.query('COMMIT');
        return newPosition;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
