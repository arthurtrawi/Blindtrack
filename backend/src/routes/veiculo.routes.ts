import { Router } from 'express';
import * as veiculoController from '../controllers/veiculo.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import {
  atualizarVeiculoSchema,
  criarVeiculoSchema,
  listarVeiculosSchema,
} from '../validators/veiculo.schema.js';

export const veiculoRoutes: Router = Router();

veiculoRoutes.use(authenticate);

const podeEditar = authorize('ADMIN', 'GESTOR', 'ATENDIMENTO');
const podeConsultar = authorize('ADMIN', 'GESTOR', 'ATENDIMENTO', 'TECNICO');

veiculoRoutes.post('/', podeEditar, validate({ body: criarVeiculoSchema }), veiculoController.criar);
veiculoRoutes.get('/', podeConsultar, validate({ query: listarVeiculosSchema }), veiculoController.listar);
veiculoRoutes.get('/:id', podeConsultar, validate({ params: idParamSchema }), veiculoController.obter);
veiculoRoutes.patch(
  '/:id',
  podeEditar,
  validate({ params: idParamSchema, body: atualizarVeiculoSchema }),
  veiculoController.atualizar,
);
