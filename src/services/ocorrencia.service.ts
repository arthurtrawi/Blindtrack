import type { RespostaDados } from '@/types/api';
import type {
  AlteracoesOcorrencia,
  FiltrosOcorrencias,
  NovaOcorrencia,
  Ocorrencia,
} from '@/types/ordemServico';
import { api } from './api';
import { comoQuery, dados } from './util';

export function listarDaOrdem(
  ordemId: string,
  filtros?: FiltrosOcorrencias,
  signal?: AbortSignal,
): Promise<Ocorrencia[]> {
  return dados(
    api.get<RespostaDados<Ocorrencia[]>>(`/ordens-servico/${encodeURIComponent(ordemId)}/ocorrencias`, {
      query: comoQuery(filtros),
      signal,
    }),
  );
}

export function abrir(ordemId: string, ocorrencia: NovaOcorrencia): Promise<Ocorrencia> {
  return dados(
    api.post<RespostaDados<Ocorrencia>>(
      `/ordens-servico/${encodeURIComponent(ordemId)}/ocorrencias`,
      ocorrencia,
    ),
  );
}

export function atualizar(id: string, alteracoes: AlteracoesOcorrencia): Promise<Ocorrencia> {
  return dados(api.patch<RespostaDados<Ocorrencia>>(`/ocorrencias/${encodeURIComponent(id)}`, alteracoes));
}
