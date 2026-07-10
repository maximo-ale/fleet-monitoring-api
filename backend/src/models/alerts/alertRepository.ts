import { PoolClient } from 'pg';
import { AlertData } from './alertInterface';

export const getRecentAlerts = async(client: PoolClient, limit?: number): Promise<AlertData[]> => {
    const baseQuery = `
        SELECT
            id,
            vehicle_id "vehicleId",
            alert_type "alertType",
            speed,
            ST_X(position::geometry) "lon",
            ST_Y(position::geometry) "lat",
            event_time "eventTime"
        FROM vehicle_alerts
        ORDER BY event_time DESC
    `;

    const result = limit
        ? await client.query(`${baseQuery} LIMIT $1;`, [limit])
        : await client.query(`${baseQuery};`);

    return result.rows;
}
