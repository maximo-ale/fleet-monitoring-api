import { z } from 'zod';

export const listAlertsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).optional(),
});
