import { Router } from 'express';
import * as ocorrenciaController from '../controllers/ocorrencia.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import { atualizarOcorrenciaSchema } from '../validators/ocorrencia.schema.js';

export const ocorrenciaRoutes: Router = Router();

// O service restringe TECNICO/ATENDIMENTO às ocorrências pelas quais são responsáveis (RF31).
ocorrenciaRoutes.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO'),
  validate({ params: idParamSchema, body: atualizarOcorrenciaSchema }),
  ocorrenciaController.atualizar,
);
