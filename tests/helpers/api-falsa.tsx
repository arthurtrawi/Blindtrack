/**
 * Utilitários de teste: uma API falsa (substitui o fetch) e a aplicação renderizada
 * numa rota inicial. As respostas seguem os formatos reais do backend.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppRoutes } from '@/routes/AppRoutes';
import type { PerfilUsuario, UsuarioAutenticado } from '@/types/usuario';

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

export function erroApi(status: number, code: string, message: string): Response {
  return json({ error: { code, message, requestId: 'req-teste' } }, status);
}

export interface RequisicaoFalsa {
  url: URL;
  init: RequestInit;
  corpo: unknown;
}

type Manipulador = (req: RequisicaoFalsa) => Response | Promise<Response>;

/**
 * Rotas no formato "MÉTODO /caminho" (sem o prefixo /api/v1), ex.: "POST /auth/login".
 * Chamada a rota não simulada responde 404 com mensagem explícita (facilita o diagnóstico).
 */
export function instalarApiFalsa(rotas: Record<string, Manipulador>) {
  const fetch = vi.fn(async (entrada: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(entrada));
    const chave = `${init.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}`;
    const manipulador = rotas[chave];
    if (!manipulador) return erroApi(404, 'NOT_FOUND', `Rota não simulada no teste: ${chave}`);
    const corpo = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : init.body;
    return manipulador({ url, init, corpo });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

/** Quantas vezes uma rota ("MÉTODO /caminho") foi chamada. */
export function chamadas(fetch: ReturnType<typeof instalarApiFalsa>, rota: string): number {
  return fetch.mock.calls.filter(([entrada, init]) => {
    const url = new URL(String(entrada));
    return `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}` === rota;
  }).length;
}

export function usuarioDe(perfil: PerfilUsuario, nome = 'Maria Souza'): UsuarioAutenticado {
  return {
    id: `id-${perfil.toLowerCase()}`,
    nome,
    email: `${perfil.toLowerCase()}@exemplo.example`,
    perfil,
    clienteId: perfil === 'CLIENTE' ? 'cliente-1' : null,
  };
}

/** Sem sessão: GET /auth/me responde 401 (como o backend sem cookie). */
export const semSessao = () => erroApi(401, 'UNAUTHORIZED', 'Token de acesso ausente');

/** Renderiza a aplicação inteira (sessão + rotas) a partir de uma URL. */
export function renderizarApp(rotaInicial = '/') {
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}
