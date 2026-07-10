import express from 'express';
import { validate } from '../../middlewares/schemaValidator';
import { createPositionSchema, vehicleIdParamSchema } from './vehicleSchemas';
import * as vehicleController from './vehicleController';

const router = express.Router();

router.get('/latest',
    vehicleController.getLatestVehicleStates
);

router.get('/:vehicleId/latest',
    validate(vehicleIdParamSchema, 'params'),
    vehicleController.getLatestVehicleState
);

router.post('/positions',
    validate(createPositionSchema, 'body'),
    vehicleController.createPosition
);

export default router;
