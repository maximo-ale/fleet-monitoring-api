export interface AlertData {
    id: string,
    vehicleId: string,
    alertType: 'SPEED_LIMIT_EXCEEDED',
    speed: number,
    lat: number,
    lon: number,
    eventTime: string,
}

export interface AlertQuery {
    limit?: number,
}
