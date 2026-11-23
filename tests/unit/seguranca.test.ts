/**
 * Testes unitários de peças de segurança: limite de login, sanitização da auditoria e JWT.
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { criarLimiteLogin } from '../../src/middlewares/rate-limit.js';
import { requestLogger } from '../../src/middlewares/request-logger.js';
import { gerarToken, verificarToken } from '../../src/services/auth.service.js';
import { UnauthorizedError } from '../../src/utils/app-error.js';
import { paraJsonAuditoria } from '../../src/utils/json.js';

describe('limite de tentativas de login', () => {
  it('bloqueia com 429 após exceder o limite de falhas', async () => {
    const app = express();
    app.use(requestLogger);
    app.post('/login', criarLimiteLogin({ max: 2, janelaMinutos: 1 }), (_req, res) => {
      res.status(401).json({});
    });
    app.use(errorHandler);

    await request(app).post('/login').expect(401);
    await request(app).post('/login').expect(401);
    const bloqueado = await request(app).post('/login');

    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('sanitização da auditoria (LGPD)', () => {
  it('remove senha, hash e token, inclusive em objetos aninhados', () => {
    const json = paraJsonAuditoria({
      nome: 'Fulano',
      senhaHash: '$2b$...',
      senha: 'segredo',
      aninhado: { token: 'abc', ok: 1 },
      data: new Date('2026-01-01T00:00:00Z'),
    });

    expect(json).toEqual({ nome: 'Fulano', aninhado: { ok: 1 }, data: '2026-01-01T00:00:00.000Z' });
  });
});

describe('JWT', () => {
  const usuario = { id: '01a206c8-1cc1-759a-8e13-ca9a3d8f8864', perfil: 'GESTOR' as const };

  it('gera token verificável com sub e perfil', () => {
    const { token, expiraEm } = gerarToken(usuario);
    expect(verificarToken(token)).toEqual({
      sub: usuario.id,
      perfil: 'GESTOR',
      emitidoEm: expect.any(Number),
    });
    expect(expiraEm.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejeita token assinado com outro segredo', () => {
    const falso = jwt.sign({ perfil: 'ADMIN' }, 'outro-segredo-com-pelo-menos-32-caracteres!!', {
      subject: usuario.id,
      issuer: 'blindtrack-api',
      audience: 'blindtrack',
    });
    expect(() => verificarToken(falso)).toThrow(UnauthorizedError);
  });

  it('rejeita token sem assinatura (alg "none")', () => {
    const semAssinatura = jwt.sign({ perfil: 'ADMIN', sub: usuario.id }, '', { algorithm: 'none' });
    expect(() => verificarToken(semAssinatura)).toThrow('Token inválido');
  });

  it('informa token expirado', () => {
    const expirado = jwt.sign({ perfil: 'GESTOR' }, env.JWT_SECRET, {
      subject: usuario.id,
      issuer: 'blindtrack-api',
      audience: 'blindtrack',
      expiresIn: -10,
    });
    expect(() => verificarToken(expirado)).toThrow('Token expirado');
  });
});

describe('máscara de dados pessoais nos logs HTTP (LGPD)', () => {
  it('mascara parâmetros sensíveis da URL e preserva os demais', async () => {
    const { mascararUrl } = await import('../../src/middlewares/request-logger.js');

    expect(mascararUrl('/api/v1/clientes?documento=529.982.247-25&page=2&email=a%40b.com')).toBe(
      '/api/v1/clientes?documento=[REDACTED]&page=2&email=[REDACTED]',
    );
    expect(mascararUrl('/api/v1/veiculos?placa=ABC1234&placa=XYZ9876')).toBe(
      '/api/v1/veiculos?placa=[REDACTED]',
    );
    expect(mascararUrl('/api/v1/ordens-servico?status=ABERTA')).toBe('/api/v1/ordens-servico?status=ABERTA');
    expect(mascararUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('mascara o objeto de query', async () => {
    const { mascararQuery } = await import('../../src/middlewares/request-logger.js');
    expect(mascararQuery({ nome: 'Maria', status: 'ABERTA' })).toEqual({
      nome: '[REDACTED]',
      status: 'ABERTA',
    });
  });
});
