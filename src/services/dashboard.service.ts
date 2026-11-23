/**
 * Indicadores do painel (P1, RF43). Todas as contagens são agregações no banco
 * (COUNT / GROUP BY), executadas em paralelo, sem carregar registros na memória.
 * "Ativa" = OS ou etapa de OS que não está encerrada (ENTREGUE/CANCELADA).
 */
import { prisma } from '../config/prisma.js';
import type { StatusOrdemServico } from '../generated/prisma/client.js';
import { STATUS_OCORRENCIA_ABERTOS, STATUS_OS_ENCERRADOS } from './domain/constantes.js';
import { filtroOrdensAtrasadas } from './ordem-servico.service.js';

const DIA_MS = 24 * 60 * 60 * 1000;

const TODOS_STATUS: StatusOrdemServico[] = [
  'ABERTA',
  'EM_ANDAMENTO',
  'SUSPENSA',
  'PRONTA_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADA',
];

export interface IndicadoresDashboard {
  porStatus: Record<StatusOrdemServico, number>;
  /** OS não encerradas (todas menos ENTREGUE e CANCELADA). */
  ordensAtivas: number;
  /** OS não encerradas com previsão vencida (mesma regra do filtro ?atrasada=true). */
  ordensAtrasadas: number;
  /** OS não encerradas com previsão de entrega nos próximos 7 dias. */
  entregasProximos7Dias: number;
  /** Ocorrências ABERTA ou EM_TRATAMENTO em OS ativas. */
  ocorrenciasAtivas: number;
  /** Etapas EM_ANDAMENTO ou PAUSADA em OS ativas. */
  etapasEmCurso: number;
  /** Etapas não finalizadas com previsão de conclusão vencida, em OS ativas. */
  etapasAtrasadas: number;
  geradoEm: string;
}

export async function indicadores(): Promise<IndicadoresDashboard> {
  const agora = new Date();
  const osAtiva = { status: { notIn: [...STATUS_OS_ENCERRADOS] } };

  const [agrupado, atrasadas, entregasProximas, ocorrenciasAtivas, etapasEmCurso, etapasAtrasadas] =
    await Promise.all([
      prisma.ordemServico.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.ordemServico.count({ where: { AND: [osAtiva, filtroOrdensAtrasadas(agora)] } }),
      prisma.ordemServico.count({
        where: { ...osAtiva, previsaoEntrega: { gte: agora, lte: new Date(agora.getTime() + 7 * DIA_MS) } },
      }),
      prisma.ocorrencia.count({
        where: { status: { in: [...STATUS_OCORRENCIA_ABERTOS] }, ordemServico: osAtiva },
      }),
      prisma.etapaProcesso.count({
        where: { status: { in: ['EM_ANDAMENTO', 'PAUSADA'] }, ordemServico: osAtiva },
      }),
      prisma.etapaProcesso.count({
        where: {
          status: { notIn: ['CONCLUIDA', 'DISPENSADA'] },
          previsaoConclusao: { lt: agora },
          ordemServico: osAtiva,
        },
      }),
    ]);

  const porStatus = Object.fromEntries(TODOS_STATUS.map((s) => [s, 0])) as Record<StatusOrdemServico, number>;
  for (const grupo of agrupado) porStatus[grupo.status] = grupo._count._all;

  return {
    porStatus,
    ordensAtivas: TODOS_STATUS.filter((s) => s !== 'ENTREGUE' && s !== 'CANCELADA').reduce(
      (soma, s) => soma + porStatus[s],
      0,
    ),
    ordensAtrasadas: atrasadas,
    entregasProximos7Dias: entregasProximas,
    ocorrenciasAtivas,
    etapasEmCurso,
    etapasAtrasadas,
    geradoEm: agora.toISOString(),
  };
}
