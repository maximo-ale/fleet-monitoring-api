import { createTables } from '../src/utils/createTables';
import pool from '../src/config/dbConfig';

beforeAll(async() => {
    await createTables();
});

afterAll(async() => {
    await pool.end();
});
