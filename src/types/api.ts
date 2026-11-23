/**
 * Envelopes de resposta da API (conferidos no backend: src/utils/paginacao.ts e
 * src/middlewares/error-handler.ts). Datas chegam como string ISO 8601.
 */

export type DataISO = string;

export interface RespostaDados<T> {
  data: T;
}

export interface MetaPaginacao {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RespostaPaginada<T> {
  data: T[];
  meta: MetaPaginacao;
}

export interface ErroCampo {
  campo: string;
  mensagem: string;
}

export interface CorpoErroApi {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface ParametrosPaginacao {
  page?: number;
  pageSize?: number;
}

/** Indicador de prazo calculado pelo backend (services/domain/prazos.ts). */
export interface InfoPrazo {
  previsto: DataISO | null;
  realizado: DataISO | null;
  atrasada: boolean;
  diasAtraso: number;
  desvioDias: number | null;
}

export interface Referencia {
  id: string;
  nome: string;
}
