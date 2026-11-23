/**
 * Sessão por cookie HttpOnly para o front-end (ADR-26): atributos do cookie, token fora
 * do corpo quando a requisição vem do app, proteção CSRF, logout e CORS com credenciais.
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import { criarUsuario, SENHA_TESTE, type UsuarioTeste } from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();
const APP = { 'X-Requested-With': 'BlindTrack' };
const ORIGEM_PERMITIDA = 'http://localhost:5173';

function cookieDeSessao(resposta: request.Response): string {
  const cabecalho = resposta.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cabecalho?.find((c) => c.startsWith('bt_sessao='));
  if (!cookie) throw new Error('Cookie bt_sessao não definido');
  return cookie;
}

describe.runIf(temBanco)('Sessão por cookie HttpOnly', () => {
  let atendimento: UsuarioTeste;

  beforeEach(async () => {
    await limparBanco();
    atendimento = await criarUsuario('ATENDIMENTO');
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('login define cookie HttpOnly, SameSite=Strict, restrito a /api', async () => {
    const resposta = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: atendimento.email, senha: SENHA_TESTE })
      .expect(200);

    const cookie = cookieDeSessao(resposta);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/);
    expect(cookie).toMatch(/Expires=/);
    // Fora de produção não exige HTTPS; em produção o atributo Secure é adicionado.
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('sem o cabeçalho do app, o token vem no corpo (Swagger, curl)', async () => {
    const resposta = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: atendimento.email, senha: SENHA_TESTE })
      .expect(200);

    expect(resposta.body.data).toMatchObject({ tipo: 'Bearer', token: expect.any(String) });
  });

  it('com o cabeçalho do app, o token NÃO vem no corpo (só no cookie)', async () => {
    const resposta = await request(app)
      .post('/api/v1/auth/login')
      .set(APP)
      .send({ email: atendimento.email, senha: SENHA_TESTE })
      .expect(200);

    expect(resposta.body.data).not.toHaveProperty('token');
    expect(resposta.body.data).toMatchObject({ tipo: 'Cookie', usuario: { id: atendimento.id } });
    expect(JSON.stringify(resposta.body)).not.toMatch(/eyJ/); // nenhum JWT no corpo
    cookieDeSessao(resposta);
  });

  it('o cookie autentica leituras; escritas exigem o cabeçalho anti-CSRF', async () => {
    const navegador = request.agent(app);
    await navegador
      .post('/api/v1/auth/login')
      .set(APP)
      .send({ email: atendimento.email, senha: SENHA_TESTE });

    await navegador.get('/api/v1/auth/me').expect(200);

    const cliente = {
      tipoPessoa: 'FISICA',
      nome: 'Cliente via Cookie',
      cpfCnpj: '52998224725',
      email: 'cookie@teste.example',
      telefone: '11999990000',
    };
    const semCabecalho = await navegador.post('/api/v1/clientes').send(cliente);
    expect(semCabecalho.status).toBe(403);
    expect(semCabecalho.body.error.code).toBe('CSRF_BLOQUEADO');
    expect(await prisma.cliente.count()).toBe(0);

    await navegador.post('/api/v1/clientes').set(APP).send(cliente).expect(201);
  });

  it('Bearer continua funcionando e não exige o cabeçalho do app', async () => {
    const resposta = await request(app).post('/api/v1/clientes').set(atendimento.auth).send({
      tipoPessoa: 'FISICA',
      nome: 'Cliente via Bearer',
      cpfCnpj: '12345678909',
      email: 'bearer@teste.example',
      telefone: '11999990000',
    });
    expect(resposta.status).toBe(201);
  });

  it('logout apaga o cookie e encerra a sessão do navegador', async () => {
    const navegador = request.agent(app);
    await navegador
      .post('/api/v1/auth/login')
      .set(APP)
      .send({ email: atendimento.email, senha: SENHA_TESTE });
    await navegador.get('/api/v1/auth/me').expect(200);

    const saida = await navegador.post('/api/v1/auth/logout').set(APP).expect(204);
    expect(cookieDeSessao(saida)).toMatch(/Expires=Thu, 01 Jan 1970/);

    await navegador.get('/api/v1/auth/me').expect(401);
  });

  it('logout é idempotente: funciona sem sessão', async () => {
    await request(app).post('/api/v1/auth/logout').expect(204);
  });

  it('trocar a senha apaga o cookie da sessão atual', async () => {
    const navegador = request.agent(app);
    await navegador
      .post('/api/v1/auth/login')
      .set(APP)
      .send({ email: atendimento.email, senha: SENHA_TESTE });

    const troca = await navegador
      .patch('/api/v1/auth/senha')
      .set(APP)
      .send({ senhaAtual: SENHA_TESTE, novaSenha: 'NovaSenhaForte456' })
      .expect(204);

    expect(cookieDeSessao(troca)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('CORS: origem permitida recebe credenciais e o cabeçalho do app; outra origem não', async () => {
    const permitida = await request(app)
      .options('/api/v1/clientes')
      .set('Origin', ORIGEM_PERMITIDA)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-requested-with');

    expect(permitida.headers['access-control-allow-origin']).toBe(ORIGEM_PERMITIDA);
    expect(permitida.headers['access-control-allow-credentials']).toBe('true');
    expect(String(permitida.headers['access-control-allow-headers'])).toMatch(/X-Requested-With/i);

    const outra = await request(app)
      .options('/api/v1/clientes')
      .set('Origin', 'https://site-malicioso.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(outra.headers['access-control-allow-origin']).toBeUndefined();
  });
});
