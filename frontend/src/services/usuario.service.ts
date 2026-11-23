import type { RespostaDados, RespostaPaginada } from '@/types/api';
import type { AlteracoesUsuario, FiltrosUsuarios, NovoUsuario, Responsavel, Usuario } from '@/types/usuario';
import { api } from './api';
import { comoQuery, dados } from './util';

/** Cadastro completo: exclusivo do ADMIN (o backend responde 403 aos demais). */
export function listar(filtros?: FiltrosUsuarios, signal?: AbortSignal) {
  return api.get<RespostaPaginada<Usuario>>('/usuarios', { query: comoQuery(filtros), signal });
}

export function obter(id: string, signal?: AbortSignal): Promise<Usuario> {
  return dados(api.get<RespostaDados<Usuario>>(`/usuarios/${encodeURIComponent(id)}`, { signal }));
}

export function criar(usuario: NovoUsuario): Promise<Usuario> {
  return dados(api.post<RespostaDados<Usuario>>('/usuarios', usuario));
}

export function atualizar(id: string, alteracoes: AlteracoesUsuario): Promise<Usuario> {
  return dados(api.patch<RespostaDados<Usuario>>(`/usuarios/${encodeURIComponent(id)}`, alteracoes));
}

/** TECNICO e GESTOR ativos, para atribuir responsáveis (ADMIN e GESTOR). */
export function responsaveis(signal?: AbortSignal): Promise<Responsavel[]> {
  return dados(api.get<RespostaDados<Responsavel[]>>('/usuarios/responsaveis', { signal }));
}
