import type { Request, Response } from 'express';
import * as veiculoService from '../services/veiculo.service.js';
import { queryValidada } from '../middlewares/validate.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import { listarVeiculosSchema } from '../validators/veiculo.schema.js';
import type { IdParam } from '../validators/comum.schema.js';
import type { AtualizarVeiculoInput, CriarVeiculoInput } from '../validators/veiculo.schema.js';

export async function criar(req: Request<unknown, unknown, CriarVeiculoInput>, res: Response): Promise<void> {
  const veiculo = await veiculoService.criarVeiculo(req.body, contextoDe(req));
  res.status(201).location(`/api/v1/veiculos/${veiculo.id}`).json({ data: veiculo });
}

export async function listar(req: Request, res: Response): Promise<void> {
  res.status(200).json(await veiculoService.listarVeiculos(queryValidada(req, listarVeiculosSchema)));
}

export async function obter(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await veiculoService.obterVeiculo(req.params.id) });
}

export async function atualizar(
  req: Request<IdParam, unknown, AtualizarVeiculoInput>,
  res: Response,
): Promise<void> {
  const veiculo = await veiculoService.atualizarVeiculo(req.params.id, req.body, contextoDe(req));
  res.status(200).json({ data: veiculo });
}
