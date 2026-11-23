/**
 * Sessão por cookie HttpOnly (ADR-26), usada pelo front-end web.
 *
 * - HttpOnly: o JavaScript da página não lê o token (um XSS não consegue roubá-lo).
 * - SameSite=Strict: o navegador não envia o cookie em requisições iniciadas por outros sites.
 * - Secure em produção: só trafega por HTTPS.
 * - Anti-CSRF adicional: escritas autenticadas por cookie exigem o cabeçalho
 *   `X-Requested-With: BlindTrack`. Formulários de outros sites não conseguem enviar
 *   cabeçalhos próprios, e `fetch` com esse cabeçalho exige aprovação do CORS (origens listadas).
 *
 * Clientes de API (Swagger, curl, integrações) continuam usando `Authorization: Bearer`.
 */
import type { CookieOptions, Request } from 'express';
import { env } from '../config/env.js';

export const NOME_COOKIE_SESSAO = 'bt_sessao';

/** Cabeçalho que identifica requisições do front-end BlindTrack. */
export const CABECALHO_APP = 'x-requested-with';
export const VALOR_CABECALHO_APP = 'BlindTrack';

export const METODOS_SEGUROS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

function opcoesBase(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/api',
  };
}

export function opcoesCookieSessao(expiraEm: Date): CookieOptions {
  return { ...opcoesBase(), expires: expiraEm };
}

/** Para limpar o cookie, os atributos (path, sameSite...) precisam ser os mesmos da criação. */
export function opcoesLimparCookieSessao(): CookieOptions {
  return opcoesBase();
}

export function requisicaoDoApp(req: Pick<Request, 'headers'>): boolean {
  return req.headers[CABECALHO_APP] === VALOR_CABECALHO_APP;
}

/** Lê o cookie de sessão do cabeçalho `Cookie` (sem dependência extra de parser). */
export function lerCookieSessao(req: Pick<Request, 'headers'>): string | null {
  const cabecalho = req.headers.cookie;
  if (!cabecalho) return null;
  for (const parte of cabecalho.split(';')) {
    const separador = parte.indexOf('=');
    if (separador < 0) continue;
    if (parte.slice(0, separador).trim() === NOME_COOKIE_SESSAO) {
      const valor = parte.slice(separador + 1).trim();
      try {
        return decodeURIComponent(valor) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}
