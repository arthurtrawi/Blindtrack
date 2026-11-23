import type { RespostaDados } from '@/types/api';
import type { Documento, NovoDocumento } from '@/types/ordemServico';
import { api, type ArquivoBaixado } from './api';
import { dados } from './util';

export function listarDaOrdem(ordemId: string, signal?: AbortSignal): Promise<Documento[]> {
  return dados(
    api.get<RespostaDados<Documento[]>>(`/ordens-servico/${encodeURIComponent(ordemId)}/documentos`, {
      signal,
    }),
  );
}

/** Upload multipart: campo "arquivo" + nome, tipo e visivelCliente (como texto). */
export function enviar(ordemId: string, documento: NovoDocumento): Promise<Documento> {
  const formulario = new FormData();
  formulario.append('arquivo', documento.arquivo);
  formulario.append('nome', documento.nome);
  formulario.append('tipo', documento.tipo);
  formulario.append('visivelCliente', String(documento.visivelCliente));
  return dados(
    api.enviarFormulario<RespostaDados<Documento>>(
      `/ordens-servico/${encodeURIComponent(ordemId)}/documentos`,
      formulario,
    ),
  );
}

/** Decisão humana de aprovação/rejeição (ADMIN, GESTOR). */
export function avaliar(
  id: string,
  status: 'APROVADO' | 'REJEITADO',
  motivoRejeicao?: string,
): Promise<Documento> {
  return dados(
    api.patch<RespostaDados<Documento>>(`/documentos/${encodeURIComponent(id)}/status`, {
      status,
      motivoRejeicao,
    }),
  );
}

export function baixar(id: string): Promise<ArquivoBaixado> {
  return api.baixar(`/documentos/${encodeURIComponent(id)}/arquivo`);
}
