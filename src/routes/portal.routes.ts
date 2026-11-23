/**
 * /api/v1/cliente — portal do cliente: somente leitura e somente as próprias OS (RN30–RN32).
 */
import { Router } from 'express';
import * as portalController from '../controllers/portal.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema, paginacaoSchema } from '../validators/comum.schema.js';

export const portalRoutes: Router = Router();

portalRoutes.use(authenticate, authorize('CLIENTE'));

portalRoutes.get('/minhas-ordens', validate({ query: paginacaoSchema }), portalController.minhasOrdens);
portalRoutes.get('/ordens/:id/acompanhar', validate({ params: idParamSchema }), portalController.acompanhar);
portalRoutes.get(
  '/documentos/:id/arquivo',
  validate({ params: idParamSchema }),
  portalController.baixarDocumento,
);
