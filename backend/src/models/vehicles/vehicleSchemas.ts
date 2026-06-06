import { z } from 'zod';

export const createPositionSchema = z.object({
    vehicleId: z.uuid(),
    speed: z.number().min(0),
    lon: z
        .coerce.number()
        .min(-180)
        .max(180),
    lat: z
        .coerce.number()
        .min(-90)
        .max(90),
});