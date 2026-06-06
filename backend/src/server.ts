import express from 'express';
import { createTables } from './utils/createTables';

import dotenv from 'dotenv';
import { dropTables } from './utils/dropTables';
dotenv.config();

import healthRoutes from './models/health/healthRoutes';
import vehicleRoutes from './models/vehicles/vehicleRoutes';

import { errorHandler } from './middlewares/errorHandler';

const app = express();

console.log("Hello, World!");


if (process.env.RESET_DB?.trim().toLowerCase() === 'true'){
    await dropTables();
}

await createTables();

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/vehicles', vehicleRoutes);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log('App listening on port ', process.env.PORT);
});