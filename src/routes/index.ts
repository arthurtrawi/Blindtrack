/**
 * Roteador da versão 1 da API, montado em /api/v1 pelo app.ts.
 * Os módulos de domínio (auth, clientes, veículos, OS…) são registrados aqui na Fase 4.
 */
import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

export const v1Routes: Router = Router();

v1Routes.use('/health', healthRoutes);
