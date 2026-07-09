import pool from '../config/dbConfig'

export const cleanTables = async() => {
    await pool.query(`TRUNCATE TABLE vehicle_positions`);
    await pool.query(`TRUNCATE TABLE vehicle_last_state`);
    await pool.query(`TRUNCATE TABLE vehicle_alerts`);
    console.log('DB cleared successfully');

}