import express from 'express';
import { createTables } from './utils/createTables';

import dotenv from 'dotenv';
import { cleanTables } from './utils/dropTables';
dotenv.config();

import healthRoutes from './models/health/healthRoutes';
import vehicleRoutes from './models/vehicles/vehicleRoutes';

import { errorHandler } from './middlewares/errorHandler';

const app = express();

console.log("Hello, World!");

await createTables();

if (process.env.RESET_DB?.trim().toLowerCase() === 'true'){
    await cleanTables();
}


app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/vehicles', vehicleRoutes);

app.use(errorHandler);

export default app;