import type { Request, Response } from 'express';
import * as clienteService from '../services/cliente.service.js';
import { queryValidada } from '../middlewares/validate.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import { listarClientesSchema } from '../validators/cliente.schema.js';
import type { AtualizarClienteInput, CriarClienteInput } from '../validators/cliente.schema.js';
import type { IdParam } from '../validators/comum.schema.js';

export async function criar(req: Request<unknown, unknown, CriarClienteInput>, res: Response): Promise<void> {
  const cliente = await clienteService.criarCliente(req.body, contextoDe(req));
  res.status(201).location(`/api/v1/clientes/${cliente.id}`).json({ data: cliente });
}

export async function listar(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await clienteService.listarClientes(queryValidada(req, listarClientesSchema), contextoDe(req)));
}

export async function obter(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await clienteService.obterCliente(req.params.id, contextoDe(req)) });
}

export async function atualizar(
  req: Request<IdParam, unknown, AtualizarClienteInput>,
  res: Response,
): Promise<void> {
  const cliente = await clienteService.atualizarCliente(req.params.id, req.body, contextoDe(req));
  res.status(200).json({ data: cliente });
}

export async function inativar(req: Request<IdParam>, res: Response): Promise<void> {
  await clienteService.inativarCliente(req.params.id, contextoDe(req));
  res.status(204).send();
}
