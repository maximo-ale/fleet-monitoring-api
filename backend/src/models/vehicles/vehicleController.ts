import { Request, Response } from 'express';
import * as vehicleService from './vehicleService';
import { LatestVehicleState, VehicleData } from './vehicleInterface';
import { publishPositionEvent } from '../../messaging/positionPublisher';

export const createPosition = async(req: Request, res: Response) => {
    const event = {
        eventId: crypto.randomUUID(),
        ...req.body,
    };

    await publishPositionEvent(event);

    return res.status(202).json({
        eventId: event.eventId,
    });
}

export const getLatestVehicleStates = async(req: Request, res: Response) => {
    const latestStates: LatestVehicleState[] = await vehicleService.getLatestVehicleStates();

    return res.status(200).json(latestStates);
}

export const getLatestVehicleState = async(req: Request, res: Response) => {
    const latestState: LatestVehicleState = await vehicleService.getLatestVehicleState(req.params.vehicleId as string);

    return res.status(200).json(latestState);
}
