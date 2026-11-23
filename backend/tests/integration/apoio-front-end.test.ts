/**
 * Endpoints e campos adicionados para o front-end (Fase 4c):
 * P1 indicadores do dashboard, P2 listagem de OS enriquecida, P5 descrição da etapa no
 * portal, P7 lista de responsáveis.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import {
  criarCliente,
  criarModelosPadrao,
  criarUsuario,
  criarVeiculo,
  type UsuarioTeste,
} from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();
const DIA = 86_400_000;

describe.runIf(temBanco)('Apoio ao front-end (Fase 4c)', () => {
  let gestor: UsuarioTeste;
  let tecnico: UsuarioTeste;
  let portal: UsuarioTeste;
  let ordemMaria: { id: string; numero: string };
  let ordemJoao: { id: string; numero: string };

  beforeAll(async () => {
    await limparBanco();
    await criarModelosPadrao();
    await prisma.modeloEtapa.update({
      where: { codigo: 'RECEPCAO' },
      data: { descricao: 'Recebimento do veículo e checklist de entrada.' },
    });

    gestor = await criarUsuario('GESTOR');
    tecnico = await criarUsuario('TECNICO');
    await criarUsuario('TECNICO', { ativo: false });
    await criarUsuario('ATENDIMENTO');

    const maria = await criarCliente('52998224725');
    await prisma.cliente.update({ where: { id: maria.id }, data: { nome: 'Maria Souza' } });
    const joao = await criarCliente('12345678909');
    await prisma.cliente.update({ where: { id: joao.id }, data: { nome: 'João Lima' } });
    portal = await criarUsuario('CLIENTE', { clienteId: maria.id });

    const abrir = async (clienteId: string, placa: string, chassi: string, dias: number) => {
      const veiculo = await criarVeiculo(clienteId, placa, chassi);
      const resposta = await request(app)
        .post('/api/v1/ordens-servico')
        .set(gestor.auth)
        .send({
          clienteId,
          veiculoId: veiculo.id,
          previsaoEntrega: new Date(Date.now() + dias * DIA).toISOString(),
        })
        .expect(201);
      return resposta.body.data as { id: string; numero: string; etapas: { id: string }[] };
    };
    const osMaria = await abrir(maria.id, 'MAR1A11', '9BWZZZ377VT004251', 30);
    const osJoao = await abrir(joao.id, 'JOA2B22', '8AJBA3FS5R0123456', 3);
    ordemMaria = osMaria;
    ordemJoao = osJoao;

    // OS da Maria: Recepção em andamento, com o técnico responsável.
    const recepcao = osMaria.etapas[0]?.id;
    await request(app)
      .patch(`/api/v1/etapas/${recepcao}/responsavel`)
      .set(gestor.auth)
      .send({ responsavelId: tecnico.id })
      .expect(200);
    await request(app)
      .patch(`/api/v1/etapas/${recepcao}/status`)
      .set(tecnico.auth)
      .send({ acao: 'INICIAR' })
      .expect(200);
    // Etapa com previsão vencida (simula o tempo passando) e uma ocorrência aberta.
    await prisma.etapaProcesso.update({
      where: { id: recepcao },
      data: { previsaoConclusao: new Date(Date.now() - DIA) },
    });
    await request(app)
      .post(`/api/v1/ordens-servico/${osMaria.id}/ocorrencias`)
      .set(gestor.auth)
      .send({
        titulo: 'Peça em falta',
        descricao: 'Aguardando fornecedor',
        tipo: 'AGUARDANDO_PECA',
        usuarioResponsavelId: gestor.id,
      })
      .expect(201);
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe('P1 — GET /dashboard/indicadores', () => {
    it('agrega os números reais da operação', async () => {
      const resposta = await request(app).get('/api/v1/dashboard/indicadores').set(tecnico.auth).expect(200);

      expect(resposta.body.data).toMatchObject({
        porStatus: {
          ABERTA: 1,
          EM_ANDAMENTO: 1,
          SUSPENSA: 0,
          PRONTA_PARA_ENTREGA: 0,
          ENTREGUE: 0,
          CANCELADA: 0,
        },
        ordensAtivas: 2,
        ordensAtrasadas: 0,
        entregasProximos7Dias: 1, // a OS do João vence em 3 dias
        ocorrenciasAtivas: 1,
        etapasEmCurso: 1,
        etapasAtrasadas: 1,
        geradoEm: expect.any(String),
      });
    });

    it('cliente não acessa o dashboard interno', async () => {
      await request(app).get('/api/v1/dashboard/indicadores').set(portal.auth).expect(403);
    });
  });

  describe('P2 — GET /ordens-servico enriquecida', () => {
    it('traz a etapa atual com o responsável', async () => {
      const resposta = await request(app).get('/api/v1/ordens-servico').set(gestor.auth).expect(200);
      const maria = resposta.body.data.find((o: { id: string }) => o.id === ordemMaria.id);
      const joao = resposta.body.data.find((o: { id: string }) => o.id === ordemJoao.id);

      expect(maria.etapaAtual).toEqual({
        nome: 'Recepção',
        status: 'EM_ANDAMENTO',
        responsavel: { id: tecnico.id, nome: expect.any(String) },
      });
      expect(joao.etapaAtual).toEqual({ nome: 'Recepção', status: 'PENDENTE', responsavel: null });
      expect(maria).not.toHaveProperty('etapas');
    });

    it('busca por nome do cliente, sem diferenciar maiúsculas', async () => {
      const resposta = await request(app)
        .get('/api/v1/ordens-servico?cliente=maria')
        .set(gestor.auth)
        .expect(200);
      expect(resposta.body.data.map((o: { id: string }) => o.id)).toEqual([ordemMaria.id]);
    });

    it('ordena por previsão de entrega e por número, nas duas direções', async () => {
      const porPrevisao = await request(app)
        .get('/api/v1/ordens-servico?ordenarPor=previsaoEntrega&direcao=asc')
        .set(gestor.auth)
        .expect(200);
      expect(porPrevisao.body.data.map((o: { id: string }) => o.id)).toEqual([ordemJoao.id, ordemMaria.id]);

      const porNumero = await request(app)
        .get('/api/v1/ordens-servico?ordenarPor=numero&direcao=desc')
        .set(gestor.auth)
        .expect(200);
      const numeros = porNumero.body.data.map((o: { numero: string }) => o.numero);
      expect(numeros).toEqual([...numeros].sort().reverse());
    });

    it('rejeita campo de ordenação não permitido', async () => {
      await request(app).get('/api/v1/ordens-servico?ordenarPor=senhaHash').set(gestor.auth).expect(400);
    });
  });

  describe('P5 — descrição da etapa no portal', () => {
    it('o cliente recebe a descrição institucional da etapa', async () => {
      const resposta = await request(app)
        .get(`/api/v1/cliente/ordens/${ordemMaria.id}/acompanhar`)
        .set(portal.auth)
        .expect(200);

      expect(resposta.body.data.etapas[0]).toMatchObject({
        nome: 'Recepção',
        descricao: 'Recebimento do veículo e checklist de entrada.',
      });
      expect(resposta.body.data.etapas[0]).not.toHaveProperty('responsavel');
    });
  });

  describe('P7 — GET /usuarios/responsaveis', () => {
    it('GESTOR obtém só TECNICO e GESTOR ativos, com dados mínimos', async () => {
      const resposta = await request(app).get('/api/v1/usuarios/responsaveis').set(gestor.auth).expect(200);

      const perfis = resposta.body.data.map((u: { perfil: string }) => u.perfil).sort();
      expect(perfis).toEqual(['GESTOR', 'TECNICO']); // o técnico inativo e o atendimento ficam fora
      for (const usuario of resposta.body.data) {
        expect(Object.keys(usuario).sort()).toEqual(['id', 'nome', 'perfil']);
      }
    });

    it('GESTOR continua sem acesso ao cadastro completo de usuários', async () => {
      await request(app).get('/api/v1/usuarios').set(gestor.auth).expect(403);
    });

    it('TECNICO não lista responsáveis', async () => {
      await request(app).get('/api/v1/usuarios/responsaveis').set(tecnico.auth).expect(403);
    });
  });
});
