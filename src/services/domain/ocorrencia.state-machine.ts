/**
 * Máquina de estados da ocorrência (RN21):
 *   ABERTA → EM_TRATAMENTO → RESOLVIDA
 *   ABERTA | EM_TRATAMENTO → CANCELADA
 * RESOLVIDA e CANCELADA são finais.
 */
import type { StatusOcorrencia } from '../../generated/prisma/client.js';
import { BusinessRuleError } from '../../utils/app-error.js';

export const ACOES_OCORRENCIA = ['INICIAR_TRATAMENTO', 'RESOLVER', 'CANCELAR'] as const;
export type AcaoOcorrencia = (typeof ACOES_OCORRENCIA)[number];

const TRANSICOES: Record<AcaoOcorrencia, { de: readonly StatusOcorrencia[]; para: StatusOcorrencia }> = {
  INICIAR_TRATAMENTO: { de: ['ABERTA'], para: 'EM_TRATAMENTO' },
  RESOLVER: { de: ['ABERTA', 'EM_TRATAMENTO'], para: 'RESOLVIDA' },
  CANCELAR: { de: ['ABERTA', 'EM_TRATAMENTO'], para: 'CANCELADA' },
};

export function ocorrenciaFinalizada(status: StatusOcorrencia): boolean {
  return status === 'RESOLVIDA' || status === 'CANCELADA';
}

export function validarTransicaoOcorrencia(
  acao: AcaoOcorrencia,
  atual: StatusOcorrencia,
  dados: { solucao?: string | undefined; motivo?: string | undefined },
): StatusOcorrencia {
  const regra = TRANSICOES[acao];
  if (!regra.de.includes(atual)) {
    throw new BusinessRuleError(
      `Não é possível aplicar ${acao} a uma ocorrência ${atual}`,
      'TRANSICAO_INVALIDA',
      {
        statusAtual: atual,
        statusPermitidos: regra.de,
      },
    );
  }
  if (acao === 'RESOLVER' && !dados.solucao?.trim()) {
    throw new BusinessRuleError('Informe a solução para resolver a ocorrência', 'RN21');
  }
  if (acao === 'CANCELAR' && !dados.motivo?.trim()) {
    throw new BusinessRuleError('Informe o motivo do cancelamento', 'JUSTIFICATIVA_OBRIGATORIA');
  }
  return regra.para;
}
