/**
 * Cálculo de prazos (RN25, RN27a–c). Funções puras: o atraso é sempre calculado na
 * consulta, nunca armazenado, para não ficar desatualizado (ADR-05).
 */
import type { StatusEtapa, StatusOrdemServico } from '../../generated/prisma/client.js';

const DIA_MS = 24 * 60 * 60 * 1000;

export interface InfoPrazo {
  /** Prazo planejado vigente. */
  previsto: Date | null;
  /** Data real de conclusão/entrega (null enquanto não concluído). */
  realizado: Date | null;
  atrasada: boolean;
  /** Dias completos de atraso (mínimo 1 quando atrasado); 0 quando no prazo. */
  diasAtraso: number;
  /** Realizado − previsto em dias (negativo = adiantado). Null enquanto não concluído. */
  desvioDias: number | null;
}

/**
 * Atrasado = não concluído com previsão vencida, ou concluído depois da previsão.
 * `ignorar` cobre situações em que atraso não se aplica (etapa dispensada, OS cancelada).
 */
export function avaliarPrazo(
  previsto: Date | null,
  realizado: Date | null,
  agora: Date = new Date(),
  ignorar = false,
): InfoPrazo {
  if (!previsto || ignorar) {
    return { previsto, realizado, atrasada: false, diasAtraso: 0, desvioDias: null };
  }
  const referencia = realizado ?? agora;
  const atrasoMs = referencia.getTime() - previsto.getTime();
  return {
    previsto,
    realizado,
    atrasada: atrasoMs > 0,
    diasAtraso: atrasoMs > 0 ? Math.max(1, Math.floor(atrasoMs / DIA_MS)) : 0,
    desvioDias: realizado ? Math.round((realizado.getTime() - previsto.getTime()) / DIA_MS) : null,
  };
}

export function prazoEtapa(
  etapa: { status: StatusEtapa; previsaoConclusao: Date | null; dataConclusao: Date | null },
  agora: Date = new Date(),
): InfoPrazo {
  return avaliarPrazo(etapa.previsaoConclusao, etapa.dataConclusao, agora, etapa.status === 'DISPENSADA');
}

export function prazoOrdem(
  ordem: { status: StatusOrdemServico; previsaoEntrega: Date; dataEntrega: Date | null },
  agora: Date = new Date(),
): InfoPrazo {
  return avaliarPrazo(ordem.previsaoEntrega, ordem.dataEntrega, agora, ordem.status === 'CANCELADA');
}
