import type { RespostaDados, RespostaPaginada } from '@/types/api';
import type { AlteracoesVeiculo, FiltrosVeiculos, NovoVeiculo, Veiculo } from '@/types/veiculo';
import { api } from './api';
import { comoQuery, dados } from './util';

export function listar(filtros?: FiltrosVeiculos, signal?: AbortSignal) {
  return api.get<RespostaPaginada<Veiculo>>('/veiculos', { query: comoQuery(filtros), signal });
}

export function obter(id: string, signal?: AbortSignal): Promise<Veiculo> {
  return dados(api.get<RespostaDados<Veiculo>>(`/veiculos/${encodeURIComponent(id)}`, { signal }));
}

export function criar(veiculo: NovoVeiculo): Promise<Veiculo> {
  return dados(api.post<RespostaDados<Veiculo>>('/veiculos', veiculo));
}

export function atualizar(id: string, alteracoes: AlteracoesVeiculo): Promise<Veiculo> {
  return dados(api.patch<RespostaDados<Veiculo>>(`/veiculos/${encodeURIComponent(id)}`, alteracoes));
}
