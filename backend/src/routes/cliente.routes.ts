import { Router } from 'express';
import * as clienteController from '../controllers/cliente.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import {
  atualizarClienteSchema,
  criarClienteSchema,
  listarClientesSchema,
} from '../validators/cliente.schema.js';
import { idParamSchema } from '../validators/comum.schema.js';

export const clienteRoutes: Router = Router();

clienteRoutes.use(authenticate);

const podeEditar = authorize('ADMIN', 'GESTOR', 'ATENDIMENTO');
// TECNICO consulta com dados reduzidos (projeção no service, LGPD).
const podeConsultar = authorize('ADMIN', 'GESTOR', 'ATENDIMENTO', 'TECNICO');

clienteRoutes.post('/', podeEditar, validate({ body: criarClienteSchema }), clienteController.criar);
clienteRoutes.get('/', podeConsultar, validate({ query: listarClientesSchema }), clienteController.listar);
clienteRoutes.get('/:id', podeConsultar, validate({ params: idParamSchema }), clienteController.obter);
clienteRoutes.patch(
  '/:id',
  podeEditar,
  validate({ params: idParamSchema, body: atualizarClienteSchema }),
  clienteController.atualizar,
);
clienteRoutes.delete(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: idParamSchema }),
  clienteController.inativar,
);
