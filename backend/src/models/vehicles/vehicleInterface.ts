export interface VehicleData {
    id: string,
    vehicleId: string,
    lat: number,
    lon: number,
    speed: number,
    createdAt: Date,
    eventTime: string,
}

export interface CreatePosition {
    vehicleId: string,
    speed: number,
    lat: number,
    lon: number,
    eventTime: Date,
}