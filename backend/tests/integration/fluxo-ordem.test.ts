/**
 * Ciclo de vida completo de uma OS, via HTTP, contra o PostgreSQL real.
 * Os passos são sequenciais e compartilham estado (uma única OS do início ao fim).
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
const DIA = 86_400_000;
const daquiDias = (d: number): string => new Date(Date.now() + d * DIA).toISOString();

describe.runIf(temBanco)('Fluxo completo da ordem de serviço', () => {
  let gestor: UsuarioTeste;
  let tecnico: UsuarioTeste;
  let outroTecnico: UsuarioTeste;
  let atendimento: UsuarioTeste;
  let clienteId: string;
  let veiculoId: string;
  let ordemId: string;
  let etapas: Record<string, string>;

  const etapa = (codigo: string): string => {
    const id = etapas[codigo];
    if (!id) throw new Error(`Etapa ${codigo} não encontrada`);
    return id;
  };
  const acao = (codigo: string, corpo: Record<string, unknown>, usuario: UsuarioTeste = tecnico) =>
    request(app)
      .patch(`/api/v1/etapas/${etapa(codigo)}/status`)
      .set(usuario.auth)
      .send(corpo);
  const atribuir = (codigo: string, responsavelId: string) =>
    request(app)
      .patch(`/api/v1/etapas/${etapa(codigo)}/responsavel`)
      .set(gestor.auth)
      .send({ responsavelId });
  const executar = async (codigo: string) => {
    await atribuir(codigo, tecnico.id).expect(200);
    await acao(codigo, { acao: 'INICIAR' }).expect(200);
    return acao(codigo, { acao: 'CONCLUIR' });
  };
  const statusOrdem = async () =>
    (await prisma.ordemServico.findUniqueOrThrow({ where: { id: ordemId } })).status;

  beforeAll(async () => {
    await limparBanco();
    await criarModelosPadrao();
    gestor = await criarUsuario('GESTOR');
    tecnico = await criarUsuario('TECNICO');
    outroTecnico = await criarUsuario('TECNICO');
    atendimento = await criarUsuario('ATENDIMENTO');
    clienteId = (await criarCliente()).id;
    veiculoId = (await criarVeiculo(clienteId)).id;
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RN01: recusa abrir OS com veículo de outro cliente', async () => {
    const outro = await criarCliente('12345678909');
    const resposta = await request(app)
      .post('/api/v1/ordens-servico')
      .set(atendimento.auth)
      .send({ clienteId: outro.id, veiculoId, previsaoEntrega: daquiDias(30) });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('RN01');
  });

  it('abre a OS: número gerado, 8 etapas copiadas do modelo, histórico e auditoria', async () => {
    const resposta = await request(app)
      .post('/api/v1/ordens-servico')
      .set(atendimento.auth)
      .send({ clienteId, veiculoId, previsaoEntrega: daquiDias(30), observacoes: 'Cliente pediu urgência' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.data.numero).toMatch(/^OS-\d{4}-\d{6}$/);
    expect(resposta.body.data.status).toBe('ABERTA');
    expect(resposta.body.data.etapas.map((e: { codigo: string }) => e.codigo)).toEqual([
      'RECEPCAO',
      'DESMONTAGEM',
      'INSTALACAO_MANTA',
      'TROCA_VIDROS',
      'REMONTAGEM',
      'VISTORIA',
      'INSPECAO_FINAL',
      'ENTREGA',
    ]);
    ordemId = resposta.body.data.id;
    etapas = Object.fromEntries(
      resposta.body.data.etapas.map((e: { codigo: string; id: string }) => [e.codigo, e.id]),
    );

    expect(await prisma.historicoStatus.count({ where: { ordemServicoId: ordemId } })).toBe(1);
    expect(await prisma.auditoria.count({ where: { entidadeId: ordemId, acao: 'CRIAR' } })).toBe(1);
  });

  it('RN03: recusa segunda OS para o mesmo veículo', async () => {
    const resposta = await request(app)
      .post('/api/v1/ordens-servico')
      .set(atendimento.auth)
      .send({ clienteId, veiculoId, previsaoEntrega: daquiDias(30) });

    expect(resposta.status).toBe(409);
  });

  it('RN09/RN10: não inicia fora de ordem nem sem responsável', async () => {
    await atribuir('DESMONTAGEM', tecnico.id).expect(200);
    const foraDeOrdem = await acao('DESMONTAGEM', { acao: 'INICIAR' });
    expect(foraDeOrdem.status).toBe(422);
    expect(foraDeOrdem.body.error).toMatchObject({
      code: 'RN09',
      details: { etapasPendentes: ['RECEPCAO'] },
    });

    const semResponsavel = await acao('RECEPCAO', { acao: 'INICIAR' }, gestor);
    expect(semResponsavel.body.error.code).toBe('RN10');
  });

  it('RN16: técnico não altera etapa de outro; ATENDIMENTO e CLIENTE não alteram etapas', async () => {
    await atribuir('RECEPCAO', tecnico.id).expect(200);

    expect((await acao('RECEPCAO', { acao: 'INICIAR' }, outroTecnico)).status).toBe(403);
    expect((await acao('RECEPCAO', { acao: 'INICIAR' }, atendimento)).status).toBe(403);
    const portal = await criarUsuario('CLIENTE', { clienteId });
    expect((await acao('RECEPCAO', { acao: 'INICIAR' }, portal)).status).toBe(403);
  });

  it('inicia a primeira etapa: OS passa a EM_ANDAMENTO automaticamente (RN08)', async () => {
    const resposta = await acao('RECEPCAO', { acao: 'INICIAR' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.data).toMatchObject({ status: 'EM_ANDAMENTO', statusOrdem: 'EM_ANDAMENTO' });
    expect(resposta.body.data.dataInicio).not.toBeNull();
  });

  it('pausa exige justificativa; retomada preserva a data de início (RN11)', async () => {
    const { dataInicio } = await prisma.etapaProcesso.findUniqueOrThrow({ where: { id: etapa('RECEPCAO') } });

    expect((await acao('RECEPCAO', { acao: 'PAUSAR' })).status).toBe(422);
    await acao('RECEPCAO', { acao: 'PAUSAR', justificativa: 'Aguardando cliente assinar checklist' }).expect(
      200,
    );
    await acao('RECEPCAO', { acao: 'RETOMAR' }).expect(200);

    const depois = await prisma.etapaProcesso.findUniqueOrThrow({ where: { id: etapa('RECEPCAO') } });
    expect(depois.dataInicio).toEqual(dataInicio);
  });

  it('conclui a etapa registrando a data de conclusão (RN11)', async () => {
    const resposta = await acao('RECEPCAO', { acao: 'CONCLUIR' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.status).toBe('CONCLUIDA');
    expect(resposta.body.data.dataConclusao).not.toBeNull();
  });

  it('RN15: gestor reabre etapa concluída quando as posteriores estão pendentes', async () => {
    await acao('RECEPCAO', { acao: 'REABRIR', justificativa: 'Fotos de entrada incompletas' }, gestor).expect(
      200,
    );
    const reaberta = await prisma.etapaProcesso.findUniqueOrThrow({ where: { id: etapa('RECEPCAO') } });
    expect(reaberta).toMatchObject({ status: 'EM_ANDAMENTO', dataConclusao: null });

    await acao('RECEPCAO', { acao: 'CONCLUIR' }).expect(200);
  });

  it('RN12/RN23: ocorrência impeditiva bloqueia a conclusão e replaneja a entrega', async () => {
    await executar('DESMONTAGEM').then((r) => expect(r.status).toBe(200));
    await atribuir('INSTALACAO_MANTA', tecnico.id).expect(200);
    await acao('INSTALACAO_MANTA', { acao: 'INICIAR' }).expect(200);

    const aberta = await request(app)
      .post(`/api/v1/ordens-servico/${ordemId}/ocorrencias`)
      .set(gestor.auth)
      .send({
        titulo: 'Manta com defeito de fabricação',
        descricao: 'Lote 4471 com delaminação; fornecedor enviará reposição',
        tipo: 'AGUARDANDO_PECA',
        prioridade: 'ALTA',
        etapaProcessoId: etapa('INSTALACAO_MANTA'),
        usuarioResponsavelId: gestor.id,
        impeditiva: true,
        visivelCliente: true,
        descricaoCliente: 'Aguardando reposição de material pelo fornecedor',
        novaPrevisaoEntrega: daquiDias(40),
      });
    expect(aberta.status).toBe(201);

    const bloqueada = await acao('INSTALACAO_MANTA', { acao: 'CONCLUIR' });
    expect(bloqueada.status).toBe(422);
    expect(bloqueada.body.error.code).toBe('RN12');

    const replanejamento = await prisma.alteracaoPrevisao.findFirstOrThrow({
      where: { ordemServicoId: ordemId },
    });
    expect(replanejamento).toMatchObject({
      ocorrenciaId: aberta.body.data.id,
      justificativa: expect.stringContaining('Manta'),
    });

    const resolvida = await request(app)
      .patch(`/api/v1/ocorrencias/${aberta.body.data.id}`)
      .set(gestor.auth)
      .send({ acao: 'RESOLVER', solucao: 'Novo lote recebido e conferido' });
    expect(resolvida.status).toBe(200);
    expect(resolvida.body.data.dataResolucao).not.toBeNull();

    await acao('INSTALACAO_MANTA', { acao: 'CONCLUIR' }).expect(200);
  });

  it('RN13: dispensa TROCA_VIDROS (gestor), mas nunca VISTORIA', async () => {
    const tecnicoTentando = await acao('TROCA_VIDROS', {
      acao: 'DISPENSAR',
      justificativa: 'Cliente manteve',
    });
    expect(tecnicoTentando.status).toBe(403);

    await acao(
      'TROCA_VIDROS',
      { acao: 'DISPENSAR', justificativa: 'Vidros já blindados de fábrica' },
      gestor,
    ).expect(200);
    const vistoria = await acao(
      'VISTORIA',
      { acao: 'DISPENSAR', justificativa: 'Tentativa indevida' },
      gestor,
    );
    expect(vistoria.body.error.code).toBe('RN13');
  });

  it('com todas as etapas antes da entrega finalizadas, a OS fica PRONTA_PARA_ENTREGA', async () => {
    for (const codigo of ['REMONTAGEM', 'VISTORIA', 'INSPECAO_FINAL']) {
      expect((await executar(codigo)).status).toBe(200);
    }
    expect(await statusOrdem()).toBe('PRONTA_PARA_ENTREGA');
  });

  it('RN17: não conclui a entrega sem os documentos obrigatórios aprovados', async () => {
    await atribuir('ENTREGA', tecnico.id).expect(200);
    await acao('ENTREGA', { acao: 'INICIAR' }).expect(200);

    const resposta = await acao('ENTREGA', { acao: 'CONCLUIR' });
    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('RN17');
    expect(resposta.body.error.details.pendencias).toEqual([
      'Documentos obrigatórios sem aprovação: CONTRATO, CHECKLIST_VISTORIA, DECLARACAO_BLINDAGEM, TERMO_ENTREGA',
    ]);
  });

  it('documentos enviados e aprovados por humano liberam a entrega; OS vira ENTREGUE', async () => {
    for (const tipo of ['CONTRATO', 'CHECKLIST_VISTORIA', 'DECLARACAO_BLINDAGEM', 'TERMO_ENTREGA']) {
      const envio = await request(app)
        .post(`/api/v1/ordens-servico/${ordemId}/documentos`)
        .set(atendimento.auth)
        .field('nome', `Documento ${tipo}`)
        .field('tipo', tipo)
        .field('visivelCliente', 'true')
        .attach('arquivo', PDF_TESTE, {
          filename: `${tipo.toLowerCase()}.pdf`,
          contentType: 'application/pdf',
        });
      expect(envio.status).toBe(201);

      const naoGestor = await request(app)
        .patch(`/api/v1/documentos/${envio.body.data.id}/status`)
        .set(atendimento.auth)
        .send({ status: 'APROVADO' });
      expect(naoGestor.status).toBe(403);

      await request(app)
        .patch(`/api/v1/documentos/${envio.body.data.id}/status`)
        .set(gestor.auth)
        .send({ status: 'APROVADO' })
        .expect(200);
    }

    const entrega = await acao('ENTREGA', { acao: 'CONCLUIR' });
    expect(entrega.status).toBe(200);
    expect(entrega.body.data.statusOrdem).toBe('ENTREGUE');

    const ordem = await prisma.ordemServico.findUniqueOrThrow({ where: { id: ordemId } });
    expect(ordem.status).toBe('ENTREGUE');
    expect(ordem.dataEntrega).not.toBeNull();
  });

  it('RN05: OS entregue não aceita alterações operacionais', async () => {
    const reabrir = await acao('INSPECAO_FINAL', { acao: 'REABRIR', justificativa: 'Teste' }, gestor);
    const ocorrencia = await request(app)
      .post(`/api/v1/ordens-servico/${ordemId}/ocorrencias`)
      .set(gestor.auth)
      .send({
        titulo: 'Tardia',
        descricao: 'Não deveria entrar',
        tipo: 'OUTROS',
        usuarioResponsavelId: gestor.id,
      });
    const cancelar = await request(app)
      .patch(`/api/v1/ordens-servico/${ordemId}/status`)
      .set(gestor.auth)
      .send({ acao: 'CANCELAR', justificativa: 'Tentativa indevida' });

    for (const resposta of [reabrir, ocorrencia, cancelar]) {
      expect(resposta.status).toBe(422);
      expect(resposta.body.error.code).toBe('RN05');
    }
  });

  it('histórico completo e imutável; linha do tempo inclui o replanejamento', async () => {
    const historico = await request(app).get(`/api/v1/ordens-servico/${ordemId}/historico`).set(tecnico.auth);
    expect(historico.status).toBe(200);
    const statusNovos = historico.body.data.map((h: { statusNovo: string }) => h.statusNovo);
    expect(statusNovos[0]).toBe('ABERTA');
    expect(statusNovos.at(-1)).toBe('ENTREGUE');
    expect(historico.body.data.every((h: { usuario: { id: string } }) => h.usuario?.id)).toBe(true);

    const linha = await request(app).get(`/api/v1/ordens-servico/${ordemId}/linha-do-tempo`).set(gestor.auth);
    const replanejamentos = linha.body.data.filter((i: { tipo: string }) => i.tipo === 'REPLANEJAMENTO');
    expect(replanejamentos).toHaveLength(1);
    const datas = linha.body.data.map((i: { data: string }) => new Date(i.data).getTime());
    expect(datas).toEqual([...datas].sort((a, b) => a - b));
  });
});
