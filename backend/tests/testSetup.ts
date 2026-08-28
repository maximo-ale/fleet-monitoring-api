import { createTables } from '../src/utils/createTables';
import pool from '../src/config/dbConfig';
import { closeRabbitMQ, connectToRabbitMQ } from '../src/config/rabbitmq';

process.env.SPEED_LIMIT = '120';

beforeAll(async() => {
    await createTables();
    await connectToRabbitMQ();
});

afterAll(async() => {
    await closeRabbitMQ();
    await pool.end();
});
