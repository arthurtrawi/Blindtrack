/**
 * Máquina de estados da etapa (RN09–RN18). Funções puras, testáveis sem banco.
 *
 *   PENDENTE ──INICIAR──▶ EM_ANDAMENTO ──CONCLUIR──▶ CONCLUIDA
 *      │                    │    ▲                      │
 *   DISPENSAR            PAUSAR RETOMAR              REABRIR
 *      ▼                    ▼    │                      │
 *   DISPENSADA             PAUSADA      EM_ANDAMENTO ◀──┘
 */
import type { PerfilUsuario, StatusEtapa, TipoDocumento } from '../../generated/prisma/client.js';
import { BusinessRuleError, ForbiddenError } from '../../utils/app-error.js';
import {
  CODIGO_ETAPA_ENTREGA,
  CODIGOS_ETAPAS_SEMPRE_OBRIGATORIAS,
  DOCUMENTOS_OBRIGATORIOS_ENTREGA,
  etapaFinalizada,
} from './constantes.js';

export const ACOES_ETAPA = ['INICIAR', 'PAUSAR', 'RETOMAR', 'CONCLUIR', 'DISPENSAR', 'REABRIR'] as const;
export type AcaoEtapa = (typeof ACOES_ETAPA)[number];

interface RegraTransicao {
  de: readonly StatusEtapa[];
  para: StatusEtapa;
  exigeJustificativa: boolean;
  /** Ação restrita a ADMIN/GESTOR (RN13, RN15). */
  somenteGestao: boolean;
}

export const TRANSICOES_ETAPA: Record<AcaoEtapa, RegraTransicao> = {
  INICIAR: { de: ['PENDENTE'], para: 'EM_ANDAMENTO', exigeJustificativa: false, somenteGestao: false },
  PAUSAR: { de: ['EM_ANDAMENTO'], para: 'PAUSADA', exigeJustificativa: true, somenteGestao: false },
  RETOMAR: { de: ['PAUSADA'], para: 'EM_ANDAMENTO', exigeJustificativa: false, somenteGestao: false },
  CONCLUIR: { de: ['EM_ANDAMENTO'], para: 'CONCLUIDA', exigeJustificativa: false, somenteGestao: false },
  DISPENSAR: { de: ['PENDENTE'], para: 'DISPENSADA', exigeJustificativa: true, somenteGestao: true },
  REABRIR: { de: ['CONCLUIDA'], para: 'EM_ANDAMENTO', exigeJustificativa: true, somenteGestao: true },
};

const PERFIS_GESTAO: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR'];

export interface EtapaContexto {
  id: string;
  codigo: string;
  ordem: number;
  status: StatusEtapa;
  obrigatoria: boolean;
  responsavelId: string | null;
}

export interface ContextoTransicaoEtapa {
  etapa: EtapaContexto;
  /** Todas as etapas da mesma OS (incluindo a própria). */
  etapasDaOrdem: readonly Pick<EtapaContexto, 'id' | 'ordem' | 'status' | 'codigo'>[];
  usuario: { id: string; perfil: PerfilUsuario };
  justificativa?: string;
  /** Ocorrências impeditivas não resolvidas vinculadas à etapa (RN12). */
  ocorrenciasImpeditivasAbertas: number;
}

/**
 * Valida a transição e devolve o novo status. Lança ForbiddenError (perfil) ou
 * BusinessRuleError (regra de negócio, com o código da regra violada).
 */
