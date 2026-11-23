import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export const dashboardRoutes: Router = Router();

// Indicadores agregados da operação (P1): perfis internos. CLIENTE usa o portal.
dashboardRoutes.get(
  '/indicadores',
  authenticate,
  authorize('ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO'),
  dashboardController.indicadores,
);
