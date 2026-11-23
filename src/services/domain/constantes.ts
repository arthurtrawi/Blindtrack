import type { StatusEtapa, StatusOcorrencia, StatusOrdemServico } from '../../generated/prisma/client.js';

/** Status de OS considerados encerrados (RN05). */
export const STATUS_OS_ENCERRADOS = [
  'ENTREGUE',
  'CANCELADA',
] as const satisfies readonly StatusOrdemServico[];

/** Status de etapa que indicam trabalho em curso sob a responsabilidade de alguém. */
export const STATUS_ETAPA_EM_CURSO = ['EM_ANDAMENTO', 'PAUSADA'] as const satisfies readonly StatusEtapa[];

/** Status de ocorrência ainda não finalizada. */
export const STATUS_OCORRENCIA_ABERTOS = [
  'ABERTA',
  'EM_TRATAMENTO',
] as const satisfies readonly StatusOcorrencia[];
