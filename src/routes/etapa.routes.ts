import { Router } from 'express';
import * as etapaController from '../controllers/etapa.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import {
  alterarPrazoEtapaSchema,
  alterarStatusEtapaSchema,
  atribuirResponsavelSchema,
} from '../validators/etapa.schema.js';

export const etapaRoutes: Router = Router();

etapaRoutes.use(authenticate);

// TECNICO altera só as próprias etapas (RN16, verificado no domínio). CLIENTE nunca (RN32).
etapaRoutes.patch(
  '/:id/status',
  authorize('ADMIN', 'GESTOR', 'TECNICO'),
  validate({ params: idParamSchema, body: alterarStatusEtapaSchema }),
  etapaController.alterarStatus,
);
etapaRoutes.patch(
  '/:id/responsavel',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: idParamSchema, body: atribuirResponsavelSchema }),
  etapaController.atribuirResponsavel,
);
etapaRoutes.patch(
  '/:id/prazo',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: idParamSchema, body: alterarPrazoEtapaSchema }),
  etapaController.alterarPrazo,
);
