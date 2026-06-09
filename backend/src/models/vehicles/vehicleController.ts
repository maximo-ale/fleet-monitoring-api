import { Request, Response, NextFunction } from 'express';
import * as vehicleService from './vehicleService';
import { VehicleData } from './vehicleInterface';

export const createPosition = async(req: Request, res: Response) => {
    const positionCreated: VehicleData = await vehicleService.saveVehiclePosition(req.body);

    return res.status(201).json({positionCreated});
}