export function validarTransicaoEtapa(acao: AcaoEtapa, ctx: ContextoTransicaoEtapa): StatusEtapa {
  const regra = TRANSICOES_ETAPA[acao];
  const { etapa, usuario } = ctx;

  if (regra.somenteGestao && !PERFIS_GESTAO.includes(usuario.perfil)) {
    throw new ForbiddenError(`Somente ADMIN ou GESTOR podem executar ${acao} em etapas`);
  }
  // RN16: técnico só altera etapas sob sua responsabilidade.
  if (usuario.perfil === 'TECNICO' && etapa.responsavelId !== usuario.id) {
    throw new ForbiddenError('Técnicos só alteram etapas pelas quais são responsáveis');
  }
  if (!regra.de.includes(etapa.status)) {
    throw new BusinessRuleError(
      `Não é possível executar ${acao} em uma etapa com status ${etapa.status}`,
      'TRANSICAO_INVALIDA',
      { statusAtual: etapa.status, statusPermitidos: regra.de },
    );
  }
  if (regra.exigeJustificativa && !ctx.justificativa?.trim()) {
    throw new BusinessRuleError(`A ação ${acao} exige justificativa`, 'JUSTIFICATIVA_OBRIGATORIA');
  }

  const anteriores = ctx.etapasDaOrdem.filter((e) => e.ordem < etapa.ordem);
  const posteriores = ctx.etapasDaOrdem.filter((e) => e.ordem > etapa.ordem);

  switch (acao) {
    case 'INICIAR': {
      const pendentes = anteriores.filter((e) => !etapaFinalizada(e.status));
      if (pendentes.length > 0) {
        throw new BusinessRuleError('Etapas anteriores ainda não foram concluídas', 'RN09', {
          etapasPendentes: pendentes.map((e) => e.codigo),
        });
      }
      if (!etapa.responsavelId) {
        throw new BusinessRuleError('Defina o responsável antes de iniciar a etapa', 'RN10');
      }
      break;
    }
    case 'RETOMAR':
      if (!etapa.responsavelId) {
        throw new BusinessRuleError('Defina o responsável antes de retomar a etapa', 'RN10');
      }
      break;
    case 'CONCLUIR':
      if (ctx.ocorrenciasImpeditivasAbertas > 0) {
        throw new BusinessRuleError('Há ocorrências impeditivas não resolvidas nesta etapa', 'RN12', {
          ocorrenciasImpeditivasAbertas: ctx.ocorrenciasImpeditivasAbertas,
        });
      }
      break;
    case 'DISPENSAR':
      if (
        etapa.obrigatoria ||
        (CODIGOS_ETAPAS_SEMPRE_OBRIGATORIAS as readonly string[]).includes(etapa.codigo)
      ) {
        throw new BusinessRuleError(
          `A etapa ${etapa.codigo} é obrigatória e não pode ser dispensada`,
          'RN13',
        );
      }
      break;
    case 'REABRIR': {
      if (etapa.codigo === CODIGO_ETAPA_ENTREGA) {
        throw new BusinessRuleError('A etapa de entrega não pode ser reaberta', 'RN15');
      }
      const iniciadas = posteriores.filter((e) => e.status !== 'PENDENTE');
      if (iniciadas.length > 0) {
        throw new BusinessRuleError(
          'Etapas posteriores já saíram de PENDENTE. Registre uma ocorrência de RETRABALHO.',
          'RN15',
          { etapasPosteriores: iniciadas.map((e) => e.codigo) },
        );
      }
      if (!etapa.responsavelId) {
        throw new BusinessRuleError('Defina o responsável antes de reabrir a etapa', 'RN10');
      }
      break;
    }
    case 'PAUSAR':
      break;
  }

  return regra.para;
}

export interface ContextoEntrega {
  etapasDaOrdem: readonly Pick<EtapaContexto, 'codigo' | 'status'>[];
  ocorrenciasAbertasNaOrdem: number;
  tiposDocumentosAprovados: readonly TipoDocumento[];
}

/**
 * RN17: lista o que ainda impede a conclusão da etapa ENTREGA. Vazia = pode entregar.
 * O sistema só confere se as aprovações humanas foram registradas; não decide nada técnico.
 */
export function pendenciasParaEntrega(ctx: ContextoEntrega): string[] {
  const pendencias: string[] = [];

  const etapasAbertas = ctx.etapasDaOrdem.filter(
    (e) => e.codigo !== CODIGO_ETAPA_ENTREGA && !etapaFinalizada(e.status),
  );
  if (etapasAbertas.length > 0) {
    pendencias.push(`Etapas não concluídas: ${etapasAbertas.map((e) => e.codigo).join(', ')}`);
  }
  if (ctx.ocorrenciasAbertasNaOrdem > 0) {
    pendencias.push(`Ocorrências abertas na OS: ${ctx.ocorrenciasAbertasNaOrdem}`);
  }
  const faltando = DOCUMENTOS_OBRIGATORIOS_ENTREGA.filter((t) => !ctx.tiposDocumentosAprovados.includes(t));
  if (faltando.length > 0) {
    pendencias.push(`Documentos obrigatórios sem aprovação: ${faltando.join(', ')}`);
  }
  return pendencias;
}
