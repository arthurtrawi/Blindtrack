/**
 * Respostas do portal do cliente (backend: services/portal.service.ts).
 * Lista branca de campos: nada interno (observações, responsáveis, justificativas) chega aqui.
 */
import type { DataISO } from './api';
import type { StatusEtapa, StatusOrdemServico, TipoDocumento } from './ordemServico';

export interface VeiculoPortal {
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
}

/** Item de GET /cliente/minhas-ordens */
export interface OrdemPortalResumo {
  id: string;
  numero: string;
  status: StatusOrdemServico;
  statusDescricao: string;
  dataEntrada: DataISO;
  previsaoEntrega: DataISO | null;
  dataEntrega: DataISO | null;
  atrasada: boolean;
  veiculo: VeiculoPortal;
  etapaAtual: string | null;
  progresso: { concluidas: number; total: number };
}

export interface EtapaPortal {
  nome: string;
  descricao: string | null;
  ordem: number;
  status: StatusEtapa;
  statusDescricao: string;
  dataInicio: DataISO | null;
  previsaoConclusao: DataISO | null;
  dataConclusao: DataISO | null;
}

export interface OcorrenciaPortal {
  descricao: string | null;
  status: string;
  dataAbertura: DataISO;
  dataResolucao: DataISO | null;
}

export interface DocumentoPortal {
  id: string;
  nome: string;
  tipo: TipoDocumento;
  createdAt: DataISO;
  download: string;
}

/** GET /cliente/ordens/:id/acompanhar */
export interface OrdemPortalDetalhe {
  id: string;
  numero: string;
  status: StatusOrdemServico;
  statusDescricao: string;
  dataEntrada: DataISO;
  previsaoEntrega: DataISO | null;
  dataEntrega: DataISO | null;
  atrasada: boolean;
  veiculo: VeiculoPortal & { anoModelo: number };
  etapas: EtapaPortal[];
  ocorrencias: OcorrenciaPortal[];
  documentos: DocumentoPortal[];
  linhaDoTempo: { data: DataISO; mensagem: string }[];
}
