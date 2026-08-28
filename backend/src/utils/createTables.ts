import pool from '../config/dbConfig';

export const createTables = async() => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS vehicle_positions (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            vehicle_id UUID,
            position geography(POINT, 4326) NOT NULL,
            speed DOUBLE PRECISION NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            event_time TIMESTAMPTZ NOT NULL,
            event_id UUID NOT NULL UNIQUE
        );
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vehicle_last_state (
            vehicle_id uuid NOT NULL UNIQUE,
            position geography(POINT, 4326) NOT NULL,
            speed DOUBLE PRECISION NOT NULL, 
            last_state_time TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS vehicle_alerts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            vehicle_id uuid NOT NULL,
            alert_type TEXT CHECK(alert_type IN ('SPEED_LIMIT_EXCEEDED', 'GEOFENCE_EXIT')) NOT NULL,
            speed DOUBLE PRECISION NOT NULL,
            position geography(POINT, 4326) NOT NULL,
            event_time TIMESTAMPTZ NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS geofences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            area geometry(POLYGON, 4326) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('');
    console.log('---PostgreSQL Tables---');
    console.log('Tables created successfully!');
}