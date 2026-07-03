import pool from '../../config/dbConfig';
import { CreatePosition, VehicleData } from './vehicleInterface';
import * as vehicleRepository from './vehicleRepository';

export const saveVehiclePosition = async(data: CreatePosition): Promise<VehicleData> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const newPosition: VehicleData = await vehicleRepository.createPosition(client, data);
        await vehicleRepository.upsertLatestVehicleState(client, data);

        await client.query('COMMIT');
        return newPosition;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}