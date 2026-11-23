/**
 * Testes de integração da infraestrutura HTTP (Fase 2).
 * Os testes de /health que dependem do banco são ignorados se o PostgreSQL não estiver acessível.
 */
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const app = createApp();

async function bancoDisponivel(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

const temBanco = await bancoDisponivel();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Infraestrutura HTTP', () => {
  it('retorna 404 padronizado para rota inexistente', async () => {
    const resposta = await request(app).get('/api/v1/nao-existe');

    expect(resposta.status).toBe(404);
    expect(resposta.body).toMatchObject({
      error: { code: 'NOT_FOUND', message: expect.any(String), requestId: expect.any(String) },
    });
  });

  it('devolve o cabeçalho X-Request-Id e reaproveita um id válido recebido', async () => {
    const resposta = await request(app).get('/api/v1/nao-existe').set('X-Request-Id', 'teste-1234-abcd');

    expect(resposta.headers['x-request-id']).toBe('teste-1234-abcd');
    expect(resposta.body.error.requestId).toBe('teste-1234-abcd');
  });

  it('rejeita JSON malformado com 400', async () => {
    const resposta = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"invalido":');

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.code).toBe('INVALID_JSON');
  });

  it('aplica cabeçalhos de segurança do Helmet e oculta X-Powered-By', async () => {
    const resposta = await request(app).get('/api/v1/nao-existe');

    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });

  it('não libera CORS para origem não permitida', async () => {
    const resposta = await request(app)
      .get('/api/v1/nao-existe')
      .set('Origin', 'https://site-malicioso.example');

    expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serve a documentação Swagger em /api/v1/docs', async () => {
    const resposta = await request(app).get('/api/v1/docs/');

    expect(resposta.status).toBe(200);
    expect(resposta.text).toContain('swagger-ui');
  });

  it.runIf(temBanco)('GET /api/v1/health retorna 200 com banco disponível', async () => {
    const resposta = await request(app).get('/api/v1/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it.skipIf(temBanco)('GET /api/v1/health retorna 503 com banco indisponível', async () => {
    const resposta = await request(app).get('/api/v1/health');

    expect(resposta.status).toBe(503);
    expect(resposta.body).toMatchObject({ status: 'degraded', database: 'down' });
  });
});
