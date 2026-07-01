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
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    console.log('Tables created successfully!');
}