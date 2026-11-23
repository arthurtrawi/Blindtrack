/**
 * Autenticação por JWT (Bearer).
 *
 * Além de validar a assinatura, recarrega o usuário do banco a cada requisição.
 * Assim, desativar um usuário ou mudar seu perfil vale IMEDIATAMENTE, sem esperar o
 * token de 8 h expirar. O custo é uma consulta por chave primária, que é barata.
 */
import type { NextFunction, Request, Response } from 'express';
import { carregarUsuarioAutenticado, verificarToken } from '../services/auth.service.js';
import { UnauthorizedError } from '../utils/app-error.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso ausente');
  }

  const payload = verificarToken(cabecalho.slice('Bearer '.length).trim());
  const usuario = await carregarUsuarioAutenticado(payload.sub);
  if (!usuario) {
    throw new UnauthorizedError('Usuário inexistente ou inativo');
  }

  req.user = usuario;
  next();
}
