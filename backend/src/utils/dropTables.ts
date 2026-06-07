import pool from '../config/dbConfig'

export const cleanTables = async() => {
    await pool.query(`TRUNCATE TABLE vehicle_positions`);
}