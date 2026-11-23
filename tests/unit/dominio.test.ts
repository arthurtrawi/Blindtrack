/**
 * Regras de domínio puras: máquinas de estado e prazos. Sem banco, sem HTTP.
 */
import { describe, expect, it } from 'vitest';
import type { StatusEtapa } from '../../src/generated/prisma/client.js';
import {
  pendenciasParaEntrega,
  validarTransicaoEtapa,
  type ContextoTransicaoEtapa,
} from '../../src/services/domain/etapa.state-machine.js';
import { validarTransicaoOcorrencia } from '../../src/services/domain/ocorrencia.state-machine.js';
import {
  recalcularStatusOrdem,
  statusDerivadoDasEtapas,
  validarAcaoOrdem,
} from '../../src/services/domain/ordem-servico.state-machine.js';
import { avaliarPrazo, prazoEtapa } from '../../src/services/domain/prazos.js';
import { BusinessRuleError, ForbiddenError } from '../../src/utils/app-error.js';

const CODIGOS = ['RECEPCAO', 'DESMONTAGEM', 'TROCA_VIDROS', 'VISTORIA', 'ENTREGA'];

function etapas(...status: StatusEtapa[]) {
  return status.map((s, i) => ({
    id: `e${i}`,
    codigo: CODIGOS[i] ?? `E${i}`,
    ordem: (i + 1) * 10,
    status: s,
  }));
}

function contexto(
  indice: number,
  lista: ReturnType<typeof etapas>,
  extra: Partial<ContextoTransicaoEtapa> & { responsavelId?: string | null; obrigatoria?: boolean } = {},
): ContextoTransicaoEtapa {
  const alvo = lista[indice];
  if (!alvo) throw new Error(`Etapa de índice ${indice} inexistente no cenário`);
  return {
    etapa: {
      ...alvo,
      obrigatoria: extra.obrigatoria ?? true,
      responsavelId: extra.responsavelId === undefined ? 'tec-1' : extra.responsavelId,
    },
    etapasDaOrdem: lista,
    usuario: extra.usuario ?? { id: 'tec-1', perfil: 'TECNICO' },
    justificativa: extra.justificativa,
    ocorrenciasImpeditivasAbertas: extra.ocorrenciasImpeditivasAbertas ?? 0,
  };
}

/** Captura o erro lançado e devolve seu código. */
function codigoDoErro(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (erro) {
    if (erro instanceof BusinessRuleError || erro instanceof ForbiddenError) return erro.code;
    throw erro;
  }
  return undefined;
}

