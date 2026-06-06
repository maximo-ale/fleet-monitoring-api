import express from 'express';
import { validate } from '../../middlewares/schemaValidator';
import { createPositionSchema } from './vehicleSchemas';
import * as vehicleController from './vehicleController';

const router = express.Router();

router.post('/positions',
    validate(createPositionSchema, 'body'),
    vehicleController.createPosition
);

export default router;