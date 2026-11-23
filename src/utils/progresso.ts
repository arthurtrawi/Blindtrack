/**
 * Progresso da blindagem a partir das etapas REAIS da OS (nunca valor fixo).
 * Percentual = concluídas ÷ aplicáveis, em que aplicáveis = todas menos as DISPENSADAS
 * ("Não se aplica"), conforme o prompt e o planejamento §5.2.
 */
import type { StatusEtapa } from '@/types/ordemServico';

export interface Progresso {
  concluidas: number;
  aplicaveis: number;
  /** Inteiro de 0 a 100. */
  percentual: number;
}

export function calcularProgresso(etapas: readonly { status: StatusEtapa }[]): Progresso {
  const aplicaveis = etapas.filter((e) => e.status !== 'DISPENSADA').length;
  const concluidas = etapas.filter((e) => e.status === 'CONCLUIDA').length;
  const percentual = aplicaveis === 0 ? 0 : Math.round((concluidas / aplicaveis) * 100);
  return { concluidas, aplicaveis, percentual };
}

/**
 * Índice da etapa atual: a em andamento ou pausada; senão, a primeira pendente;
 * se todas finalizadas, nenhuma (-1). Mesma regra do backend (etapaAtualDe).
 */
export function indiceEtapaAtual(etapas: readonly { status: StatusEtapa }[]): number {
  const emCurso = etapas.findIndex((e) => e.status === 'EM_ANDAMENTO' || e.status === 'PAUSADA');
  if (emCurso >= 0) return emCurso;
  return etapas.findIndex((e) => e.status === 'PENDENTE');
}
