import express from 'express';
import { health } from './healthController';

const router = express.Router();

router.get('/health', health);

export default router;