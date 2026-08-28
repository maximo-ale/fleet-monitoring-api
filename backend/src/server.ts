import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import app from './app';
import { connectToRabbitMQ } from './config/rabbitmq';

const createServer = async() => {
    await connectToRabbitMQ();

    app.listen(process.env.PORT, () => {
        console.log('App listening on port ', process.env.PORT);
    });
}

await createServer();
