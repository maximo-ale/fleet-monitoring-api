export interface PositionEvent {
    eventId: string,
    vehicleId: string,
    speed: number,
    lon: number,
    lat: number,
    eventTime: string,
}

import { getRabbitMQChannel, QUEUE_NAME } from "../config/rabbitmq";

export const publishPositionEvent = async(event: PositionEvent): Promise<void> => {
    const channel = getRabbitMQChannel();

    const message = Buffer.from(JSON.stringify(event));

    channel.sendToQueue(
        QUEUE_NAME,
        message,
        {
            persistent: true,
        }
    );

    await channel.waitForConfirms();
}