describe('Máquina de estados da etapa', () => {
  it('inicia a primeira etapa quando há responsável', () => {
    expect(validarTransicaoEtapa('INICIAR', contexto(0, etapas('PENDENTE', 'PENDENTE')))).toBe(
      'EM_ANDAMENTO',
    );
  });

  it('RN09: não inicia etapa com anterior pendente; libera após concluída ou dispensada', () => {
    expect(
      codigoDoErro(() => validarTransicaoEtapa('INICIAR', contexto(1, etapas('PENDENTE', 'PENDENTE')))),
    ).toBe('RN09');
    expect(validarTransicaoEtapa('INICIAR', contexto(1, etapas('CONCLUIDA', 'PENDENTE')))).toBe(
      'EM_ANDAMENTO',
    );
    expect(
      validarTransicaoEtapa(
        'INICIAR',
        contexto(3, etapas('CONCLUIDA', 'CONCLUIDA', 'DISPENSADA', 'PENDENTE')),
      ),
    ).toBe('EM_ANDAMENTO');
  });

  it('RN10: não inicia nem retoma sem responsável', () => {
    const semResponsavel = { responsavelId: null, usuario: { id: 'g', perfil: 'GESTOR' as const } };
    expect(
      codigoDoErro(() => validarTransicaoEtapa('INICIAR', contexto(0, etapas('PENDENTE'), semResponsavel))),
    ).toBe('RN10');
    expect(
      codigoDoErro(() => validarTransicaoEtapa('RETOMAR', contexto(0, etapas('PAUSADA'), semResponsavel))),
    ).toBe('RN10');
  });

  it('RN16: técnico não altera etapa de outro responsável', () => {
    const ctx = contexto(0, etapas('PENDENTE'), { responsavelId: 'tec-2' });
    expect(() => validarTransicaoEtapa('INICIAR', ctx)).toThrow(ForbiddenError);
  });

  it('RN12: não conclui com ocorrência impeditiva aberta', () => {
    const ctx = contexto(0, etapas('EM_ANDAMENTO'), { ocorrenciasImpeditivasAbertas: 1 });
    expect(codigoDoErro(() => validarTransicaoEtapa('CONCLUIR', ctx))).toBe('RN12');
  });

  it('pausar exige justificativa', () => {
    expect(codigoDoErro(() => validarTransicaoEtapa('PAUSAR', contexto(0, etapas('EM_ANDAMENTO'))))).toBe(
      'JUSTIFICATIVA_OBRIGATORIA',
    );
    expect(
      validarTransicaoEtapa(
        'PAUSAR',
        contexto(0, etapas('EM_ANDAMENTO'), { justificativa: 'Falta de energia' }),
      ),
    ).toBe('PAUSADA');
  });

  it('RN13: só gestão dispensa, e só etapa não obrigatória', () => {
    const gestor = {
      usuario: { id: 'g', perfil: 'GESTOR' as const },
      justificativa: 'Cliente manteve vidros',
    };
    const lista = etapas('CONCLUIDA', 'CONCLUIDA', 'PENDENTE', 'PENDENTE');

    expect(() => validarTransicaoEtapa('DISPENSAR', contexto(2, lista, { justificativa: 'x' }))).toThrow(
      ForbiddenError,
    );
    expect(validarTransicaoEtapa('DISPENSAR', contexto(2, lista, { ...gestor, obrigatoria: false }))).toBe(
      'DISPENSADA',
    );
    // VISTORIA é sempre obrigatória, mesmo se marcada como não obrigatória por engano.
    expect(
      codigoDoErro(() =>
        validarTransicaoEtapa('DISPENSAR', contexto(3, lista, { ...gestor, obrigatoria: false })),
      ),
    ).toBe('RN13');
  });

  it('RN15: reabre só se as etapas posteriores estão pendentes', () => {
    const gestor = {
      usuario: { id: 'g', perfil: 'GESTOR' as const },
      justificativa: 'Retrabalho na fixação',
    };
    expect(validarTransicaoEtapa('REABRIR', contexto(0, etapas('CONCLUIDA', 'PENDENTE'), gestor))).toBe(
      'EM_ANDAMENTO',
    );
    expect(
      codigoDoErro(() =>
        validarTransicaoEtapa('REABRIR', contexto(0, etapas('CONCLUIDA', 'EM_ANDAMENTO'), gestor)),
      ),
    ).toBe('RN15');
  });

  it('rejeita transição de status inválida', () => {
    expect(codigoDoErro(() => validarTransicaoEtapa('CONCLUIR', contexto(0, etapas('PENDENTE'))))).toBe(
      'TRANSICAO_INVALIDA',
    );
  });
});

describe('Requisitos de entrega (RN17)', () => {
  const todasConcluidas = [
    { codigo: 'VISTORIA', status: 'CONCLUIDA' as const },
    { codigo: 'TROCA_VIDROS', status: 'DISPENSADA' as const },
    { codigo: 'ENTREGA', status: 'EM_ANDAMENTO' as const },
  ];

  it('sem pendências quando etapas, ocorrências e documentos estão em ordem', () => {
    expect(
      pendenciasParaEntrega({
        etapasDaOrdem: todasConcluidas,
        ocorrenciasAbertasNaOrdem: 0,
        tiposDocumentosAprovados: ['CONTRATO', 'CHECKLIST_VISTORIA', 'DECLARACAO_BLINDAGEM', 'TERMO_ENTREGA'],
      }),
    ).toEqual([]);
  });

  it('lista cada pendência encontrada', () => {
    const pendencias = pendenciasParaEntrega({
      etapasDaOrdem: [{ codigo: 'VISTORIA', status: 'EM_ANDAMENTO' }, ...todasConcluidas.slice(1)],
      ocorrenciasAbertasNaOrdem: 2,
      tiposDocumentosAprovados: ['CONTRATO'],
    });
    expect(pendencias).toEqual([
      'Etapas não concluídas: VISTORIA',
      'Ocorrências abertas na OS: 2',
      'Documentos obrigatórios sem aprovação: CHECKLIST_VISTORIA, DECLARACAO_BLINDAGEM, TERMO_ENTREGA',
    ]);
  });
});

