import { PoolClient } from 'pg';
import pool from '../../config/dbConfig';
import { envConfig } from '../../config/envConfig';
import { NotFoundError } from '../../utils/errors';
import { CreatePosition, LatestVehicleState, VehicleData } from './vehicleInterface';
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

        const isInValidPosition: boolean = await vehicleRepository.isVehicleInValidPosition(client, lon, lat);

        if (!isInValidPosition){
            await vehicleRepository.createVehicleAlert(client, {
                vehicleId,
                alertType: 'GEOFENCE_EXIT',
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

export const getLatestVehicleStates = async(): Promise<LatestVehicleState[]> => {
    const client: PoolClient = await pool.connect();

    try {
        return await vehicleRepository.getLatestVehicleStates(client);
    } finally {
        client.release();
    }
}

export const getLatestVehicleState = async(vehicleId: string): Promise<LatestVehicleState> => {
    const client: PoolClient = await pool.connect();

    try {
        const latestState = await vehicleRepository.getLatestVehicleState(client, vehicleId);

        if (!latestState) {
            throw new NotFoundError('Latest vehicle state not found');
        }

        return latestState;
    } finally {
        client.release();
    }
}
