import express from 'express';
import { validate } from '../../middlewares/schemaValidator';
import { listAlertsQuerySchema } from './alertSchemas';
import * as alertController from './alertController';

const router = express.Router();

router.get('/',
    validate(listAlertsQuerySchema, 'query'),
    alertController.getRecentAlerts
);

export default router;
