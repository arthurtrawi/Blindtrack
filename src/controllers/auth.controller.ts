import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import {
  NOME_COOKIE_SESSAO,
  opcoesCookieSessao,
  opcoesLimparCookieSessao,
  requisicaoDoApp,
} from '../utils/cookie-sessao.js';
import type { AlterarSenhaInput, LoginInput } from '../validators/auth.schema.js';

/**
 * Sempre define o cookie de sessão HttpOnly. O token também vai no corpo para clientes de
 * API (Swagger, curl), EXCETO quando a requisição vem do front-end (X-Requested-With):
 * assim o JavaScript da página nunca tem acesso ao token (ADR-26).
 */
export async function login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> {
  const resultado = await authService.login(req.body);
  req.log.info({ usuarioId: resultado.usuario.id, perfil: resultado.usuario.perfil }, 'Login realizado');

  res.cookie(NOME_COOKIE_SESSAO, resultado.token, opcoesCookieSessao(new Date(resultado.expiraEm)));

  if (requisicaoDoApp(req)) {
    const { token: _token, ...semToken } = resultado;
    res.status(200).json({ data: { ...semToken, tipo: 'Cookie' } });
    return;
  }
  res.status(200).json({ data: resultado });
}

/** Encerra a sessão do navegador apagando o cookie. Idempotente; não exige sessão válida. */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(NOME_COOKIE_SESSAO, opcoesLimparCookieSessao());
  res.status(204).send();
}

export function me(req: Request, res: Response): void {
  res.status(200).json({ data: contextoDe(req).usuario });
}

export async function alterarSenha(
  req: Request<unknown, unknown, AlterarSenhaInput>,
  res: Response,
): Promise<void> {
  await authService.alterarPropriaSenha(contextoDe(req), req.body);
  // A troca de senha revoga as sessões anteriores (ADR-25), inclusive a atual:
  // apaga o cookie para o navegador não ficar com uma credencial que já não vale.
  res.clearCookie(NOME_COOKIE_SESSAO, opcoesLimparCookieSessao());
  res.status(204).send();
}
