import pool from '../config/dbConfig'

export const cleanTables = async() => {
    await pool.query(`TRUNCATE TABLE vehicle_positions`);
    await pool.query(`TRUNCATE TABLE vehicle_last_state`);
    await pool.query(`TRUNCATE TABLE vehicle_alerts`);
    await pool.query(`TRUNCATE TABLE geofences`);
    console.log('DB cleared successfully');

}