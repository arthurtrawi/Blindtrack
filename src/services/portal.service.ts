/**
 * Portal do cliente (RF38, RF39, RN30–RN32). Somente leitura.
 *
 * LGPD e isolamento:
 * - toda consulta filtra por `clienteId` do usuário autenticado;
 * - OS de outro cliente responde 404, não 403, para não revelar que existe (ADR-07);
 * - os campos expostos são escolhidos explicitamente (lista branca). Observações internas,
 *   responsáveis, justificativas e auditoria nunca saem por aqui;
 * - a linha do tempo usa textos padronizados, não a descrição interna do histórico.
 */
import { prisma } from '../config/prisma.js';
import type { StatusEtapa, StatusOcorrencia, StatusOrdemServico } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { ForbiddenError, NotFoundError } from '../utils/app-error.js';
import { paraSkipTake, respostaPaginada, type ParametrosPaginacao } from '../utils/paginacao.js';
import { prazoOrdem } from './domain/prazos.js';
import { ROTULO_STATUS_OS } from './ordem-servico.service.js';

const ROTULO_STATUS_ETAPA: Record<StatusEtapa, string> = {
  PENDENTE: 'Aguardando',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada',
  CONCLUIDA: 'Concluída',
  DISPENSADA: 'Não se aplica',
};

const ROTULO_STATUS_OCORRENCIA: Record<StatusOcorrencia, string> = {
  ABERTA: 'Em análise',
  EM_TRATAMENTO: 'Em tratamento',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Encerrada',
};

function clienteIdDo(ctx: ContextoRequisicao): string {
  // Defesa em profundidade: as rotas já exigem perfil CLIENTE.
  if (ctx.usuario.perfil !== 'CLIENTE' || !ctx.usuario.clienteId) {
    throw new ForbiddenError('Acesso exclusivo do portal do cliente');
  }
  return ctx.usuario.clienteId;
}

function etapaAtual(etapas: { nome: string; status: StatusEtapa }[]): string | null {
  return (
    etapas.find((e) => e.status === 'EM_ANDAMENTO' || e.status === 'PAUSADA')?.nome ??
    etapas.find((e) => e.status === 'PENDENTE')?.nome ??
    null
  );
}

/** Previsão e situação de prazo, sem expor dias de atraso internos além do necessário. */
function prazoParaCliente(ordem: {
  status: StatusOrdemServico;
  previsaoEntrega: Date;
  dataEntrega: Date | null;
}) {
  const prazo = prazoOrdem(ordem);
  return { previsaoEntrega: prazo.previsto, dataEntrega: prazo.realizado, atrasada: prazo.atrasada };
}

export async function minhasOrdens(ctx: ContextoRequisicao, paginacao: ParametrosPaginacao) {
  const clienteId = clienteIdDo(ctx);
  const where = { clienteId };

  const [total, ordens] = await prisma.$transaction([
    prisma.ordemServico.count({ where }),
    prisma.ordemServico.findMany({
      where,
      orderBy: { dataEntrada: 'desc' },
      ...paraSkipTake(paginacao),
      select: {
        id: true,
        numero: true,
        status: true,
        dataEntrada: true,
        previsaoEntrega: true,
        dataEntrega: true,
        veiculo: { select: { placa: true, marca: true, modelo: true, cor: true } },
        etapas: { select: { nome: true, status: true }, orderBy: { ordem: 'asc' } },
      },
    }),
  ]);

  const data = ordens.map(({ etapas, ...o }) => ({
    id: o.id,
    numero: o.numero,
    status: o.status,
    statusDescricao: ROTULO_STATUS_OS[o.status],
    dataEntrada: o.dataEntrada,
    ...prazoParaCliente(o),
    veiculo: o.veiculo,
    etapaAtual: etapaAtual(etapas),
    progresso: {
      concluidas: etapas.filter((e) => e.status === 'CONCLUIDA' || e.status === 'DISPENSADA').length,
      total: etapas.length,
    },
  }));
  return respostaPaginada(data, total, paginacao);
}

