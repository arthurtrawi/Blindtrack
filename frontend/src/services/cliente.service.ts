/** Cadastro de clientes (/clientes). O portal do cliente fica em portal.service.ts. */
import type { RespostaDados, RespostaPaginada } from '@/types/api';
import type {
  AlteracoesCliente,
  Cliente,
  ClienteComVeiculos,
  ClienteVisivel,
  FiltrosClientes,
  NovoCliente,
} from '@/types/cliente';
import { api } from './api';
import { comoQuery, dados } from './util';

export function listar(filtros?: FiltrosClientes, signal?: AbortSignal) {
  return api.get<RespostaPaginada<ClienteVisivel>>('/clientes', { query: comoQuery(filtros), signal });
}

export function obter(id: string, signal?: AbortSignal): Promise<ClienteComVeiculos> {
  return dados(api.get<RespostaDados<ClienteComVeiculos>>(`/clientes/${encodeURIComponent(id)}`, { signal }));
}

export function criar(cliente: NovoCliente): Promise<Cliente> {
  return dados(api.post<RespostaDados<Cliente>>('/clientes', cliente));
}

export function atualizar(id: string, alteracoes: AlteracoesCliente): Promise<Cliente> {
  return dados(api.patch<RespostaDados<Cliente>>(`/clientes/${encodeURIComponent(id)}`, alteracoes));
}

/** Inativação lógica (RN36): o backend recusa se houver OS não encerrada. */
export async function inativar(id: string): Promise<void> {
  await api.delete<undefined>(`/clientes/${encodeURIComponent(id)}`);
}
