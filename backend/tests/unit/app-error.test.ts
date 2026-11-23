import { describe, expect, it } from 'vitest';
import {
  AppError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../src/utils/app-error.js';

describe('AppError', () => {
  it('mapeia cada erro de domínio para o status HTTP correto', () => {
    expect(new ValidationError([]).statusCode).toBe(400);
    expect(new NotFoundError('Cliente').statusCode).toBe(404);
    expect(new ConflictError('duplicado').statusCode).toBe(409);
    expect(new BusinessRuleError('regra').statusCode).toBe(422);
  });

  it('preserva nome da classe, código e detalhes', () => {
    const erro = new BusinessRuleError('Etapa anterior pendente', 'RN09', { etapa: 'DESMONTAGEM' });

    expect(erro).toBeInstanceOf(AppError);
    expect(erro.name).toBe('BusinessRuleError');
    expect(erro.code).toBe('RN09');
    expect(erro.details).toEqual({ etapa: 'DESMONTAGEM' });
  });

  it('gera mensagem de recurso não encontrado', () => {
    expect(new NotFoundError('Ordem de serviço').message).toBe('Ordem de serviço não encontrado(a)');
  });
});
