import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import {
  abrirOrdem,
  criarCliente,
  criarUsuario,
  criarVeiculo,
  type UsuarioTeste,
} from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();

describe.runIf(temBanco)('Usuários — /api/v1/usuarios', () => {
  let admin: UsuarioTeste;

  beforeEach(async () => {
    await limparBanco();
    admin = await criarUsuario('ADMIN');
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it.each(['GESTOR', 'TECNICO', 'ATENDIMENTO'] as const)('nega acesso ao perfil %s (403)', async (perfil) => {
    const usuario = await criarUsuario(perfil);
    const resposta = await request(app).get('/api/v1/usuarios').set(usuario.auth);
    expect(resposta.status).toBe(403);
  });

  it('ADMIN cria usuário: e-mail normalizado, sem hash na resposta, com auditoria', async () => {
    const resposta = await request(app).post('/api/v1/usuarios').set(admin.auth).send({
      nome: 'Novo Técnico',
      email: 'Novo.Tecnico@Teste.Example',
      senha: 'SenhaForte123',
      perfil: 'TECNICO',
    });

    expect(resposta.status).toBe(201);
    expect(resposta.headers['location']).toBe(`/api/v1/usuarios/${resposta.body.data.id}`);
    expect(resposta.body.data).toMatchObject({
      email: 'novo.tecnico@teste.example',
      perfil: 'TECNICO',
      ativo: true,
    });
    expect(resposta.body.data).not.toHaveProperty('senhaHash');

    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { entidadeId: resposta.body.data.id },
    });
    expect(auditoria).toMatchObject({ acao: 'CRIAR', usuarioId: admin.id });
    expect(JSON.stringify(auditoria.dadosNovos)).not.toMatch(/senha/i);
  });

  it('rejeita e-mail duplicado com 409', async () => {
    const existente = await criarUsuario('GESTOR');
    const resposta = await request(app)
      .post('/api/v1/usuarios')
      .set(admin.auth)
      .send({ nome: 'Duplicado', email: existente.email, senha: 'SenhaForte123', perfil: 'TECNICO' });

    expect(resposta.status).toBe(409);
  });

  it('cria usuário de portal vinculado a cliente, e só um por cliente', async () => {
    const cliente = await criarCliente();
    const corpo = {
      nome: 'Cliente Portal',
      senha: 'SenhaForte123',
      perfil: 'CLIENTE',
      clienteId: cliente.id,
    };

    const primeiro = await request(app)
      .post('/api/v1/usuarios')
      .set(admin.auth)
      .send({ ...corpo, email: 'portal1@teste.example' });
    const segundo = await request(app)
      .post('/api/v1/usuarios')
      .set(admin.auth)
      .send({ ...corpo, email: 'portal2@teste.example' });

    expect(primeiro.status).toBe(201);
    expect(primeiro.body.data.clienteId).toBe(cliente.id);
    expect(segundo.status).toBe(409);
  });

  it('lista com paginação e filtro por perfil', async () => {
    await criarUsuario('TECNICO');
    await criarUsuario('TECNICO');
    await criarUsuario('GESTOR');

    const resposta = await request(app).get('/api/v1/usuarios?perfil=TECNICO&pageSize=1').set(admin.auth);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toHaveLength(1);
    expect(resposta.body.meta).toEqual({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
  });

  it('impede o ADMIN de desativar a si mesmo', async () => {
    const resposta = await request(app)
      .patch(`/api/v1/usuarios/${admin.id}`)
      .set(admin.auth)
      .send({ ativo: false });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('AUTO_BLOQUEIO');
  });

  it('impede desativar técnico responsável por etapa em andamento', async () => {
    const tecnico = await criarUsuario('TECNICO');
    const cliente = await criarCliente();
    const veiculo = await criarVeiculo(cliente.id);
    const ordem = await abrirOrdem({ clienteId: cliente.id, veiculoId: veiculo.id, abertaPorId: admin.id });
    await prisma.etapaProcesso.create({
      data: {
        ordemServicoId: ordem.id,
        codigo: 'RECEPCAO',
        nome: 'Recepção',
        ordem: 10,
        status: 'EM_ANDAMENTO',
        responsavelId: tecnico.id,
        dataInicio: new Date(),
      },
    });

    const resposta = await request(app)
      .patch(`/api/v1/usuarios/${tecnico.id}`)
      .set(admin.auth)
      .send({ ativo: false });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.details).toEqual({ etapasEmCurso: 1, ocorrenciasAbertas: 0 });
  });

  it('desativa usuário sem pendências e registra auditoria INATIVAR', async () => {
    const tecnico = await criarUsuario('TECNICO');

    const resposta = await request(app)
      .patch(`/api/v1/usuarios/${tecnico.id}`)
      .set(admin.auth)
      .send({ ativo: false });

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.ativo).toBe(false);
    const auditoria = await prisma.auditoria.findFirstOrThrow({ where: { entidadeId: tecnico.id } });
    expect(auditoria.acao).toBe('INATIVAR');
  });

  it('não converte usuário interno em usuário de portal', async () => {
    const tecnico = await criarUsuario('TECNICO');
    const resposta = await request(app)
      .patch(`/api/v1/usuarios/${tecnico.id}`)
      .set(admin.auth)
      .send({ perfil: 'CLIENTE' });

    expect(resposta.status).toBe(422);
  });

  it('retorna 400 para id malformado e 404 para id inexistente', async () => {
    const malformado = await request(app).get('/api/v1/usuarios/123').set(admin.auth);
    const inexistente = await request(app)
      .get('/api/v1/usuarios/01a206c8-0000-7000-8000-000000000000')
      .set(admin.auth);

    expect(malformado.status).toBe(400);
    expect(inexistente.status).toBe(404);
  });
});
