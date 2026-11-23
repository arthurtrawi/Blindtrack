/**
 * Tratamento global de erros: cada tipo de erro vira o status e o formato padronizados,
 * e erros inesperados NUNCA expõem mensagem interna ou stack trace (RNF16).
 */
import express, { type RequestHandler } from 'express';
import multer from 'multer';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { requestLogger } from '../../src/middlewares/request-logger.js';

/** App mínimo cuja única rota lança o erro informado. */
function appQueLanca(erro: unknown) {
  const app = express();
  app.use(requestLogger);
  app.use(express.json({ limit: '10b' }));
  const handler: RequestHandler = () => {
    throw erro;
  };
  app.all('/erro', handler);
  app.use(errorHandler);
  return app;
}

const erroPrisma = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`Falha interna ${code} em "tabela_secreta"`, {
    code,
    clientVersion: 'teste',
  });

describe('errorHandler', () => {
  it.each([
    ['P2002 (duplicidade)', 'P2002', 409, 'CONFLICT'],
    ['P2025 (registro inexistente)', 'P2025', 404, 'NOT_FOUND'],
    ['P2003 (integridade referencial)', 'P2003', 409, 'CONFLICT'],
  ])('traduz erro do Prisma %s', async (_nome, code, status, codigo) => {
    const resposta = await request(appQueLanca(erroPrisma(code))).get('/erro');

    expect(resposta.status).toBe(status);
    expect(resposta.body.error.code).toBe(codigo);
    expect(JSON.stringify(resposta.body)).not.toContain('tabela_secreta');
  });

  it('erro desconhecido do Prisma vira 500 genérico, sem detalhes internos', async () => {
    const resposta = await request(appQueLanca(erroPrisma('P2010'))).get('/erro');

    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        requestId: expect.any(String),
      },
    });
  });

  it('erro inesperado não expõe mensagem nem stack trace', async () => {
    const resposta = await request(appQueLanca(new Error('senha do banco: hunter2'))).get('/erro');

    expect(resposta.status).toBe(500);
    expect(JSON.stringify(resposta.body)).not.toMatch(/hunter2|stack|at /);
  });

  it('erros do multer: arquivo grande → 413; demais → 400', async () => {
    const grande = await request(appQueLanca(new multer.MulterError('LIMIT_FILE_SIZE', 'arquivo'))).post(
      '/erro',
    );
    const campoErrado = await request(
      appQueLanca(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'foto')),
    ).post('/erro');

    expect(grande.status).toBe(413);
    expect(campoErrado.status).toBe(400);
    expect(campoErrado.body.error).toMatchObject({ code: 'UPLOAD_INVALIDO', details: { campo: 'foto' } });
  });

  it('corpo JSON acima do limite → 413', async () => {
    const resposta = await request(appQueLanca(new Error('não chega aqui')))
      .post('/erro')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ campo: 'valor bem maior que dez bytes' }));

    expect(resposta.status).toBe(413);
    expect(resposta.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
