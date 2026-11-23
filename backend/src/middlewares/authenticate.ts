/**
 * Autenticação por JWT, aceito de duas formas:
 * - `Authorization: Bearer <token>` (Swagger, curl, integrações);
 * - cookie HttpOnly `bt_sessao` (front-end web, ADR-26). Nesse caso, escritas exigem o
 *   cabeçalho anti-CSRF `X-Requested-With: BlindTrack`.
 *
 * Além de validar a assinatura, recarrega o usuário do banco a cada requisição.
 * Assim, desativar um usuário, mudar seu perfil ou trocar a senha vale IMEDIATAMENTE,
 * sem esperar o token de 8 h expirar. O custo é uma consulta por chave primária.
 */
import type { NextFunction, Request, Response } from 'express';
import { carregarUsuarioAutenticado, verificarToken } from '../services/auth.service.js';
import { AppError, UnauthorizedError } from '../utils/app-error.js';
import { lerCookieSessao, METODOS_SEGUROS, requisicaoDoApp } from '../utils/cookie-sessao.js';

function extrairToken(req: Request): { token: string; viaCookie: boolean } | null {
  const cabecalho = req.headers.authorization;
  if (cabecalho?.startsWith('Bearer ')) {
    return { token: cabecalho.slice('Bearer '.length).trim(), viaCookie: false };
  }
  const cookie = lerCookieSessao(req);
  return cookie ? { token: cookie, viaCookie: true } : null;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const credencial = extrairToken(req);
  if (!credencial) {
    throw new UnauthorizedError('Token de acesso ausente');
  }

  // Defesa contra CSRF: escrita autenticada só pelo cookie precisa vir do app.
  if (credencial.viaCookie && !METODOS_SEGUROS.has(req.method) && !requisicaoDoApp(req)) {
    throw new AppError('Requisição sem o cabeçalho de proteção X-Requested-With', 403, 'CSRF_BLOQUEADO');
  }

  const payload = verificarToken(credencial.token);
  const usuario = await carregarUsuarioAutenticado(payload.sub, payload.emitidoEm);
  if (!usuario) {
    throw new UnauthorizedError('Usuário inexistente ou inativo');
  }

  req.user = usuario;
  next();
}
