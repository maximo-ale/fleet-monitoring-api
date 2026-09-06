import amqp from 'amqplib';
import { QUEUE_NAME } from '../config/rabbitmq';
import { PositionEvent } from '../messaging/positionPublisher';
import dotenv from 'dotenv';
import { PositionProcessingResult, VehicleData } from '../models/vehicles/vehicleInterface';
import { saveVehiclePosition } from '../models/vehicles/vehicleService';

dotenv.config({ quiet: true });

const RABBITMQ_URL = process.env.RABBITMQ_URL;

if (!RABBITMQ_URL){
    throw new Error('Invalid RabbitMQ URL');
}

const startPositionWorker = async () => {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createConfirmChannel();

    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
    });

    console.log('Position worker waiting for messages...');

    await channel.prefetch(1);



    

    await channel.consume(
        QUEUE_NAME,
        async(message) => {
            if (!message){
                return;
            }

            const event: PositionEvent = JSON.parse(
                message.content.toString(),
            );

            try {
                await saveVehiclePosition(event);

                channel.ack(message!);
            } catch (err) {
                console.error(`Couldn't ack message: ${err}`);
                channel.nack(message, false, true);
            }
        },
        {
            noAck: false,
        }
    );
};

startPositionWorker();