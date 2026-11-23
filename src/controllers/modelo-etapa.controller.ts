import type { Request, Response } from 'express';
import * as modeloService from '../services/modelo-etapa.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import type { IdParam } from '../validators/comum.schema.js';
import type { AtualizarModeloEtapaInput, CriarModeloEtapaInput } from '../validators/modelo-etapa.schema.js';

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await modeloService.listarModelos() });
}

export async function criar(
  req: Request<unknown, unknown, CriarModeloEtapaInput>,
  res: Response,
): Promise<void> {
  const modelo = await modeloService.criarModelo(req.body, contextoDe(req));
  res.status(201).location(`/api/v1/modelos-etapa/${modelo.id}`).json({ data: modelo });
}

export async function atualizar(
  req: Request<IdParam, unknown, AtualizarModeloEtapaInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await modeloService.atualizarModelo(req.params.id, req.body, contextoDe(req)) });
}
