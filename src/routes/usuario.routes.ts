import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import {
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  listarUsuariosSchema,
} from '../validators/usuario.schema.js';

export const usuarioRoutes: Router = Router();

// Todo o módulo é exclusivo do ADMIN (matriz de permissões, arquitetura.md §7).
usuarioRoutes.use(authenticate, authorize('ADMIN'));

usuarioRoutes.post('/', validate({ body: criarUsuarioSchema }), usuarioController.criar);
usuarioRoutes.get('/', validate({ query: listarUsuariosSchema }), usuarioController.listar);
usuarioRoutes.get('/:id', validate({ params: idParamSchema }), usuarioController.obter);
usuarioRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: atualizarUsuarioSchema }),
  usuarioController.atualizar,
);
