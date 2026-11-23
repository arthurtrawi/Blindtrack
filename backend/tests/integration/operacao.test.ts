/**
 * Casos complementares da Fase 4b: prazos e atrasos, suspensão/cancelamento,
 * permissões de ocorrência, segurança do upload e modelo de etapas.
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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

describe.runIf(temBanco)('Operação: prazos, status, ocorrências, uploads e modelo de etapas', () => {
  let gestor: UsuarioTeste;
  let tecnico: UsuarioTeste;
  let ordemId: string;
  let primeiraEtapa: string;

  beforeEach(async () => {
    await limparBanco();
    await criarModelosPadrao();
    gestor = await criarUsuario('GESTOR');
    tecnico = await criarUsuario('TECNICO');
    const cliente = await criarCliente();
    const veiculo = await criarVeiculo(cliente.id);
    const resposta = await request(app)
      .post('/api/v1/ordens-servico')
      .set(gestor.auth)
      .send({
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        previsaoEntrega: new Date(Date.now() + 10 * DIA).toISOString(),
      })
      .expect(201);
    ordemId = resposta.body.data.id;
    primeiraEtapa = resposta.body.data.etapas[0].id;
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe('Prazos (RN25–RN27)', () => {
    it('identifica OS atrasada pelo filtro e pelo indicador calculado', async () => {
      // Simula o tempo passando: a previsão vira passado (direto no banco, sem replanejamento).
      await prisma.ordemServico.update({
        where: { id: ordemId },
        data: {
          dataEntrada: new Date(Date.now() - 20 * DIA),
          previsaoEntrega: new Date(Date.now() - 2 * DIA),
        },
      });

      const atrasadas = await request(app).get('/api/v1/ordens-servico?atrasada=true').set(gestor.auth);
      const emDia = await request(app).get('/api/v1/ordens-servico?atrasada=false').set(gestor.auth);

      expect(atrasadas.body.meta.total).toBe(1);
      expect(atrasadas.body.data[0].prazo).toMatchObject({ atrasada: true, diasAtraso: 2 });
      expect(emDia.body.meta.total).toBe(0);
    });

    it('identifica etapa atrasada e exige justificativa só ao replanejar (RN26)', async () => {
      const definir = await request(app)
        .patch(`/api/v1/etapas/${primeiraEtapa}/prazo`)
        .set(gestor.auth)
        .send({ previsaoConclusao: new Date(Date.now() + DIA).toISOString() });
      expect(definir.status).toBe(200);

      const semJustificativa = await request(app)
        .patch(`/api/v1/etapas/${primeiraEtapa}/prazo`)
        .set(gestor.auth)
        .send({ previsaoConclusao: new Date(Date.now() + 2 * DIA).toISOString() });
      expect(semJustificativa.body.error.code).toBe('RN26');

      await prisma.etapaProcesso.update({
        where: { id: primeiraEtapa },
        data: { previsaoConclusao: new Date(Date.now() - DIA) },
      });
      const etapas = await request(app).get(`/api/v1/ordens-servico/${ordemId}/etapas`).set(tecnico.auth);
      expect(etapas.body.data[0].prazo.atrasada).toBe(true);
      expect(etapas.body.data[1].prazo.atrasada).toBe(false);

      expect(await prisma.alteracaoPrevisao.count({ where: { etapaProcessoId: primeiraEtapa } })).toBe(1);
    });

    it('replaneja a entrega com justificativa e registra valor anterior e novo', async () => {
      const antes = await prisma.ordemServico.findUniqueOrThrow({ where: { id: ordemId } });
      const nova = new Date(Date.now() + 15 * DIA);

      const semJustificativa = await request(app)
        .patch(`/api/v1/ordens-servico/${ordemId}/previsao`)
        .set(gestor.auth)
        .send({ previsaoEntrega: nova.toISOString() });
      expect(semJustificativa.status).toBe(400);

      await request(app)
        .patch(`/api/v1/ordens-servico/${ordemId}/previsao`)
        .set(gestor.auth)
        .send({ previsaoEntrega: nova.toISOString(), justificativa: 'Cliente solicitou acessório extra' })
        .expect(200);

      const registro = await prisma.alteracaoPrevisao.findFirstOrThrow({
        where: { ordemServicoId: ordemId },
      });
      expect(registro.previsaoAnterior).toEqual(antes.previsaoEntrega);
      expect(registro.previsaoNova).toEqual(nova);
    });
  });

  describe('Suspensão e cancelamento (RN07)', () => {
    it('OS suspensa bloqueia etapas; retomada volta ao status derivado', async () => {
      await request(app)
        .patch(`/api/v1/etapas/${primeiraEtapa}/responsavel`)
        .set(gestor.auth)
        .send({ responsavelId: tecnico.id })
        .expect(200);

      const tecnicoSuspendendo = await request(app)
        .patch(`/api/v1/ordens-servico/${ordemId}/status`)
        .set(tecnico.auth)
        .send({ acao: 'SUSPENDER', justificativa: 'Sem autorização' });
      expect(tecnicoSuspendendo.status).toBe(403);

      await request(app)
        .patch(`/api/v1/ordens-servico/${ordemId}/status`)
        .set(gestor.auth)
        .send({ acao: 'SUSPENDER', justificativa: 'Aguardando pagamento da entrada' })
        .expect(200);

      const iniciar = await request(app)
        .patch(`/api/v1/etapas/${primeiraEtapa}/status`)
        .set(tecnico.auth)
        .send({ acao: 'INICIAR' });
      expect(iniciar.body.error.code).toBe('OS_SUSPENSA');

      const retomada = await request(app)
        .patch(`/api/v1/ordens-servico/${ordemId}/status`)
        .set(gestor.auth)
        .send({ acao: 'RETOMAR', justificativa: 'Pagamento confirmado' });
      expect(retomada.body.data.status).toBe('ABERTA');
    });

    it('cancelamento libera o veículo para nova OS (RN03)', async () => {
      const ordem = await prisma.ordemServico.findUniqueOrThrow({ where: { id: ordemId } });
      await request(app)
        .patch(`/api/v1/ordens-servico/${ordemId}/status`)
        .set(gestor.auth)
        .send({ acao: 'CANCELAR', justificativa: 'Cliente desistiu do serviço' })
        .expect(200);

      const nova = await request(app)
        .post('/api/v1/ordens-servico')
        .set(gestor.auth)
        .send({
          clienteId: ordem.clienteId,
          veiculoId: ordem.veiculoId,
          previsaoEntrega: new Date(Date.now() + 30 * DIA).toISOString(),
        });
      expect(nova.status).toBe(201);
      expect(nova.body.data.numero).not.toBe(ordem.numero);
    });
  });

  describe('Ocorrências (RF31, RN19, RN24)', () => {
    async function abrir(responsavelId: string) {
      return request(app).post(`/api/v1/ordens-servico/${ordemId}/ocorrencias`).set(gestor.auth).send({
        titulo: 'Retrabalho na porta',
        descricao: 'Folga na dobradiça',
        tipo: 'RETRABALHO',
        usuarioResponsavelId: responsavelId,
      });
    }

    it('só o responsável (ou gestão) altera; histórico registra cada transição', async () => {
      const outroTecnico = await criarUsuario('TECNICO');
      const ocorrencia = (await abrir(tecnico.id)).body.data;

      const outro = await request(app)
        .patch(`/api/v1/ocorrencias/${ocorrencia.id}`)
        .set(outroTecnico.auth)
        .send({ acao: 'INICIAR_TRATAMENTO' });
      expect(outro.status).toBe(403);

      await request(app)
        .patch(`/api/v1/ocorrencias/${ocorrencia.id}`)
        .set(tecnico.auth)
        .send({ acao: 'INICIAR_TRATAMENTO' })
        .expect(200);
      const semSolucao = await request(app)
        .patch(`/api/v1/ocorrencias/${ocorrencia.id}`)
        .set(tecnico.auth)
        .send({ acao: 'RESOLVER' });
      expect(semSolucao.body.error.code).toBe('RN21');
      await request(app)
        .patch(`/api/v1/ocorrencias/${ocorrencia.id}`)
        .set(tecnico.auth)
        .send({ acao: 'RESOLVER', solucao: 'Dobradiça reforçada e ajustada' })
        .expect(200);

      const finalizada = await request(app)
        .patch(`/api/v1/ocorrencias/${ocorrencia.id}`)
        .set(gestor.auth)
        .send({ prioridade: 'BAIXA' });
      expect(finalizada.body.error.code).toBe('OCORRENCIA_FINALIZADA');

      const eventos = await prisma.historicoStatus.findMany({
        where: { ocorrenciaId: ocorrencia.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(eventos.map((e) => e.statusNovo)).toEqual(['ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA']);
    });

    it('RN19: responsável precisa ser usuário interno ativo', async () => {
      const inativo = await criarUsuario('TECNICO', { ativo: false });
      const resposta = await abrir(inativo.id);
      expect(resposta.body.error.code).toBe('RN19');
    });

    it('ocorrência visível ao cliente exige texto próprio para ele', async () => {
      const resposta = await request(app)
        .post(`/api/v1/ordens-servico/${ordemId}/ocorrencias`)
        .set(gestor.auth)
        .send({
          titulo: 'Atraso',
          descricao: 'Interno',
          tipo: 'ATRASO',
          usuarioResponsavelId: gestor.id,
          visivelCliente: true,
        });
      expect(resposta.status).toBe(400);
    });

    it('somente gestão replaneja a entrega pela ocorrência (RN32 do RF)', async () => {
      const resposta = await request(app)
        .post(`/api/v1/ordens-servico/${ordemId}/ocorrencias`)
        .set(tecnico.auth)
        .send({
          titulo: 'Atraso',
          descricao: 'Peça em falta',
          tipo: 'AGUARDANDO_PECA',
          usuarioResponsavelId: tecnico.id,
          novaPrevisaoEntrega: new Date(Date.now() + 40 * DIA).toISOString(),
        });
      expect(resposta.status).toBe(403);
    });
  });

  describe('Segurança do upload (RNF22)', () => {
    const enviar = (conteudo: Buffer, nomeArquivo: string, contentType: string) =>
      request(app)
        .post(`/api/v1/ordens-servico/${ordemId}/documentos`)
        .set(gestor.auth)
        .field('nome', 'Arquivo de teste')
        .field('tipo', 'OUTRO')
        .attach('arquivo', conteudo, { filename: nomeArquivo, contentType });

    it('rejeita conteúdo não permitido mesmo com extensão e MIME de PDF', async () => {
      const disfarcado = await enviar(
        Buffer.from('<script>alert(1)</script>'),
        'contrato.pdf',
        'application/pdf',
      );
      expect(disfarcado.status).toBe(422);
      expect(disfarcado.body.error.code).toBe('ARQUIVO_INVALIDO');
      expect(await prisma.documento.count()).toBe(0);
    });

    it('rejeita arquivo acima do limite com 413', async () => {
      const grande = Buffer.concat([PDF_TESTE, Buffer.alloc(11 * 1024 * 1024)]);
      const resposta = await enviar(grande, 'grande.pdf', 'application/pdf');
      expect(resposta.status).toBe(413);
    });

    it('sanitiza o nome original e grava hash e tamanho', async () => {
      const resposta = await enviar(PDF_TESTE, '../../etc/passwd.pdf', 'application/pdf');
      expect(resposta.status).toBe(201);
      expect(resposta.body.data).toMatchObject({
        nomeOriginal: 'passwd.pdf',
        mimeType: 'application/pdf',
        tamanhoBytes: PDF_TESTE.length,
        hashSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(resposta.body.data.caminhoArquivo).not.toContain('..');
    });

    it('exige o arquivo e valida os campos do formulário', async () => {
      const semArquivo = await request(app)
        .post(`/api/v1/ordens-servico/${ordemId}/documentos`)
        .set(gestor.auth)
        .field('nome', 'Sem arquivo')
        .field('tipo', 'OUTRO');
      expect(semArquivo.body.error.code).toBe('ARQUIVO_AUSENTE');

      const tipoInvalido = await request(app)
        .post(`/api/v1/ordens-servico/${ordemId}/documentos`)
        .set(gestor.auth)
        .field('nome', 'Tipo errado')
        .field('tipo', 'RG')
        .attach('arquivo', PDF_TESTE, { filename: 'a.pdf', contentType: 'application/pdf' });
      expect(tipoInvalido.status).toBe(400);
    });
  });

  describe('Modelo de etapas (RF23)', () => {
    it('cria etapa nova que vale só para OS futuras', async () => {
      const criada = await request(app)
        .post('/api/v1/modelos-etapa')
        .set(gestor.auth)
        .send({ codigo: 'polimento', nome: 'Polimento', ordem: 55, obrigatoria: false });
      expect(criada.status).toBe(201);
      expect(criada.body.data.codigo).toBe('POLIMENTO');

      const etapasExistentes = await prisma.etapaProcesso.count({ where: { ordemServicoId: ordemId } });
      expect(etapasExistentes).toBe(8);
    });

    it('impede etapa depois da ENTREGA, ordem duplicada e desativar etapa obrigatória', async () => {
      const depoisDaEntrega = await request(app)
        .post('/api/v1/modelos-etapa')
        .set(gestor.auth)
        .send({ codigo: 'POS_ENTREGA', nome: 'Pós-entrega', ordem: 90 });
      expect(depoisDaEntrega.body.error.code).toBe('MODELO_ETAPAS_INVALIDO');

      const ordemDuplicada = await request(app)
        .post('/api/v1/modelos-etapa')
        .set(gestor.auth)
        .send({ codigo: 'OUTRA', nome: 'Outra', ordem: 10 });
      expect(ordemDuplicada.status).toBe(409);

      const vistoria = await prisma.modeloEtapa.findUniqueOrThrow({ where: { codigo: 'VISTORIA' } });
      const desativar = await request(app)
        .patch(`/api/v1/modelos-etapa/${vistoria.id}`)
        .set(gestor.auth)
        .send({ ativo: false });
      expect(desativar.body.error.code).toBe('RN13');
    });

    it('técnico não configura o modelo', async () => {
      const resposta = await request(app).get('/api/v1/modelos-etapa').set(tecnico.auth);
      expect(resposta.status).toBe(403);
    });
  });
});
