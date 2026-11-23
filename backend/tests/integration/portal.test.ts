/**
 * Portal do cliente: isolamento entre clientes (RN30), lista branca de campos (RN31)
 * e ausência de qualquer operação de escrita (RN32).
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
  PDF_TESTE,
  type UsuarioTeste,
} from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();
const OBSERVACAO_INTERNA = 'NOTA-INTERNA: cliente difícil, cobrar adiantado';
const JUSTIFICATIVA_INTERNA = 'JUSTIFICATIVA-INTERNA: técnico faltou';
const DESCRICAO_INTERNA = 'DESCRICAO-INTERNA: fornecedor X atrasou de novo';

describe.runIf(temBanco)('Portal do cliente — /api/v1/cliente', () => {
  let gestor: UsuarioTeste;
  let portalA: UsuarioTeste;
  let portalB: UsuarioTeste;
  let ordemA: string;
  let ordemB: string;
  let documentoVisivel: string;
  let documentoInterno: string;

  beforeAll(async () => {
    await limparBanco();
    await criarModelosPadrao();
    gestor = await criarUsuario('GESTOR');
    const tecnico = await criarUsuario('TECNICO');

    const clienteA = await criarCliente('52998224725');
    const clienteB = await criarCliente('12345678909');
    portalA = await criarUsuario('CLIENTE', { clienteId: clienteA.id });
    portalB = await criarUsuario('CLIENTE', { clienteId: clienteB.id });
    const veiculoA = await criarVeiculo(clienteA.id, 'AAA1A11', '9BWZZZ377VT004251');
    const veiculoB = await criarVeiculo(clienteB.id, 'BBB2B22', '8AJBA3FS5R0123456');

    const abrir = async (clienteId: string, veiculoId: string) =>
      (
        await request(app)
          .post('/api/v1/ordens-servico')
          .set(gestor.auth)
          .send({
            clienteId,
            veiculoId,
            previsaoEntrega: new Date(Date.now() + 20 * 86_400_000).toISOString(),
            observacoes: OBSERVACAO_INTERNA,
          })
          .expect(201)
      ).body.data;

    const osA = await abrir(clienteA.id, veiculoA.id);
    ordemA = osA.id;
    ordemB = (await abrir(clienteB.id, veiculoB.id)).id;

    // Movimenta a OS A: etapa iniciada e pausada com justificativa interna.
    const recepcao = osA.etapas[0].id as string;
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
    await request(app)
      .patch(`/api/v1/etapas/${recepcao}/status`)
      .set(tecnico.auth)
      .send({ acao: 'PAUSAR', justificativa: JUSTIFICATIVA_INTERNA })
      .expect(200);

    // Ocorrência visível (com texto para o cliente) e ocorrência interna.
    const ocorrencia = (visivel: boolean) =>
      request(app)
        .post(`/api/v1/ordens-servico/${ordemA}/ocorrencias`)
        .set(gestor.auth)
        .send({
          titulo: visivel ? 'Atraso de material' : 'Problema interno',
          descricao: DESCRICAO_INTERNA,
          tipo: 'ATRASO',
          usuarioResponsavelId: gestor.id,
          visivelCliente: visivel,
          ...(visivel && { descricaoCliente: 'Material em transporte' }),
        })
        .expect(201);
    await ocorrencia(true);
    await ocorrencia(false);

    const documento = async (visivel: boolean) =>
      (
        await request(app)
          .post(`/api/v1/ordens-servico/${ordemA}/documentos`)
          .set(gestor.auth)
          .field('nome', visivel ? 'Contrato assinado' : 'Planilha de custos')
          .field('tipo', visivel ? 'CONTRATO' : 'OUTRO')
          .field('visivelCliente', String(visivel))
          .attach('arquivo', PDF_TESTE, { filename: 'doc.pdf', contentType: 'application/pdf' })
          .expect(201)
      ).body.data.id as string;
    documentoVisivel = await documento(true);
    documentoInterno = await documento(false);
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('lista somente as OS do próprio cliente, com progresso e etapa atual', async () => {
    const resposta = await request(app).get('/api/v1/cliente/minhas-ordens').set(portalA.auth);

    expect(resposta.status).toBe(200);
    expect(resposta.body.meta.total).toBe(1);
    expect(resposta.body.data[0]).toMatchObject({
      id: ordemA,
      status: 'EM_ANDAMENTO',
      etapaAtual: 'Recepção',
      progresso: { concluidas: 0, total: 8 },
    });
  });

  it('RN30: OS de outro cliente responde 404 (igual a OS inexistente)', async () => {
    const deOutro = await request(app).get(`/api/v1/cliente/ordens/${ordemB}/acompanhar`).set(portalA.auth);
    const inexistente = await request(app)
      .get('/api/v1/cliente/ordens/01a206c8-0000-7000-8000-000000000000/acompanhar')
      .set(portalA.auth);

    expect(deOutro.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(deOutro.body.error.message).toBe(inexistente.body.error.message);
  });

  it('RN31: acompanhamento expõe só dados autorizados (nada interno vaza)', async () => {
    const resposta = await request(app).get(`/api/v1/cliente/ordens/${ordemA}/acompanhar`).set(portalA.auth);
    expect(resposta.status).toBe(200);

    const corpo = JSON.stringify(resposta.body);
    for (const proibido of [
      OBSERVACAO_INTERNA,
      JUSTIFICATIVA_INTERNA,
      DESCRICAO_INTERNA,
      'Problema interno',
      'Planilha de custos',
      'responsavel',
      'observacoes',
      'senhaHash',
      'cpfCnpj',
      'caminhoArquivo',
    ]) {
      expect(corpo, `não deveria conter "${proibido}"`).not.toContain(proibido);
    }

    expect(resposta.body.data.ocorrencias).toEqual([
      expect.objectContaining({ descricao: 'Material em transporte', status: 'Em análise' }),
    ]);
    expect(resposta.body.data.documentos).toHaveLength(1);
    expect(resposta.body.data.linhaDoTempo.map((i: { mensagem: string }) => i.mensagem)).toContain(
      'Recepção: Pausada',
    );
  });

  it('baixa só documento visível da própria OS', async () => {
    const visivel = await request(app)
      .get(`/api/v1/cliente/documentos/${documentoVisivel}/arquivo`)
      .set(portalA.auth);
    expect(visivel.status).toBe(200);
    expect(visivel.headers['content-type']).toContain('application/pdf');
    expect(visivel.headers['content-disposition']).toContain('attachment');

    const interno = await request(app)
      .get(`/api/v1/cliente/documentos/${documentoInterno}/arquivo`)
      .set(portalA.auth);
    const deOutroCliente = await request(app)
      .get(`/api/v1/cliente/documentos/${documentoVisivel}/arquivo`)
      .set(portalB.auth);
    expect(interno.status).toBe(404);
    expect(deOutroCliente.status).toBe(404);
  });

  it('RN32: cliente não acessa rotas internas nem altera nada', async () => {
    const tentativas = await Promise.all([
      request(app).get(`/api/v1/ordens-servico/${ordemA}`).set(portalA.auth),
      request(app).get(`/api/v1/ordens-servico/${ordemA}/historico`).set(portalA.auth),
      request(app).patch(`/api/v1/ordens-servico/${ordemA}`).set(portalA.auth).send({ observacoes: 'x' }),
      request(app).get(`/api/v1/documentos/${documentoInterno}/arquivo`).set(portalA.auth),
    ]);
    for (const resposta of tentativas) expect(resposta.status).toBe(403);
  });

  it('usuários internos não usam o portal', async () => {
    const resposta = await request(app).get('/api/v1/cliente/minhas-ordens').set(gestor.auth);
    expect(resposta.status).toBe(403);
  });
});