describe('Status da OS', () => {
  const lista = (...s: StatusEtapa[]) =>
    s.map((status, i) => ({ codigo: i === s.length - 1 ? 'ENTREGA' : `E${i}`, status }));

  it('deriva ABERTA, EM_ANDAMENTO, PRONTA_PARA_ENTREGA e ENTREGUE das etapas (RN08)', () => {
    expect(statusDerivadoDasEtapas(lista('PENDENTE', 'PENDENTE'))).toBe('ABERTA');
    expect(statusDerivadoDasEtapas(lista('EM_ANDAMENTO', 'PENDENTE'))).toBe('EM_ANDAMENTO');
    expect(statusDerivadoDasEtapas(lista('CONCLUIDA', 'DISPENSADA', 'PENDENTE'))).toBe('PRONTA_PARA_ENTREGA');
    expect(statusDerivadoDasEtapas(lista('CONCLUIDA', 'CONCLUIDA'))).toBe('ENTREGUE');
  });

  it('não muda automaticamente OS suspensa ou cancelada', () => {
    expect(recalcularStatusOrdem('SUSPENSA', lista('CONCLUIDA', 'PENDENTE'))).toBe('SUSPENSA');
    expect(recalcularStatusOrdem('CANCELADA', lista('CONCLUIDA', 'PENDENTE'))).toBe('CANCELADA');
  });

  it('RETOMAR volta ao status derivado; RN05 impede ações em OS encerrada', () => {
    expect(validarAcaoOrdem('RETOMAR', 'SUSPENSA', lista('EM_ANDAMENTO', 'PENDENTE'))).toBe('EM_ANDAMENTO');
    expect(() => validarAcaoOrdem('CANCELAR', 'ENTREGUE', [])).toThrow(/ENTREGUE/);
    expect(() => validarAcaoOrdem('RETOMAR', 'ABERTA', [])).toThrow(BusinessRuleError);
  });
});

describe('Ocorrências (RN21)', () => {
  it('resolver exige solução; cancelar exige motivo; finais não mudam', () => {
    expect(() => validarTransicaoOcorrencia('RESOLVER', 'ABERTA', {})).toThrow('solução');
    expect(validarTransicaoOcorrencia('RESOLVER', 'EM_TRATAMENTO', { solucao: 'Peça recebida' })).toBe(
      'RESOLVIDA',
    );
    expect(() => validarTransicaoOcorrencia('CANCELAR', 'ABERTA', {})).toThrow('motivo');
    expect(() => validarTransicaoOcorrencia('INICIAR_TRATAMENTO', 'RESOLVIDA', {})).toThrow(
      BusinessRuleError,
    );
  });
});

describe('Prazos (RN25–RN27)', () => {
  const dia = 86_400_000;
  const base = new Date('2026-11-10T12:00:00Z');

  it('não atrasada antes do vencimento', () => {
    expect(avaliarPrazo(new Date(base.getTime() + dia), null, base)).toMatchObject({
      atrasada: false,
      diasAtraso: 0,
    });
  });

  it('atrasada quando vencida e não concluída (dias completos, mínimo 1)', () => {
    const r = avaliarPrazo(new Date(base.getTime() - 1.5 * dia), null, base);
    expect(r).toMatchObject({ atrasada: true, diasAtraso: 1, desvioDias: null });
    expect(avaliarPrazo(new Date(base.getTime() - 3_600_000), null, base).diasAtraso).toBe(1);
  });

  it('concluída depois do previsto continua registrada como atrasada, com desvio real', () => {
    const previsto = new Date(base.getTime() - 5 * dia);
    const realizado = new Date(base.getTime() - 2 * dia);
    expect(avaliarPrazo(previsto, realizado, base)).toMatchObject({
      atrasada: true,
      diasAtraso: 3,
      desvioDias: 3,
    });
  });

  it('concluída antes do previsto tem desvio negativo e não está atrasada', () => {
    const r = avaliarPrazo(new Date(base.getTime() + 2 * dia), base, base);
    expect(r).toMatchObject({ atrasada: false, desvioDias: -2 });
  });

  it('etapa dispensada nunca é considerada atrasada', () => {
    const r = prazoEtapa(
      { status: 'DISPENSADA', previsaoConclusao: new Date(base.getTime() - dia), dataConclusao: null },
      base,
    );
    expect(r.atrasada).toBe(false);
  });
});
