import type {
  StatusEtapa,
  StatusOcorrencia,
  StatusOrdemServico,
  TipoDocumento,
} from '../../generated/prisma/client.js';

/** Status de OS considerados encerrados (RN05). */
export const STATUS_OS_ENCERRADOS = [
  'ENTREGUE',
  'CANCELADA',
] as const satisfies readonly StatusOrdemServico[];

/** Status de etapa que indicam trabalho em curso sob a responsabilidade de alguém. */
export const STATUS_ETAPA_EM_CURSO = ['EM_ANDAMENTO', 'PAUSADA'] as const satisfies readonly StatusEtapa[];

/** Status de etapa que liberam a etapa seguinte (RN09). */
export const STATUS_ETAPA_FINALIZADOS = ['CONCLUIDA', 'DISPENSADA'] as const satisfies readonly StatusEtapa[];

/** Status de ocorrência ainda não finalizada. */
export const STATUS_OCORRENCIA_ABERTOS = [
  'ABERTA',
  'EM_TRATAMENTO',
] as const satisfies readonly StatusOcorrencia[];

/** Código da etapa cuja conclusão encerra a OS (RN06, RN17). */
export const CODIGO_ETAPA_ENTREGA = 'ENTREGA';

/** Etapas que nunca podem ser dispensadas nem desativadas no modelo (RN13). */
export const CODIGOS_ETAPAS_SEMPRE_OBRIGATORIAS = ['VISTORIA', 'INSPECAO_FINAL', 'ENTREGA'] as const;

/** Documentos que precisam estar APROVADOS para concluir a entrega (RN17, decisão da Fase 2). */
export const DOCUMENTOS_OBRIGATORIOS_ENTREGA = [
  'CONTRATO',
  'CHECKLIST_VISTORIA',
  'DECLARACAO_BLINDAGEM',
  'TERMO_ENTREGA',
] as const satisfies readonly TipoDocumento[];

export function osEncerrada(status: StatusOrdemServico): boolean {
  return (STATUS_OS_ENCERRADOS as readonly StatusOrdemServico[]).includes(status);
}

export function etapaFinalizada(status: StatusEtapa): boolean {
  return (STATUS_ETAPA_FINALIZADOS as readonly StatusEtapa[]).includes(status);
}
