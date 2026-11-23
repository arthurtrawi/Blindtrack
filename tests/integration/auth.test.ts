import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import { criarUsuario, SENHA_TESTE } from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();

describe.runIf(temBanco)('Autenticação — /api/v1/auth', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('faz login com credenciais válidas e devolve token Bearer sem dados sensíveis', async () => {
    const gestor = await criarUsuario('GESTOR');

    const resposta = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: gestor.email.toUpperCase(), senha: SENHA_TESTE });

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toMatchObject({
      tipo: 'Bearer',
      token: expect.any(String),
      expiraEm: expect.any(String),
      usuario: { id: gestor.id, perfil: 'GESTOR' },
    });
    expect(JSON.stringify(resposta.body)).not.toContain('senhaHash');

    const registro = await prisma.usuario.findUniqueOrThrow({ where: { id: gestor.id } });
    expect(registro.ultimoLoginEm).not.toBeNull();
  });

  it('usa a mesma mensagem para senha errada e e-mail inexistente (não revela cadastro)', async () => {
    const gestor = await criarUsuario('GESTOR');

    const senhaErrada = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: gestor.email, senha: 'SenhaErrada999' });
    const emailInexistente = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@teste.example', senha: 'SenhaErrada999' });

    expect(senhaErrada.status).toBe(401);
    expect(emailInexistente.status).toBe(401);
    expect(senhaErrada.body.error.message).toBe(emailInexistente.body.error.message);
  });

  it('recusa login de usuário inativo', async () => {
    const inativo = await criarUsuario('TECNICO', { ativo: false });

    const resposta = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: inativo.email, senha: SENHA_TESTE });

    expect(resposta.status).toBe(401);
  });

  it('valida o corpo do login com 400', async () => {
    const resposta = await request(app).post('/api/v1/auth/login').send({ email: 'invalido' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /me exige token e devolve o usuário autenticado', async () => {
    const tecnico = await criarUsuario('TECNICO');

    const semToken = await request(app).get('/api/v1/auth/me');
    const tokenInvalido = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer abc.def.ghi');
    const comToken = await request(app).get('/api/v1/auth/me').set(tecnico.auth);

    expect(semToken.status).toBe(401);
    expect(tokenInvalido.status).toBe(401);
    expect(comToken.status).toBe(200);
    expect(comToken.body.data).toMatchObject({ id: tecnico.id, perfil: 'TECNICO', clienteId: null });
  });

  it('invalida imediatamente o token de um usuário desativado depois do login', async () => {
    const tecnico = await criarUsuario('TECNICO');
    await prisma.usuario.update({ where: { id: tecnico.id }, data: { ativo: false } });

    const resposta = await request(app).get('/api/v1/auth/me').set(tecnico.auth);

    expect(resposta.status).toBe(401);
  });

  it('altera a própria senha exigindo a senha atual', async () => {
    const atendimento = await criarUsuario('ATENDIMENTO');

    const errada = await request(app)
      .patch('/api/v1/auth/senha')
      .set(atendimento.auth)
      .send({ senhaAtual: 'NaoEhEssa123', novaSenha: 'NovaSenhaForte456' });
    expect(errada.status).toBe(422);

    const certa = await request(app)
      .patch('/api/v1/auth/senha')
      .set(atendimento.auth)
      .send({ senhaAtual: SENHA_TESTE, novaSenha: 'NovaSenhaForte456' });
    expect(certa.status).toBe(204);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: atendimento.email, senha: 'NovaSenhaForte456' });
    expect(login.status).toBe(200);
  });
});
