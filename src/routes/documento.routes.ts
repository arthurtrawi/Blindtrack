import { Router } from 'express';
import * as documentoController from '../controllers/documento.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import { avaliarDocumentoSchema } from '../validators/documento.schema.js';

export const documentoRoutes: Router = Router();

documentoRoutes.use(authenticate);

documentoRoutes.get(
  '/:id/arquivo',
  authorize('ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO'),
  validate({ params: idParamSchema }),
  documentoController.baixar,
);
// Aprovação/rejeição: decisão humana, restrita a ADMIN/GESTOR (RN17, decisão da Fase 2).
documentoRoutes.patch(
  '/:id/status',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: idParamSchema, body: avaliarDocumentoSchema }),
  documentoController.avaliar,
);
