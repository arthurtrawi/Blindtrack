/**
 * Histórico de status (RN27–RN29) e linha do tempo (RF24–RF26).
 * O histórico é append-only: este service só insere e consulta.
 */
import { prisma, type DbClient } from '../config/prisma.js';
import type { TipoEventoHistorico } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { NotFoundError } from '../utils/app-error.js';

export interface EventoHistorico {
  ordemServicoId: string;
  etapaProcessoId?: string | null;
  ocorrenciaId?: string | null;
  documentoId?: string | null;
  tipoEvento: TipoEventoHistorico;
  statusAnterior: string | null;
  statusNovo: string;
  /** Texto interno (pode conter justificativa). Nunca é exibido no portal do cliente. */
  descricao: string;
  /** Se o evento aparece (com texto padronizado) na linha do tempo do cliente. */
  visivelCliente: boolean;
}

/** Deve ser chamado dentro da transação da alteração que originou o evento (RN29). */
export async function registrarHistorico(
  db: DbClient,
  ctx: ContextoRequisicao,
  evento: EventoHistorico,
): Promise<void> {
  await db.historicoStatus.create({ data: { ...evento, usuarioId: ctx.usuario.id } });
}

async function garantirOrdemExiste(ordemServicoId: string): Promise<void> {
  const existe = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    select: { id: true },
  });
  if (!existe) throw new NotFoundError('Ordem de serviço');
}

export async function listarHistorico(ordemServicoId: string) {
  await garantirOrdemExiste(ordemServicoId);
  return prisma.historicoStatus.findMany({
    where: { ordemServicoId },
    orderBy: { createdAt: 'asc' },
    include: {
      usuario: { select: { id: true, nome: true } },
      etapaProcesso: { select: { id: true, codigo: true, nome: true } },
    },
  });
}

export interface ItemLinhaDoTempo {
  tipo: 'STATUS' | 'REPLANEJAMENTO';
  data: Date;
  descricao: string;
  usuario: { id: string; nome: string };
  detalhes: Record<string, unknown>;
}

/** Histórico + replanejamentos de prazo, em ordem cronológica (RF26). */
export async function linhaDoTempo(ordemServicoId: string): Promise<ItemLinhaDoTempo[]> {
  const historico = await listarHistorico(ordemServicoId);
  const replanejamentos = await prisma.alteracaoPrevisao.findMany({
    where: { ordemServicoId },
    include: {
      usuario: { select: { id: true, nome: true } },
      etapaProcesso: { select: { codigo: true, nome: true } },
    },
  });

  const itens: ItemLinhaDoTempo[] = [
    ...historico.map((h) => ({
      tipo: 'STATUS' as const,
      data: h.createdAt,
      descricao: h.descricao,
      usuario: h.usuario,
      detalhes: {
        tipoEvento: h.tipoEvento,
        statusAnterior: h.statusAnterior,
        statusNovo: h.statusNovo,
        etapa: h.etapaProcesso,
        ocorrenciaId: h.ocorrenciaId,
        documentoId: h.documentoId,
      },
    })),
    ...replanejamentos.map((r) => ({
      tipo: 'REPLANEJAMENTO' as const,
      data: r.createdAt,
      descricao: r.etapaProcesso
        ? `Previsão da etapa ${r.etapaProcesso.nome} alterada`
        : 'Previsão de entrega alterada',
      usuario: r.usuario,
      detalhes: {
        previsaoAnterior: r.previsaoAnterior,
        previsaoNova: r.previsaoNova,
        justificativa: r.justificativa,
        etapa: r.etapaProcesso,
        ocorrenciaId: r.ocorrenciaId,
      },
    })),
  ];

  return itens.sort((a, b) => a.data.getTime() - b.data.getTime());
}
