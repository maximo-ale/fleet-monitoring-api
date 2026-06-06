import { CreatePosition, VehicleData } from './vehicleInterface';
import * as vehicleRepository from './vehicleRepository';

export const saveVehiclePosition = async(data: CreatePosition): Promise<VehicleData> => {
    const newPosition: VehicleData = await vehicleRepository.createPosition(data);

    return newPosition;
}