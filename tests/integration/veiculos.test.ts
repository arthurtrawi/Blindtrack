import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import {
  abrirOrdem,
  CPFS_VALIDOS,
  criarCliente,
  criarUsuario,
  criarVeiculo,
  type UsuarioTeste,
} from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();

describe.runIf(temBanco)('Veículos — /api/v1/veiculos', () => {
  let atendimento: UsuarioTeste;
  let clienteId: string;

  const veiculoValido = () => ({
    placa: 'bra-2e19',
    chassi: '9bwzzz377vt004251',
    marca: 'Toyota',
    modelo: 'Corolla Cross',
    anoFabricacao: 2025,
    anoModelo: 2026,
    cor: 'Preto',
    clienteId,
  });

  beforeEach(async () => {
    await limparBanco();
    atendimento = await criarUsuario('ATENDIMENTO');
    clienteId = (await criarCliente()).id;
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cadastra veículo com placa e chassi normalizados e devolve o proprietário', async () => {
    const resposta = await request(app).post('/api/v1/veiculos').set(atendimento.auth).send(veiculoValido());

    expect(resposta.status).toBe(201);
    expect(resposta.body.data).toMatchObject({
      placa: 'BRA2E19',
      chassi: '9BWZZZ377VT004251',
      cliente: { id: clienteId },
    });
    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { entidadeId: resposta.body.data.id },
    });
    expect(auditoria).toMatchObject({ entidade: 'Veiculo', acao: 'CRIAR' });
  });

  it('rejeita placa e chassi duplicados com 409 e mensagem específica', async () => {
    await request(app).post('/api/v1/veiculos').set(atendimento.auth).send(veiculoValido()).expect(201);

    const placaDuplicada = await request(app)
      .post('/api/v1/veiculos')
      .set(atendimento.auth)
      .send({ ...veiculoValido(), chassi: '8AJBA3FS5R0123456' });
    const chassiDuplicado = await request(app)
      .post('/api/v1/veiculos')
      .set(atendimento.auth)
      .send({ ...veiculoValido(), placa: 'XYZ9876' });

    expect(placaDuplicada.status).toBe(409);
    expect(placaDuplicada.body.error.message).toBe('Placa já cadastrada');
    expect(chassiDuplicado.status).toBe(409);
    expect(chassiDuplicado.body.error.message).toBe('Chassi já cadastrado');
  });

  it('rejeita veículo de cliente inativado', async () => {
    await prisma.cliente.update({ where: { id: clienteId }, data: { deletedAt: new Date() } });

    const resposta = await request(app).post('/api/v1/veiculos').set(atendimento.auth).send(veiculoValido());

    expect(resposta.status).toBe(422);
  });

  it('TECNICO consulta e filtra por prefixo de placa, mas não cadastra', async () => {
    const tecnico = await criarUsuario('TECNICO');
    await criarVeiculo(clienteId, 'ABC1234', '8AJBA3FS5R0123456');
    await criarVeiculo(clienteId, 'XYZ9876', '9BWZZZ377VT004251');

    const lista = await request(app).get('/api/v1/veiculos?placa=abc-1').set(tecnico.auth);
    const criar = await request(app).post('/api/v1/veiculos').set(tecnico.auth).send(veiculoValido());

    expect(lista.status).toBe(200);
    expect(lista.body.meta.total).toBe(1);
    expect(lista.body.data[0].placa).toBe('ABC1234');
    expect(criar.status).toBe(403);
  });

  it('valida a coerência dos anos considerando o valor já gravado no PATCH', async () => {
    const veiculo = await criarVeiculo(clienteId); // fabricação 2025, modelo 2026

    const resposta = await request(app)
      .patch(`/api/v1/veiculos/${veiculo.id}`)
      .set(atendimento.auth)
      .send({ anoFabricacao: 2022 });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('ANOS_INCOERENTES');
  });

  it('bloqueia troca de proprietário com OS ativa (RF12) e permite sem OS ativa', async () => {
    const gestor = await criarUsuario('GESTOR');
    const novoDono = await criarCliente(CPFS_VALIDOS[1]);
    const veiculo = await criarVeiculo(clienteId);
    const ordem = await abrirOrdem({ clienteId, veiculoId: veiculo.id, abertaPorId: gestor.id });

    const bloqueada = await request(app)
      .patch(`/api/v1/veiculos/${veiculo.id}`)
      .set(atendimento.auth)
      .send({ clienteId: novoDono.id });
    expect(bloqueada.status).toBe(422);
    expect(bloqueada.body.error.code).toBe('RF12');

    await prisma.ordemServico.update({ where: { id: ordem.id }, data: { status: 'CANCELADA' } });

    const permitida = await request(app)
      .patch(`/api/v1/veiculos/${veiculo.id}`)
      .set(atendimento.auth)
      .send({ clienteId: novoDono.id });
    expect(permitida.status).toBe(200);
    expect(permitida.body.data.cliente.id).toBe(novoDono.id);

    // A OS antiga continua do cliente original (registro histórico).
    const ordemAntiga = await prisma.ordemServico.findUniqueOrThrow({ where: { id: ordem.id } });
    expect(ordemAntiga.clienteId).toBe(clienteId);

    const auditoria = await prisma.auditoria.findFirstOrThrow({
      where: { entidadeId: veiculo.id, acao: 'ATUALIZAR' },
    });
    expect(auditoria.dadosAnteriores).toEqual({ clienteId, updatedAt: expect.any(String) });
  });
});
