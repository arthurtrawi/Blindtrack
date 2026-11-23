import type { RespostaDados, RespostaPaginada } from '@/types/api';
import type {
  AcaoOrdem,
  FiltrosOrdens,
  ItemHistorico,
  ItemLinhaDoTempo,
  NovaOrdem,
  OrdemServicoDetalhe,
  OrdemServicoResumo,
} from '@/types/ordemServico';
import { api } from './api';
import { comoQuery, dados } from './util';

const caminho = (id: string) => `/ordens-servico/${encodeURIComponent(id)}`;

export function listar(filtros?: FiltrosOrdens, signal?: AbortSignal) {
  return api.get<RespostaPaginada<OrdemServicoResumo>>('/ordens-servico', {
    query: comoQuery(filtros),
    signal,
  });
}

export function obter(id: string, signal?: AbortSignal): Promise<OrdemServicoDetalhe> {
  return dados(api.get<RespostaDados<OrdemServicoDetalhe>>(caminho(id), { signal }));
}

export function abrir(ordem: NovaOrdem): Promise<OrdemServicoDetalhe> {
  return dados(api.post<RespostaDados<OrdemServicoDetalhe>>('/ordens-servico', ordem));
}

export function atualizarObservacoes(id: string, observacoes: string | null): Promise<OrdemServicoDetalhe> {
  return dados(api.patch<RespostaDados<OrdemServicoDetalhe>>(caminho(id), { observacoes }));
}

/** SUSPENDER, RETOMAR ou CANCELAR, sempre com justificativa (RN07). */
export function alterarStatus(
  id: string,
  acao: AcaoOrdem,
  justificativa: string,
): Promise<OrdemServicoDetalhe> {
  return dados(
    api.patch<RespostaDados<OrdemServicoDetalhe>>(`${caminho(id)}/status`, { acao, justificativa }),
  );
}

export function replanejarEntrega(
  id: string,
  previsaoEntrega: string,
  justificativa: string,
): Promise<OrdemServicoDetalhe> {
  return dados(
    api.patch<RespostaDados<OrdemServicoDetalhe>>(`${caminho(id)}/previsao`, {
      previsaoEntrega,
      justificativa,
    }),
  );
}

export function historico(id: string, signal?: AbortSignal): Promise<ItemHistorico[]> {
  return dados(api.get<RespostaDados<ItemHistorico[]>>(`${caminho(id)}/historico`, { signal }));
}

export function linhaDoTempo(id: string, signal?: AbortSignal): Promise<ItemLinhaDoTempo[]> {
  return dados(api.get<RespostaDados<ItemLinhaDoTempo[]>>(`${caminho(id)}/linha-do-tempo`, { signal }));
}
