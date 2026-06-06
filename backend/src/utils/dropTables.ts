import pool from '../config/dbConfig'

export const dropTables = async() => {
    await pool.query(`DROP TABLE IF EXISTS vehicle_positions`);
}