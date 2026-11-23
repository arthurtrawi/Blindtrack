import type { Request, Response } from 'express';
import * as usuarioService from '../services/usuario.service.js';
import { queryValidada } from '../middlewares/validate.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import { listarUsuariosSchema } from '../validators/usuario.schema.js';
import type { IdParam } from '../validators/comum.schema.js';
import type { AtualizarUsuarioInput, CriarUsuarioInput } from '../validators/usuario.schema.js';

export async function criar(req: Request<unknown, unknown, CriarUsuarioInput>, res: Response): Promise<void> {
  const usuario = await usuarioService.criarUsuario(req.body, contextoDe(req));
  res.status(201).location(`/api/v1/usuarios/${usuario.id}`).json({ data: usuario });
}

export async function listar(req: Request, res: Response): Promise<void> {
  res.status(200).json(await usuarioService.listarUsuarios(queryValidada(req, listarUsuariosSchema)));
}

export async function obter(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await usuarioService.obterUsuario(req.params.id) });
}

export async function atualizar(
  req: Request<IdParam, unknown, AtualizarUsuarioInput>,
  res: Response,
): Promise<void> {
  const usuario = await usuarioService.atualizarUsuario(req.params.id, req.body, contextoDe(req));
  res.status(200).json({ data: usuario });
}

/** GET /usuarios/responsaveis (ADMIN, GESTOR) */
export async function listarResponsaveis(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await usuarioService.listarResponsaveis() });
}
