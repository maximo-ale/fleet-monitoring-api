import { createTables } from '../src/utils/createTables';
import pool from '../src/config/dbConfig';

process.env.SPEED_LIMIT = '120';

beforeAll(async() => {
    await createTables();
});

afterAll(async() => {
    await pool.end();
});
