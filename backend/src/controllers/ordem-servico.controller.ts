import type { Request, Response } from 'express';
import { queryValidada } from '../middlewares/validate.js';
import * as historicoService from '../services/historico.service.js';
import * as ordemService from '../services/ordem-servico.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import type { IdParam } from '../validators/comum.schema.js';
import {
  listarOrdensSchema,
  type AbrirOrdemInput,
  type AlterarPrevisaoOrdemInput,
  type AlterarStatusOrdemInput,
  type AtualizarOrdemInput,
} from '../validators/ordem-servico.schema.js';

export async function abrir(req: Request<unknown, unknown, AbrirOrdemInput>, res: Response): Promise<void> {
  const ordem = await ordemService.abrirOrdem(req.body, contextoDe(req));
  res.status(201).location(`/api/v1/ordens-servico/${ordem.id}`).json({ data: ordem });
}

export async function listar(req: Request, res: Response): Promise<void> {
  res.status(200).json(await ordemService.listarOrdens(queryValidada(req, listarOrdensSchema)));
}

export async function obter(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await ordemService.obterOrdem(req.params.id) });
}

export async function atualizar(
  req: Request<IdParam, unknown, AtualizarOrdemInput>,
  res: Response,
): Promise<void> {
  res.status(200).json({ data: await ordemService.atualizarOrdem(req.params.id, req.body, contextoDe(req)) });
}

export async function alterarStatus(
  req: Request<IdParam, unknown, AlterarStatusOrdemInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await ordemService.alterarStatusOrdem(req.params.id, req.body, contextoDe(req)) });
}

export async function alterarPrevisao(
  req: Request<IdParam, unknown, AlterarPrevisaoOrdemInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await ordemService.alterarPrevisaoOrdem(req.params.id, req.body, contextoDe(req)) });
}

export async function historico(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await historicoService.listarHistorico(req.params.id) });
}

export async function linhaDoTempo(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await historicoService.linhaDoTempo(req.params.id) });
}
