/**
 * Ocorrências (RF29–RF33, RN19–RN24).
 * Uma ocorrência nunca altera nem apaga o histórico da etapa: gera eventos próprios (RN24).
 */
import { prisma, type DbClient } from '../config/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ContextoRequisicao, PerfilUsuario } from '../types/auth.js';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../utils/app-error.js';
import type {
  AbrirOcorrenciaInput,
  AtualizarOcorrenciaInput,
  ListarOcorrenciasQuery,
} from '../validators/ocorrencia.schema.js';
import { diferencas, registrarAuditoria } from './auditoria.service.js';
import { ocorrenciaFinalizada, validarTransicaoOcorrencia } from './domain/ocorrencia.state-machine.js';
import { registrarHistorico } from './historico.service.js';
import { buscarOrdemOperavel, replanejarEntrega } from './ordem-servico.service.js';

const PERFIS_GESTAO: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR'];
const PERFIS_INTERNOS: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO'];

const ocorrenciaInclude = {
  usuarioResponsavel: { select: { id: true, nome: true } },
  abertaPor: { select: { id: true, nome: true } },
  etapaProcesso: { select: { id: true, codigo: true, nome: true } },
} as const satisfies Prisma.OcorrenciaInclude;

/** RN19: o responsável precisa ser um usuário interno ativo. */
async function garantirResponsavelValido(db: DbClient, usuarioId: string): Promise<void> {
  const usuario = await db.usuario.findFirst({
    where: { id: usuarioId, ativo: true, perfil: { in: [...PERFIS_INTERNOS] } },
    select: { id: true },
  });
  if (!usuario) {
    throw new BusinessRuleError('O responsável deve ser um usuário interno ativo', 'RN19');
  }
}

export async function abrirOcorrencia(
  ordemServicoId: string,
  dados: AbrirOcorrenciaInput,
  ctx: ContextoRequisicao,
) {
  if (dados.novaPrevisaoEntrega && !PERFIS_GESTAO.includes(ctx.usuario.perfil)) {
    throw new ForbiddenError('Somente ADMIN ou GESTOR podem replanejar a entrega');
  }

  const id = await prisma.$transaction(async (tx) => {
    // Ocorrências podem ser registradas em OS suspensa (frequentemente são o motivo da suspensão).
    const ordem = await buscarOrdemOperavel(tx, ordemServicoId, { permitirSuspensa: true });
    await garantirResponsavelValido(tx, dados.usuarioResponsavelId);

    if (dados.etapaProcessoId) {
      const etapa = await tx.etapaProcesso.findFirst({
        where: { id: dados.etapaProcessoId, ordemServicoId },
        select: { id: true },
      });
      if (!etapa) throw new BusinessRuleError('A etapa informada não pertence a esta OS', 'ETAPA_INVALIDA');
    }

    const ocorrencia = await tx.ocorrencia.create({
      data: {
        ordemServicoId,
        etapaProcessoId: dados.etapaProcessoId ?? null,
        titulo: dados.titulo,
        descricao: dados.descricao,
        tipo: dados.tipo,
        prioridade: dados.prioridade,
        impeditiva: dados.impeditiva,
        visivelCliente: dados.visivelCliente,
        descricaoCliente: dados.descricaoCliente ?? null,
        usuarioResponsavelId: dados.usuarioResponsavelId,
        abertaPorId: ctx.usuario.id,
      },
    });

    await registrarHistorico(tx, ctx, {
      ordemServicoId,
      etapaProcessoId: ocorrencia.etapaProcessoId,
      ocorrenciaId: ocorrencia.id,
      tipoEvento: 'OCORRENCIA',
      statusAnterior: null,
      statusNovo: 'ABERTA',
      descricao: `Ocorrência aberta (${dados.tipo}, ${dados.prioridade}): ${dados.titulo}`,
      visivelCliente: dados.visivelCliente,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'Ocorrencia',
      entidadeId: ocorrencia.id,
      acao: 'CRIAR',
      depois: ocorrencia,
    });

    // RN23: a ocorrência pode impactar a previsão de entrega.
    if (dados.novaPrevisaoEntrega) {
      await replanejarEntrega(
        tx,
        ctx,
        ordem,
        dados.novaPrevisaoEntrega,
        `Ocorrência: ${dados.titulo}`,
        ocorrencia.id,
      );
    }
    return ocorrencia.id;
  });

  return prisma.ocorrencia.findUniqueOrThrow({ where: { id }, include: ocorrenciaInclude });
}

