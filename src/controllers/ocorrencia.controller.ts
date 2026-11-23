import type { Request, Response } from 'express';
import { queryValidada } from '../middlewares/validate.js';
import * as ocorrenciaService from '../services/ocorrencia.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import type { IdParam } from '../validators/comum.schema.js';
import {
  listarOcorrenciasSchema,
  type AbrirOcorrenciaInput,
  type AtualizarOcorrenciaInput,
} from '../validators/ocorrencia.schema.js';

/** POST /ordens-servico/:id/ocorrencias */
export async function abrir(
  req: Request<IdParam, unknown, AbrirOcorrenciaInput>,
  res: Response,
): Promise<void> {
  const ocorrencia = await ocorrenciaService.abrirOcorrencia(req.params.id, req.body, contextoDe(req));
  res.status(201).location(`/api/v1/ocorrencias/${ocorrencia.id}`).json({ data: ocorrencia });
}

/** GET /ordens-servico/:id/ocorrencias */
export async function listarDaOrdem(req: Request<IdParam>, res: Response): Promise<void> {
  const query = queryValidada(req, listarOcorrenciasSchema);
  res.status(200).json({ data: await ocorrenciaService.listarOcorrencias(req.params.id, query) });
}

/** PATCH /ocorrencias/:id */
export async function atualizar(
  req: Request<IdParam, unknown, AtualizarOcorrenciaInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await ocorrenciaService.atualizarOcorrencia(req.params.id, req.body, contextoDe(req)) });
}
