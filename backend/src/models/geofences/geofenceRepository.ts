import pool from '../../config/dbConfig';
import { CreateGeofence } from './geofenceInterface';

export const createGeofence = async(data: CreateGeofence) => {
    const { name, area, isActive } = data;

    const polygon = JSON.stringify({
        type: 'Polygon',
        coordinates: [area],
    });

    const result = await pool.query(`
        INSERT INTO geofences (name, area, is_active, created_at)
        VALUES (
            $1,
            ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
            $3,
            NOW()
        )
        RETURNING *;
    `, [name, polygon, isActive]);

    return result.rows[0];
}
