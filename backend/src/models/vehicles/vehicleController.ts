import { Request, Response, NextFunction } from 'express';
import * as vehicleService from './vehicleService';
import { VehicleData } from './vehicleInterface';

export const createPosition = async(req: Request, res: Response) => {
    const positionCreated: VehicleData = await vehicleService.saveVehiclePosition(req.body);

    console.log(`Position created successfully: ${JSON.stringify(positionCreated, null, 2)}`);

    return res.status(201).json({positionCreated});
}