export async function listarOcorrencias(ordemServicoId: string, query: ListarOcorrenciasQuery) {
  const ordem = await prisma.ordemServico.findUnique({ where: { id: ordemServicoId }, select: { id: true } });
  if (!ordem) throw new NotFoundError('Ordem de serviço');

  return prisma.ocorrencia.findMany({
    where: { ordemServicoId, status: query.status, tipo: query.tipo, prioridade: query.prioridade },
    include: ocorrenciaInclude,
    orderBy: [{ dataAbertura: 'desc' }],
  });
}

export async function atualizarOcorrencia(
  id: string,
  dados: AtualizarOcorrenciaInput,
  ctx: ContextoRequisicao,
) {
  const atual = await prisma.ocorrencia.findUnique({ where: { id } });
  if (!atual) throw new NotFoundError('Ocorrência');

  const gestao = PERFIS_GESTAO.includes(ctx.usuario.perfil);
  // RF31: ADMIN/GESTOR sempre; demais perfis apenas se forem o responsável.
  if (!gestao && atual.usuarioResponsavelId !== ctx.usuario.id) {
    throw new ForbiddenError('Somente o responsável, um GESTOR ou um ADMIN podem alterar esta ocorrência');
  }
  if (dados.usuarioResponsavelId && !gestao) {
    throw new ForbiddenError('Somente ADMIN ou GESTOR podem trocar o responsável');
  }
  if (ocorrenciaFinalizada(atual.status)) {
    throw new BusinessRuleError(
      `Ocorrência ${atual.status.toLowerCase()} não pode ser alterada`,
      'OCORRENCIA_FINALIZADA',
    );
  }
  if ((dados.solucao && dados.acao !== 'RESOLVER') || (dados.motivo && dados.acao !== 'CANCELAR')) {
    throw new BusinessRuleError(
      'solucao acompanha acao=RESOLVER e motivo acompanha acao=CANCELAR',
      'CAMPOS_INCOERENTES',
    );
  }

  const novoStatus = dados.acao ? validarTransicaoOcorrencia(dados.acao, atual.status, dados) : atual.status;

  const visivel = dados.visivelCliente ?? atual.visivelCliente;
  const textoCliente = dados.descricaoCliente === undefined ? atual.descricaoCliente : dados.descricaoCliente;
  if (visivel && !textoCliente) {
    throw new BusinessRuleError(
      'descricaoCliente é obrigatória quando a ocorrência é visível ao cliente',
      'TEXTO_CLIENTE',
    );
  }

  await prisma.$transaction(async (tx) => {
    await buscarOrdemOperavel(tx, atual.ordemServicoId, { permitirSuspensa: true });
    if (dados.usuarioResponsavelId) await garantirResponsavelValido(tx, dados.usuarioResponsavelId);

    const atualizada = await tx.ocorrencia.update({
      where: { id },
      data: {
        titulo: dados.titulo,
        descricao: dados.descricao,
        prioridade: dados.prioridade,
        impeditiva: dados.impeditiva,
        usuarioResponsavelId: dados.usuarioResponsavelId,
        visivelCliente: dados.visivelCliente,
        descricaoCliente: dados.descricaoCliente,
        status: novoStatus,
        ...(novoStatus === 'RESOLVIDA' && { solucao: dados.solucao, dataResolucao: new Date() }),
      },
    });

    if (novoStatus !== atual.status) {
      const detalhe =
        dados.acao === 'RESOLVER'
          ? `: ${dados.solucao}`
          : dados.acao === 'CANCELAR'
            ? `: ${dados.motivo}`
            : '';
      await registrarHistorico(tx, ctx, {
        ordemServicoId: atual.ordemServicoId,
        etapaProcessoId: atual.etapaProcessoId,
        ocorrenciaId: id,
        tipoEvento: 'OCORRENCIA',
        statusAnterior: atual.status,
        statusNovo: novoStatus,
        descricao: `Ocorrência "${atualizada.titulo}" → ${novoStatus}${detalhe}`,
        visivelCliente: atualizada.visivelCliente,
      });
    }

    const { antes, depois } = diferencas(atual, atualizada);
    await registrarAuditoria(tx, ctx, {
      entidade: 'Ocorrencia',
      entidadeId: id,
      acao: novoStatus !== atual.status ? 'ALTERAR_STATUS' : 'ATUALIZAR',
      antes,
      depois: { ...depois, ...(dados.motivo && { motivo: dados.motivo }) },
    });
  });

  return prisma.ocorrencia.findUniqueOrThrow({ where: { id }, include: ocorrenciaInclude });
}
