/**
 * Tipos de ordem de serviço, etapas, histórico, ocorrências, documentos e modelo de etapas.
 * Espelham as respostas reais do backend (services/*.service.ts).
 */
import type { DataISO, InfoPrazo, ParametrosPaginacao, Referencia } from './api';

export type StatusOrdemServico =
  'ABERTA' | 'EM_ANDAMENTO' | 'SUSPENSA' | 'PRONTA_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADA';

export type StatusEtapa = 'PENDENTE' | 'EM_ANDAMENTO' | 'PAUSADA' | 'CONCLUIDA' | 'DISPENSADA';
export type AcaoEtapa = 'INICIAR' | 'PAUSAR' | 'RETOMAR' | 'CONCLUIR' | 'DISPENSAR' | 'REABRIR';
export type AcaoOrdem = 'SUSPENDER' | 'RETOMAR' | 'CANCELAR';

export type TipoOcorrencia = 'AGUARDANDO_PECA' | 'PENDENCIA_DOCUMENTAL' | 'RETRABALHO' | 'ATRASO' | 'OUTROS';
export type PrioridadeOcorrencia = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type StatusOcorrencia = 'ABERTA' | 'EM_TRATAMENTO' | 'RESOLVIDA' | 'CANCELADA';
export type AcaoOcorrencia = 'INICIAR_TRATAMENTO' | 'RESOLVER' | 'CANCELAR';

export type TipoDocumento =
  | 'CONTRATO'
  | 'CHECKLIST_VISTORIA'
  | 'DECLARACAO_BLINDAGEM'
  | 'TERMO_ENTREGA'
  | 'NOTA_FISCAL'
  | 'LAUDO_TECNICO'
  | 'FOTO'
  | 'OUTRO';
export type StatusDocumento = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface CamposOrdem {
  id: string;
  numero: string;
  veiculoId: string;
  clienteId: string;
  status: StatusOrdemServico;
  dataEntrada: DataISO;
  previsaoEntrega: DataISO;
  dataEntrega: DataISO | null;
  observacoes: string | null;
  abertaPorId: string;
  createdAt: DataISO;
  updatedAt: DataISO;
}

/** Item de GET /ordens-servico (com etapa atual e responsável, P2). */
export interface OrdemServicoResumo extends CamposOrdem {
  cliente: Referencia;
  veiculo: { id: string; placa: string; marca: string; modelo: string };
  etapaAtual: { nome: string; status: StatusEtapa; responsavel: Referencia | null } | null;
  ocorrenciasAbertas: number;
  prazo: InfoPrazo;
}

export interface Etapa {
  id: string;
  ordemServicoId: string;
  modeloEtapaId: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  obrigatoria: boolean;
  status: StatusEtapa;
  responsavelId: string | null;
  dataInicio: DataISO | null;
  previsaoConclusao: DataISO | null;
  dataConclusao: DataISO | null;
  createdAt: DataISO;
  updatedAt: DataISO;
  responsavel: Referencia | null;
  prazo: InfoPrazo;
}

/** PATCH /etapas/:id/status devolve também o novo status da OS. */
export type EtapaAlterada = Etapa & { statusOrdem: StatusOrdemServico };

/** GET /ordens-servico/:id */
export interface OrdemServicoDetalhe extends CamposOrdem {
  cliente: Referencia;
  veiculo: { id: string; placa: string; chassi: string; marca: string; modelo: string; cor: string };
  abertaPor: Referencia;
  etapas: Etapa[];
  prazo: InfoPrazo;
  ocorrenciasAbertas: number;
  totalDocumentos: number;
}

export type OrdenarOrdensPor = 'numero' | 'dataEntrada' | 'previsaoEntrega';

export interface FiltrosOrdens extends ParametrosPaginacao {
  status?: StatusOrdemServico;
  clienteId?: string;
  veiculoId?: string;
  placa?: string;
  numero?: string;
  cliente?: string;
  atrasada?: boolean;
  entradaDe?: DataISO;
  entradaAte?: DataISO;
  ordenarPor?: OrdenarOrdensPor;
  direcao?: 'asc' | 'desc';
}

export interface NovaOrdem {
  clienteId: string;
  veiculoId: string;
  previsaoEntrega: DataISO;
  observacoes?: string;
}

export interface ItemHistorico {
  id: string;
  ordemServicoId: string;
  etapaProcessoId: string | null;
  ocorrenciaId: string | null;
  documentoId: string | null;
  tipoEvento: 'ORDEM_SERVICO' | 'ETAPA' | 'OCORRENCIA' | 'DOCUMENTO';
  statusAnterior: string | null;
  statusNovo: string;
  descricao: string;
  visivelCliente: boolean;
  usuarioId: string;
  createdAt: DataISO;
  usuario: Referencia;
  etapaProcesso: { id: string; codigo: string; nome: string } | null;
}

export interface ItemLinhaDoTempo {
  tipo: 'STATUS' | 'REPLANEJAMENTO';
  data: DataISO;
  descricao: string;
  usuario: Referencia;
  detalhes: Record<string, unknown>;
}

export interface Ocorrencia {
  id: string;
  ordemServicoId: string;
  etapaProcessoId: string | null;
  titulo: string;
  descricao: string;
  tipo: TipoOcorrencia;
  prioridade: PrioridadeOcorrencia;
  status: StatusOcorrencia;
  impeditiva: boolean;
  visivelCliente: boolean;
  descricaoCliente: string | null;
  solucao: string | null;
  usuarioResponsavelId: string;
  abertaPorId: string;
  dataAbertura: DataISO;
  dataResolucao: DataISO | null;
  createdAt: DataISO;
  updatedAt: DataISO;
  usuarioResponsavel: Referencia;
  abertaPor: Referencia;
  etapaProcesso: { id: string; codigo: string; nome: string } | null;
}

export interface FiltrosOcorrencias {
  status?: StatusOcorrencia;
  tipo?: TipoOcorrencia;
  prioridade?: PrioridadeOcorrencia;
}

export interface NovaOcorrencia {
  titulo: string;
  descricao: string;
  tipo: TipoOcorrencia;
  prioridade?: PrioridadeOcorrencia;
  etapaProcessoId?: string;
  usuarioResponsavelId: string;
  impeditiva?: boolean;
  visivelCliente?: boolean;
  descricaoCliente?: string;
  novaPrevisaoEntrega?: DataISO;
}

export interface AlteracoesOcorrencia {
  titulo?: string;
  descricao?: string;
  prioridade?: PrioridadeOcorrencia;
  impeditiva?: boolean;
  usuarioResponsavelId?: string;
  visivelCliente?: boolean;
  descricaoCliente?: string | null;
  acao?: AcaoOcorrencia;
  solucao?: string;
  motivo?: string;
}

export interface Documento {
  id: string;
  ordemServicoId: string;
  nome: string;
  tipo: TipoDocumento;
  caminhoArquivo: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  hashSha256: string;
  status: StatusDocumento;
  visivelCliente: boolean;
  enviadoPorId: string;
  avaliadoPorId: string | null;
  avaliadoEm: DataISO | null;
  motivoRejeicao: string | null;
  createdAt: DataISO;
  updatedAt: DataISO;
  enviadoPor: Referencia;
  avaliadoPor: Referencia | null;
}

export interface NovoDocumento {
  arquivo: File;
  nome: string;
  tipo: TipoDocumento;
  visivelCliente: boolean;
}

export interface ModeloEtapa {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  obrigatoria: boolean;
  ativo: boolean;
  createdAt: DataISO;
  updatedAt: DataISO;
}
