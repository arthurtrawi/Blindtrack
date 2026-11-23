import type { RespostaDados } from '@/types/api';
import type { ModeloEtapa } from '@/types/ordemServico';
import { api } from './api';
import { dados } from './util';

export interface NovoModeloEtapa {
  codigo: string;
  nome: string;
  descricao?: string;
  ordem: number;
  obrigatoria?: boolean;
}

export type AlteracoesModeloEtapa = Partial<Omit<NovoModeloEtapa, 'codigo'>> & { ativo?: boolean };

export function listar(signal?: AbortSignal): Promise<ModeloEtapa[]> {
  return dados(api.get<RespostaDados<ModeloEtapa[]>>('/modelos-etapa', { signal }));
}

export function criar(modelo: NovoModeloEtapa): Promise<ModeloEtapa> {
  return dados(api.post<RespostaDados<ModeloEtapa>>('/modelos-etapa', modelo));
}

export function atualizar(id: string, alteracoes: AlteracoesModeloEtapa): Promise<ModeloEtapa> {
  return dados(api.patch<RespostaDados<ModeloEtapa>>(`/modelos-etapa/${encodeURIComponent(id)}`, alteracoes));
}
