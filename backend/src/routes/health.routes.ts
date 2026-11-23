import { Router } from 'express';
import { health } from '../controllers/health.controller.js';

export const healthRoutes: Router = Router();

healthRoutes.get('/', health);
