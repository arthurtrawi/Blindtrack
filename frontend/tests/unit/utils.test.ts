import { describe, expect, it } from 'vitest';
import {
  dataVencida,
  formatarData,
  formatarPlaca,
  mascararPlaca,
  plural,
  primeiroNome,
} from '@/utils/formatacao';
import { caminhoPermitido, rotaInicial } from '@/utils/permissoes';
import { calcularProgresso, indiceEtapaAtual } from '@/utils/progresso';
import { tomOcorrenciaPortal } from '@/utils/status';

const comStatus = (...s: ('PENDENTE' | 'EM_ANDAMENTO' | 'PAUSADA' | 'CONCLUIDA' | 'DISPENSADA')[]) =>
  s.map((status) => ({ status }));

describe('calcularProgresso', () => {
  it('concluídas ÷ aplicáveis (dispensadas não contam)', () => {
    expect(calcularProgresso(comStatus('CONCLUIDA', 'EM_ANDAMENTO', 'DISPENSADA', 'PENDENTE'))).toEqual({
      concluidas: 1,
      aplicaveis: 3,
      percentual: 33,
    });
  });

  it('todas concluídas = 100%; nenhuma etapa = 0% (sem divisão por zero)', () => {
    expect(calcularProgresso(comStatus('CONCLUIDA', 'CONCLUIDA', 'DISPENSADA')).percentual).toBe(100);
    expect(calcularProgresso([]).percentual).toBe(0);
  });

  it('pausada e em andamento não contam como concluídas', () => {
    expect(calcularProgresso(comStatus('PAUSADA', 'EM_ANDAMENTO')).concluidas).toBe(0);
  });
});

describe('indiceEtapaAtual', () => {
  it('em andamento ou pausada; senão a primeira pendente; senão nenhuma', () => {
    expect(indiceEtapaAtual(comStatus('CONCLUIDA', 'PAUSADA', 'PENDENTE'))).toBe(1);
    expect(indiceEtapaAtual(comStatus('CONCLUIDA', 'DISPENSADA', 'PENDENTE'))).toBe(2);
    expect(indiceEtapaAtual(comStatus('CONCLUIDA', 'CONCLUIDA'))).toBe(-1);
  });
});

describe('formatação', () => {
  it('mascara a placa mostrando 3 primeiros e 2 últimos caracteres', () => {
    expect(mascararPlaca('BRA2E19')).toBe('BRA••19');
    expect(mascararPlaca('ABC1234')).toBe('ABC••34');
  });

  it('formata placa antiga com hífen e Mercosul sem', () => {
    expect(formatarPlaca('ABC1234')).toBe('ABC-1234');
    expect(formatarPlaca('BRA2E19')).toBe('BRA2E19');
  });

  it('formata datas em pt-BR e trata ausentes/inválidas', () => {
    expect(formatarData('2026-12-23T12:00:00.000Z')).toBe('23/12/2026');
    expect(formatarData(null)).toBe('—');
    expect(formatarData('não é data')).toBe('—');
  });

  it('detecta data vencida', () => {
    const agora = new Date('2026-11-23T12:00:00Z');
    expect(dataVencida('2026-11-22T12:00:00Z', agora)).toBe(true);
    expect(dataVencida('2026-11-24T12:00:00Z', agora)).toBe(false);
    expect(dataVencida(null, agora)).toBe(false);
  });

  it('extrai o primeiro nome', () => {
    expect(primeiroNome('  Maria Exemplo da Silva ')).toBe('Maria');
  });
});

describe('permissões de navegação', () => {
  it('cada perfil tem sua área e só pode voltar a caminhos dela', () => {
    expect(rotaInicial('CLIENTE')).toBe('/portal');
    expect(rotaInicial('TECNICO')).toBe('/painel');
    expect(caminhoPermitido('CLIENTE', '/portal/ordens/1')).toBe(true);
    expect(caminhoPermitido('CLIENTE', '/painel')).toBe(false);
    expect(caminhoPermitido('GESTOR', '/portalzinho')).toBe(false);
  });
});

describe('situação de ocorrência no portal', () => {
  it('mapeia o texto da API para o tom do badge', () => {
    expect(tomOcorrenciaPortal('Resolvida')).toBe('success');
    expect(tomOcorrenciaPortal('Em análise')).toBe('warning');
    expect(tomOcorrenciaPortal('Em tratamento')).toBe('info');
  });
});

describe('plural', () => {
  it('concorda o substantivo com a quantidade', () => {
    expect(plural(1, 'dia')).toBe('1 dia');
    expect(plural(2, 'dia')).toBe('2 dias');
    expect(plural(0, 'registro')).toBe('0 registros');
  });
});
