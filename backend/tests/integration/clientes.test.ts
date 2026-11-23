import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import {
  abrirOrdem,
  CNPJ_ALFANUMERICO_VALIDO,
  CPFS_VALIDOS,
  criarCliente,
  criarUsuario,
  criarVeiculo,
  type UsuarioTeste,
} from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();

const clienteValido = {
  tipoPessoa: 'FISICA',
  nome: 'Maria da Silva',
  cpfCnpj: '529.982.247-25',
  email: 'Maria@Exemplo.Example',
  telefone: '(11) 99999-0000',
  cidade: 'São Paulo',
  uf: 'sp',
};

describe.runIf(temBanco)('Clientes — /api/v1/clientes', () => {
  let atendimento: UsuarioTeste;
  let gestor: UsuarioTeste;

  beforeEach(async () => {
    await limparBanco();
    atendimento = await criarUsuario('ATENDIMENTO');
    gestor = await criarUsuario('GESTOR');
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cadastra cliente com dados normalizados e auditoria', async () => {
    const resposta = await request(app).post('/api/v1/clientes').set(atendimento.auth).send(clienteValido);

    expect(resposta.status).toBe(201);
    expect(resposta.body.data).toMatchObject({
      cpfCnpj: '52998224725',
      email: 'maria@exemplo.example',
      telefone: '11999990000',
      uf: 'SP',
      deletedAt: null,
    });
    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { entidadeId: resposta.body.data.id },
    });
    expect(auditoria).toMatchObject({ entidade: 'Cliente', acao: 'CRIAR', usuarioId: atendimento.id });
  });

  it('cadastra pessoa jurídica com CNPJ alfanumérico', async () => {
    const resposta = await request(app)
      .post('/api/v1/clientes')
      .set(atendimento.auth)
      .send({ ...clienteValido, tipoPessoa: 'JURIDICA', cpfCnpj: '12.ABC.345/01DE-35' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.data.cpfCnpj).toBe(CNPJ_ALFANUMERICO_VALIDO);
  });

  it('rejeita CPF inválido (400) e CPF duplicado (409)', async () => {
    const invalido = await request(app)
      .post('/api/v1/clientes')
      .set(atendimento.auth)
      .send({ ...clienteValido, cpfCnpj: '529.982.247-26' });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.details).toEqual([{ campo: 'cpfCnpj', mensagem: 'CPF/CNPJ inválido' }]);

    await request(app).post('/api/v1/clientes').set(atendimento.auth).send(clienteValido).expect(201);
    const duplicado = await request(app).post('/api/v1/clientes').set(atendimento.auth).send(clienteValido);
    expect(duplicado.status).toBe(409);
  });

  it('TECNICO consulta só dados mínimos com documento mascarado e não cadastra (LGPD)', async () => {
    const tecnico = await criarUsuario('TECNICO');
    const cliente = await criarCliente(CPFS_VALIDOS[0]);

    const lista = await request(app).get('/api/v1/clientes').set(tecnico.auth);
    const detalhe = await request(app).get(`/api/v1/clientes/${cliente.id}`).set(tecnico.auth);
    const criar = await request(app).post('/api/v1/clientes').set(tecnico.auth).send(clienteValido);

    expect(lista.status).toBe(200);
    expect(lista.body.data[0]).toEqual({
      id: cliente.id,
      tipoPessoa: 'FISICA',
      nome: expect.any(String),
      cpfCnpj: '***.982.247-**',
    });
    expect(detalhe.body.data).not.toHaveProperty('email');
    expect(detalhe.body.data).not.toHaveProperty('telefone');
    expect(criar.status).toBe(403);
  });

  it('usuário CLIENTE não acessa o cadastro de clientes', async () => {
    const cliente = await criarCliente();
    const portal = await criarUsuario('CLIENTE', { clienteId: cliente.id });

    const resposta = await request(app).get('/api/v1/clientes').set(portal.auth);
    expect(resposta.status).toBe(403);
  });

  it('lista com filtros por nome (parcial) e documento (com pontuação)', async () => {
    await request(app).post('/api/v1/clientes').set(atendimento.auth).send(clienteValido).expect(201);
    await request(app)
      .post('/api/v1/clientes')
      .set(atendimento.auth)
      .send({ ...clienteValido, nome: 'João Pereira', cpfCnpj: CPFS_VALIDOS[1] })
      .expect(201);

    const porNome = await request(app).get('/api/v1/clientes?nome=maria').set(atendimento.auth);
    const porDocumento = await request(app)
      .get('/api/v1/clientes?documento=123.456.789-09')
      .set(atendimento.auth);

    expect(porNome.status).toBe(200);
    expect(porNome.body.meta.total).toBe(1);
    expect(porNome.body.data[0].nome).toBe('Maria da Silva');
    expect(porDocumento.body.data[0].nome).toBe('João Pereira');
  });

  it('ATENDIMENTO edita contato, mas não corrige CPF; GESTOR corrige', async () => {
    const criado = await request(app).post('/api/v1/clientes').set(atendimento.auth).send(clienteValido);
    const id: string = criado.body.data.id;

    const contato = await request(app)
      .patch(`/api/v1/clientes/${id}`)
      .set(atendimento.auth)
      .send({ telefone: '11988887777', cidade: null });
    expect(contato.status).toBe(200);
    expect(contato.body.data).toMatchObject({ telefone: '11988887777', cidade: null });

    const cpfPorAtendimento = await request(app)
      .patch(`/api/v1/clientes/${id}`)
      .set(atendimento.auth)
      .send({ cpfCnpj: CPFS_VALIDOS[2] });
    expect(cpfPorAtendimento.status).toBe(403);

    const cpfPorGestor = await request(app)
      .patch(`/api/v1/clientes/${id}`)
      .set(gestor.auth)
      .send({ cpfCnpj: CPFS_VALIDOS[2] });
    expect(cpfPorGestor.status).toBe(200);

    const cnpjEmPessoaFisica = await request(app)
      .patch(`/api/v1/clientes/${id}`)
      .set(gestor.auth)
      .send({ cpfCnpj: '11222333000181' });
    expect(cnpjEmPessoaFisica.status).toBe(422);
  });

  it('não inativa cliente com OS não encerrada (RN36)', async () => {
    const cliente = await criarCliente();
    const veiculo = await criarVeiculo(cliente.id);
    await abrirOrdem({ clienteId: cliente.id, veiculoId: veiculo.id, abertaPorId: gestor.id });

    const resposta = await request(app).delete(`/api/v1/clientes/${cliente.id}`).set(gestor.auth);

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('RN36');
  });

  it('inativa cliente (soft delete), desativa o usuário do portal e o oculta das consultas', async () => {
    const cliente = await criarCliente();
    const portal = await criarUsuario('CLIENTE', { clienteId: cliente.id });

    const atendimentoTentando = await request(app)
      .delete(`/api/v1/clientes/${cliente.id}`)
      .set(atendimento.auth);
    expect(atendimentoTentando.status).toBe(403);

    const resposta = await request(app).delete(`/api/v1/clientes/${cliente.id}`).set(gestor.auth);
    expect(resposta.status).toBe(204);

    const registro = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(registro.deletedAt).not.toBeNull();
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: portal.id } })).ativo).toBe(false);

    expect((await request(app).get(`/api/v1/clientes/${cliente.id}`).set(gestor.auth)).status).toBe(404);
    const comInativos = await request(app).get('/api/v1/clientes?incluirInativos=true').set(gestor.auth);
    expect(comInativos.body.meta.total).toBe(1);
    const atendimentoInativos = await request(app)
      .get('/api/v1/clientes?incluirInativos=true')
      .set(atendimento.auth);
    expect(atendimentoInativos.status).toBe(403);
  });

  it('rejeita campos não previstos no corpo (mass assignment)', async () => {
    const resposta = await request(app)
      .post('/api/v1/clientes')
      .set(atendimento.auth)
      .send({ ...clienteValido, deletedAt: '2020-01-01' });

    expect(resposta.status).toBe(400);
  });
});
