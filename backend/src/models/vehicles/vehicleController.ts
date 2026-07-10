import { Request, Response } from 'express';
import * as vehicleService from './vehicleService';
import { LatestVehicleState, VehicleData } from './vehicleInterface';

export const createPosition = async(req: Request, res: Response) => {
    const positionCreated: VehicleData = await vehicleService.saveVehiclePosition(req.body);

    return res.status(201).json({positionCreated});
}

export const getLatestVehicleStates = async(req: Request, res: Response) => {
    const latestStates: LatestVehicleState[] = await vehicleService.getLatestVehicleStates();

    return res.status(200).json(latestStates);
}

export const getLatestVehicleState = async(req: Request, res: Response) => {
    const latestState: LatestVehicleState = await vehicleService.getLatestVehicleState(req.params.vehicleId as string);

    return res.status(200).json(latestState);
}
