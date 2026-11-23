/**
 * Roteador da versão 1 da API, montado em /api/v1 pelo app.ts.
 * Cada módulo aplica a própria autenticação e autorização.
 */
import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { clienteRoutes } from './cliente.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { documentoRoutes } from './documento.routes.js';
import { etapaRoutes } from './etapa.routes.js';
import { healthRoutes } from './health.routes.js';
import { modeloEtapaRoutes } from './modelo-etapa.routes.js';
import { ocorrenciaRoutes } from './ocorrencia.routes.js';
import { ordemServicoRoutes } from './ordem-servico.routes.js';
import { portalRoutes } from './portal.routes.js';
import { usuarioRoutes } from './usuario.routes.js';
import { veiculoRoutes } from './veiculo.routes.js';

export const v1Routes: Router = Router();

v1Routes.use('/health', healthRoutes);
v1Routes.use('/auth', authRoutes);
v1Routes.use('/usuarios', usuarioRoutes);
v1Routes.use('/clientes', clienteRoutes);
v1Routes.use('/veiculos', veiculoRoutes);
v1Routes.use('/ordens-servico', ordemServicoRoutes);
v1Routes.use('/etapas', etapaRoutes);
v1Routes.use('/ocorrencias', ocorrenciaRoutes);
v1Routes.use('/documentos', documentoRoutes);
v1Routes.use('/modelos-etapa', modeloEtapaRoutes);
v1Routes.use('/dashboard', dashboardRoutes);
v1Routes.use('/cliente', portalRoutes);
