import { Router } from 'express';
import * as modeloController from '../controllers/modelo-etapa.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import { atualizarModeloEtapaSchema, criarModeloEtapaSchema } from '../validators/modelo-etapa.schema.js';

export const modeloEtapaRoutes: Router = Router();

modeloEtapaRoutes.use(authenticate, authorize('ADMIN', 'GESTOR'));

modeloEtapaRoutes.get('/', modeloController.listar);
modeloEtapaRoutes.post('/', validate({ body: criarModeloEtapaSchema }), modeloController.criar);
modeloEtapaRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: atualizarModeloEtapaSchema }),
  modeloController.atualizar,
);
