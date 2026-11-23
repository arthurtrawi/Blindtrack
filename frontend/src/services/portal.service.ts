/** Portal do cliente (/cliente/*): somente leitura, só as próprias OS (garantido pelo backend). */
import type { ParametrosPaginacao, RespostaDados, RespostaPaginada } from '@/types/api';
import type { OrdemPortalDetalhe, OrdemPortalResumo } from '@/types/portal';
import { api, type ArquivoBaixado } from './api';
import { comoQuery, dados } from './util';

export function minhasOrdens(paginacao?: ParametrosPaginacao, signal?: AbortSignal) {
  return api.get<RespostaPaginada<OrdemPortalResumo>>('/cliente/minhas-ordens', {
    query: comoQuery(paginacao),
    signal,
  });
}

export function acompanhar(ordemId: string, signal?: AbortSignal): Promise<OrdemPortalDetalhe> {
  return dados(
    api.get<RespostaDados<OrdemPortalDetalhe>>(`/cliente/ordens/${encodeURIComponent(ordemId)}/acompanhar`, {
      signal,
    }),
  );
}

export function baixarDocumento(documentoId: string): Promise<ArquivoBaixado> {
  return api.baixar(`/cliente/documentos/${encodeURIComponent(documentoId)}/arquivo`);
}
