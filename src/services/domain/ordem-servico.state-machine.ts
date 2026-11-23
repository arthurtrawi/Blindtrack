/**
 * Máquina de estados da OS (RN05–RN08).
 * - Ações manuais (GESTOR/ADMIN): SUSPENDER, RETOMAR, CANCELAR, sempre com justificativa.
 * - Status derivados das etapas (EM_ANDAMENTO, PRONTA_PARA_ENTREGA, ENTREGUE) são
 *   calculados por `statusDerivadoDasEtapas` e aplicados pelo service.
 */
import type { StatusEtapa, StatusOrdemServico } from '../../generated/prisma/client.js';
import { BusinessRuleError } from '../../utils/app-error.js';
import { CODIGO_ETAPA_ENTREGA, etapaFinalizada } from './constantes.js';

export const ACOES_ORDEM = ['SUSPENDER', 'RETOMAR', 'CANCELAR'] as const;
export type AcaoOrdem = (typeof ACOES_ORDEM)[number];

const ORIGENS_PERMITIDAS: Record<AcaoOrdem, readonly StatusOrdemServico[]> = {
  SUSPENDER: ['ABERTA', 'EM_ANDAMENTO', 'PRONTA_PARA_ENTREGA'],
  RETOMAR: ['SUSPENSA'],
  CANCELAR: ['ABERTA', 'EM_ANDAMENTO', 'SUSPENSA', 'PRONTA_PARA_ENTREGA'],
};

type EtapaResumo = { codigo: string; status: StatusEtapa };

/** Status que a OS assume pelo andamento das etapas, desconsiderando suspensão. */
export function statusDerivadoDasEtapas(etapas: readonly EtapaResumo[]): StatusOrdemServico {
  const entrega = etapas.find((e) => e.codigo === CODIGO_ETAPA_ENTREGA);
  if (entrega?.status === 'CONCLUIDA') return 'ENTREGUE';

  const demais = etapas.filter((e) => e.codigo !== CODIGO_ETAPA_ENTREGA);
  if (demais.length > 0 && demais.every((e) => etapaFinalizada(e.status))) {
    return 'PRONTA_PARA_ENTREGA';
  }
  const iniciada = etapas.some(
    (e) => e.status === 'EM_ANDAMENTO' || e.status === 'PAUSADA' || e.status === 'CONCLUIDA',
  );
  return iniciada ? 'EM_ANDAMENTO' : 'ABERTA';
}

/**
 * Recalcula o status após mudanças nas etapas. OS suspensa ou encerrada não muda
 * automaticamente (só por ação manual ou pela conclusão da ENTREGA, tratada no service).
 */
export function recalcularStatusOrdem(
  atual: StatusOrdemServico,
  etapas: readonly EtapaResumo[],
): StatusOrdemServico {
  if (atual === 'SUSPENSA' || atual === 'ENTREGUE' || atual === 'CANCELADA') return atual;
  return statusDerivadoDasEtapas(etapas);
}

/** Valida uma ação manual e devolve o novo status. */
export function validarAcaoOrdem(
  acao: AcaoOrdem,
  atual: StatusOrdemServico,
  etapas: readonly EtapaResumo[],
): StatusOrdemServico {
  if (!ORIGENS_PERMITIDAS[acao].includes(atual)) {
    throw new BusinessRuleError(
      `Não é possível executar ${acao} em uma OS com status ${atual}`,
      atual === 'ENTREGUE' || atual === 'CANCELADA' ? 'RN05' : 'TRANSICAO_INVALIDA',
      { statusAtual: atual, statusPermitidos: ORIGENS_PERMITIDAS[acao] },
    );
  }
  switch (acao) {
    case 'SUSPENDER':
      return 'SUSPENSA';
    case 'CANCELAR':
      return 'CANCELADA';
    case 'RETOMAR':
      return statusDerivadoDasEtapas(etapas);
  }
}
