import type { Request, Response } from 'express';
import * as etapaService from '../services/etapa.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import type { IdParam } from '../validators/comum.schema.js';
import type {
  AlterarPrazoEtapaInput,
  AlterarStatusEtapaInput,
  AtribuirResponsavelInput,
} from '../validators/etapa.schema.js';

/** GET /ordens-servico/:id/etapas */
export async function listarDaOrdem(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await etapaService.listarEtapas(req.params.id) });
}

export async function alterarStatus(
  req: Request<IdParam, unknown, AlterarStatusEtapaInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await etapaService.alterarStatusEtapa(req.params.id, req.body, contextoDe(req)) });
}

export async function atribuirResponsavel(
  req: Request<IdParam, unknown, AtribuirResponsavelInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await etapaService.atribuirResponsavel(req.params.id, req.body, contextoDe(req)) });
}

export async function alterarPrazo(
  req: Request<IdParam, unknown, AlterarPrazoEtapaInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await etapaService.alterarPrazoEtapa(req.params.id, req.body, contextoDe(req)) });
}
