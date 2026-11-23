/**
 * /api/v1/ordens-servico — OS e recursos aninhados (etapas, histórico, ocorrências, documentos).
 * O usuário CLIENTE não tem acesso: ele usa o portal (/api/v1/cliente).
 */
import { Router } from 'express';
import * as documentoController from '../controllers/documento.controller.js';
import * as etapaController from '../controllers/etapa.controller.js';
import * as ocorrenciaController from '../controllers/ocorrencia.controller.js';
import * as ordemController from '../controllers/ordem-servico.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { uploadArquivo } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/comum.schema.js';
import { enviarDocumentoSchema } from '../validators/documento.schema.js';
import { abrirOcorrenciaSchema, listarOcorrenciasSchema } from '../validators/ocorrencia.schema.js';
import {
  abrirOrdemSchema,
  alterarPrevisaoOrdemSchema,
  alterarStatusOrdemSchema,
  atualizarOrdemSchema,
  listarOrdensSchema,
} from '../validators/ordem-servico.schema.js';

export const ordemServicoRoutes: Router = Router();

const internos = authorize('ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO');
const cadastro = authorize('ADMIN', 'GESTOR', 'ATENDIMENTO');
const gestao = authorize('ADMIN', 'GESTOR');
const porId = validate({ params: idParamSchema });

ordemServicoRoutes.use(authenticate);

// OS
ordemServicoRoutes.post('/', cadastro, validate({ body: abrirOrdemSchema }), ordemController.abrir);
ordemServicoRoutes.get('/', internos, validate({ query: listarOrdensSchema }), ordemController.listar);
ordemServicoRoutes.get('/:id', internos, porId, ordemController.obter);
ordemServicoRoutes.patch(
  '/:id',
  cadastro,
  validate({ params: idParamSchema, body: atualizarOrdemSchema }),
  ordemController.atualizar,
);
ordemServicoRoutes.patch(
  '/:id/status',
  gestao,
  validate({ params: idParamSchema, body: alterarStatusOrdemSchema }),
  ordemController.alterarStatus,
);
ordemServicoRoutes.patch(
  '/:id/previsao',
  gestao,
  validate({ params: idParamSchema, body: alterarPrevisaoOrdemSchema }),
  ordemController.alterarPrevisao,
);

// Etapas, histórico e linha do tempo
ordemServicoRoutes.get('/:id/etapas', internos, porId, etapaController.listarDaOrdem);
ordemServicoRoutes.get('/:id/historico', internos, porId, ordemController.historico);
ordemServicoRoutes.get('/:id/linha-do-tempo', internos, porId, ordemController.linhaDoTempo);

// Ocorrências
ordemServicoRoutes.post(
  '/:id/ocorrencias',
  internos,
  validate({ params: idParamSchema, body: abrirOcorrenciaSchema }),
  ocorrenciaController.abrir,
);
ordemServicoRoutes.get(
  '/:id/ocorrencias',
  internos,
  validate({ params: idParamSchema, query: listarOcorrenciasSchema }),
  ocorrenciaController.listarDaOrdem,
);

// Documentos (multer antes do validate: o corpo multipart só existe depois do upload)
ordemServicoRoutes.post(
  '/:id/documentos',
  internos,
  porId,
  uploadArquivo,
  validate({ body: enviarDocumentoSchema }),
  documentoController.enviar,
);
ordemServicoRoutes.get('/:id/documentos', internos, porId, documentoController.listarDaOrdem);