function mensagemLinhaDoTempo(evento: {
  tipoEvento: string;
  statusNovo: string;
  statusAnterior: string | null;
  etapaProcesso: { nome: string } | null;
  documento: { nome: string } | null;
  ocorrencia: { descricaoCliente: string | null } | null;
}): string {
  switch (evento.tipoEvento) {
    case 'ORDEM_SERVICO':
      return evento.statusAnterior === null
        ? 'Veículo recebido e ordem de serviço aberta'
        : `Ordem de serviço: ${ROTULO_STATUS_OS[evento.statusNovo as StatusOrdemServico] ?? evento.statusNovo}`;
    case 'ETAPA':
      return `${evento.etapaProcesso?.nome ?? 'Etapa'}: ${ROTULO_STATUS_ETAPA[evento.statusNovo as StatusEtapa] ?? evento.statusNovo}`;
    case 'OCORRENCIA':
      return `${evento.ocorrencia?.descricaoCliente ?? 'Ocorrência'} (${ROTULO_STATUS_OCORRENCIA[evento.statusNovo as StatusOcorrencia] ?? evento.statusNovo})`;
    case 'DOCUMENTO':
      return `Documento ${evento.documento?.nome ?? ''} ${evento.statusNovo === 'APROVADO' ? 'disponível' : 'registrado'}`.trim();
    default:
      return 'Atualização registrada';
  }
}

export async function acompanharOrdem(id: string, ctx: ContextoRequisicao) {
  const clienteId = clienteIdDo(ctx);

  const ordem = await prisma.ordemServico.findFirst({
    where: { id, clienteId },
    select: {
      id: true,
      numero: true,
      status: true,
      dataEntrada: true,
      previsaoEntrega: true,
      dataEntrega: true,
      veiculo: { select: { placa: true, marca: true, modelo: true, cor: true, anoModelo: true } },
      etapas: {
        orderBy: { ordem: 'asc' },
        select: {
          nome: true,
          ordem: true,
          status: true,
          dataInicio: true,
          previsaoConclusao: true,
          dataConclusao: true,
        },
      },
      ocorrencias: {
        where: { visivelCliente: true },
        orderBy: { dataAbertura: 'asc' },
        select: { descricaoCliente: true, status: true, dataAbertura: true, dataResolucao: true },
      },
      documentos: {
        where: { visivelCliente: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, nome: true, tipo: true, createdAt: true },
      },
      historicos: {
        where: { visivelCliente: true },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          tipoEvento: true,
          statusAnterior: true,
          statusNovo: true,
          etapaProcesso: { select: { nome: true } },
          documento: { select: { nome: true } },
          ocorrencia: { select: { descricaoCliente: true } },
        },
      },
    },
  });
  // RN30: OS inexistente e OS de outro cliente recebem a mesma resposta.
  if (!ordem) throw new NotFoundError('Ordem de serviço');

  return {
    id: ordem.id,
    numero: ordem.numero,
    status: ordem.status,
    statusDescricao: ROTULO_STATUS_OS[ordem.status],
    dataEntrada: ordem.dataEntrada,
    ...prazoParaCliente(ordem),
    veiculo: ordem.veiculo,
    etapas: ordem.etapas.map((e) => ({ ...e, statusDescricao: ROTULO_STATUS_ETAPA[e.status] })),
    ocorrencias: ordem.ocorrencias.map((o) => ({
      descricao: o.descricaoCliente,
      status: ROTULO_STATUS_OCORRENCIA[o.status],
      dataAbertura: o.dataAbertura,
      dataResolucao: o.dataResolucao,
    })),
    documentos: ordem.documentos.map((d) => ({
      ...d,
      download: `/api/v1/cliente/documentos/${d.id}/arquivo`,
    })),
    linhaDoTempo: ordem.historicos.map((h) => ({ data: h.createdAt, mensagem: mensagemLinhaDoTempo(h) })),
  };
}
