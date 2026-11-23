/**
 * Roteador da versão 1 da API, montado em /api/v1 pelo app.ts.
 * Cada módulo aplica a própria autenticação e autorização.
 */
import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { clienteRoutes } from './cliente.routes.js';
import { healthRoutes } from './health.routes.js';
import { usuarioRoutes } from './usuario.routes.js';
import { veiculoRoutes } from './veiculo.routes.js';

export const v1Routes: Router = Router();

v1Routes.use('/health', healthRoutes);
v1Routes.use('/auth', authRoutes);
v1Routes.use('/usuarios', usuarioRoutes);
v1Routes.use('/clientes', clienteRoutes);
v1Routes.use('/veiculos', veiculoRoutes);
