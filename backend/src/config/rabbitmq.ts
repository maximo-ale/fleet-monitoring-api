import amqp, { ChannelModel, ConfirmChannel } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const RABBITMQ_URL = process.env.RABBITMQ_URL;

if (!RABBITMQ_URL){
    throw new Error('RabbitMQ URL not provided');
}

export const QUEUE_NAME: string = 'vehicle.position.events';

let channel: ConfirmChannel | undefined;
let connection: ChannelModel | undefined;

export const connectToRabbitMQ = async() => {
    connection = await amqp.connect(RABBITMQ_URL);

    channel = await connection.createConfirmChannel();

    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
    });

    console.log('Connected to RabbitMQ');
}

export const closeRabbitMQ = async() => {
    if (channel){
        await channel.close();
        channel = undefined;
    }

    if (connection){
        await connection.close();
        connection = undefined;
    }
}

export const getRabbitMQChannel = () => {
    if (!channel){
        throw new Error('RabbitMQ channel is not initialized');
    }

    return channel;
}