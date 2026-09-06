import { Request, Response } from 'express';
import express from 'express';

import { createTables } from './utils/createTables';
import dotenv from 'dotenv';
import { cleanTables } from './utils/dropTables';
dotenv.config({ quiet: true });

import healthRoutes from './models/health/healthRoutes';
import vehicleRoutes from './models/vehicles/vehicleRoutes';
import alertRoutes from './models/alerts/alertRoutes';

import { errorHandler } from './middlewares/errorHandler';

const app = express();

await createTables();

if (process.env.RESET_DB?.trim().toLowerCase() === 'true'){
    await cleanTables();
}

app.post('/api/empty', (req: Request, res: Response) => {
    return res.status(202).json({ message: 'Accepted' });
});

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/alerts', alertRoutes);

app.use(errorHandler);

export default app;
