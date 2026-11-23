import type { RespostaDados } from '@/types/api';
import type { AcaoEtapa, Etapa, EtapaAlterada } from '@/types/ordemServico';
import { api } from './api';
import { dados } from './util';

const caminho = (id: string) => `/etapas/${encodeURIComponent(id)}`;

export function listarDaOrdem(ordemId: string, signal?: AbortSignal): Promise<Etapa[]> {
  return dados(
    api.get<RespostaDados<Etapa[]>>(`/ordens-servico/${encodeURIComponent(ordemId)}/etapas`, { signal }),
  );
}

/** As regras (sequência, responsável, ocorrências impeditivas, RN17...) são validadas no backend. */
export function alterarStatus(id: string, acao: AcaoEtapa, justificativa?: string): Promise<EtapaAlterada> {
  return dados(api.patch<RespostaDados<EtapaAlterada>>(`${caminho(id)}/status`, { acao, justificativa }));
}

export function atribuirResponsavel(id: string, responsavelId: string): Promise<Etapa> {
  return dados(api.patch<RespostaDados<Etapa>>(`${caminho(id)}/responsavel`, { responsavelId }));
}

export function alterarPrazo(id: string, previsaoConclusao: string, justificativa?: string): Promise<Etapa> {
  return dados(api.patch<RespostaDados<Etapa>>(`${caminho(id)}/prazo`, { previsaoConclusao, justificativa }));
}
