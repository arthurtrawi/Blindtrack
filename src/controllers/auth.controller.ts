import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import type { AlterarSenhaInput, LoginInput } from '../validators/auth.schema.js';

export async function login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> {
  const resultado = await authService.login(req.body);
  req.log.info({ usuarioId: resultado.usuario.id, perfil: resultado.usuario.perfil }, 'Login realizado');
  res.status(200).json({ data: resultado });
}

export function me(req: Request, res: Response): void {
  res.status(200).json({ data: contextoDe(req).usuario });
}

export async function alterarSenha(
  req: Request<unknown, unknown, AlterarSenhaInput>,
  res: Response,
): Promise<void> {
  await authService.alterarPropriaSenha(contextoDe(req), req.body);
  res.status(204).send();
}
