import type { RespostaDados } from '@/types/api';
import type { CredenciaisLogin, RespostaLogin, UsuarioAutenticado } from '@/types/usuario';
import { api } from './api';
import { dados } from './util';

/** O backend define o cookie HttpOnly; como enviamos X-Requested-With, o token não vem no corpo. */
export function login(credenciais: CredenciaisLogin, signal?: AbortSignal): Promise<RespostaLogin> {
  return dados(
    api.post<RespostaDados<RespostaLogin>>('/auth/login', credenciais, { signal, ignorar401: true }),
  );
}

/** Recupera a sessão a partir do cookie. 401 aqui significa apenas "sem sessão". */
export function usuarioAtual(signal?: AbortSignal): Promise<UsuarioAutenticado> {
  return dados(api.get<RespostaDados<UsuarioAutenticado>>('/auth/me', { signal, ignorar401: true }));
}

export async function logout(): Promise<void> {
  await api.post<undefined>('/auth/logout', undefined, { ignorar401: true });
}

export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  await api.patch<undefined>('/auth/senha', { senhaAtual, novaSenha });
}
