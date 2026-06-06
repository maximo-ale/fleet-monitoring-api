import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('Env: ');
console.log('Host: ', process.env.DB_HOST);
console.log('Username: ', process.env.DB_USERNAME);
console.log('Password: ', process.env.DB_PASSWORD);
console.log('Name: ', process.env.DB_NAME);
console.log('Port: ', process.env.DB_PORT);

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT)
});

export default pool;