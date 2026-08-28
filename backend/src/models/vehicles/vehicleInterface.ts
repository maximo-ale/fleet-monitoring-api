export interface VehicleData {
    id: string,
    vehicleId: string,
    lat: number,
    lon: number,
    speed: number,
    createdAt: Date,
    eventTime: string,
}

export interface LatestVehicleState {
    vehicleId: string,
    lat: number,
    lon: number,
    speed: number,
    eventTime: string,
    updatedAt: Date,
}

export interface CreatePosition {
    vehicleId: string,
    speed: number,
    lat: number,
    lon: number,
    eventTime: string,
}

export interface PositionEvent extends CreatePosition {
    eventId: string,
}

export interface VehicleAlert {
    vehicleId: string,
    alertType: 'SPEED_LIMIT_EXCEEDED' | 'GEOFENCE_EXIT',
    speed: number,
    lat: number,
    lon: number,
    eventTime: string,
}

export type PositionProcessingResult = 
    | {
        status: 'SUCCESS',
        position: VehicleData,
    }
    | {
        status: 'DUPLICATE',
    }
