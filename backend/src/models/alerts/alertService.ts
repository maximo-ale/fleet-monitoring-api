import { PoolClient } from 'pg';
import pool from '../../config/dbConfig';
import { AlertData, AlertQuery } from './alertInterface';
import * as alertRepository from './alertRepository';

export const getRecentAlerts = async(query: AlertQuery): Promise<AlertData[]> => {
    const client: PoolClient = await pool.connect();

    try {
        return await alertRepository.getRecentAlerts(client, query.limit);
    } finally {
        client.release();
    }
}
