import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
    SPEED_LIMIT: z.preprocess(
        (value) => typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : value,
        z.number().min(0)
    ),
});

export const envConfig = envSchema.parse(process.env);
