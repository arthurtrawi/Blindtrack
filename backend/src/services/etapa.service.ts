/**
 * Etapas do processo (RF18–RF22, RN09–RN18).
 * Toda mudança de status gera histórico e auditoria e ressincroniza o status da OS,
 * tudo na mesma transação (RN29).
 */
import { prisma } from '../config/prisma.js';
import type { PerfilUsuario } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../utils/app-error.js';
import type {
  AlterarPrazoEtapaInput,
  AlterarStatusEtapaInput,
  AtribuirResponsavelInput,
} from '../validators/etapa.schema.js';
import { registrarAuditoria } from './auditoria.service.js';
import {
  CODIGO_ETAPA_ENTREGA,
  DOCUMENTOS_OBRIGATORIOS_ENTREGA,
  etapaFinalizada,
  STATUS_OCORRENCIA_ABERTOS,
} from './domain/constantes.js';
import {
  pendenciasParaEntrega,
  validarTransicaoEtapa,
  type AcaoEtapa,
} from './domain/etapa.state-machine.js';
import { prazoEtapa } from './domain/prazos.js';
import { registrarHistorico } from './historico.service.js';
import { buscarOrdemOperavel, obterOrdem, sincronizarStatusOrdem } from './ordem-servico.service.js';

/** Perfis que podem ser responsáveis técnicos por uma etapa. */
const PERFIS_RESPONSAVEIS: readonly PerfilUsuario[] = ['TECNICO', 'GESTOR'];

const DESCRICAO_ACAO: Record<AcaoEtapa, string> = {
  INICIAR: 'iniciada',
  PAUSAR: 'pausada',
  RETOMAR: 'retomada',
  CONCLUIR: 'concluída',
  DISPENSAR: 'dispensada',
  REABRIR: 'reaberta',
};

const responsavelSelect = { responsavel: { select: { id: true, nome: true } } } as const;

async function buscarEtapa(id: string) {
  const etapa = await prisma.etapaProcesso.findUnique({ where: { id } });
  if (!etapa) throw new NotFoundError('Etapa');
  return etapa;
}

export async function listarEtapas(ordemServicoId: string) {
  // obterOrdem já valida a existência e calcula os prazos de cada etapa.
  const ordem = await obterOrdem(ordemServicoId);
  return ordem.etapas;
}

export async function alterarStatusEtapa(
  id: string,
  dados: AlterarStatusEtapaInput,
  ctx: ContextoRequisicao,
) {
  const resultado = await prisma.$transaction(async (tx) => {
    const etapa = await tx.etapaProcesso.findUnique({ where: { id } });
    if (!etapa) throw new NotFoundError('Etapa');
    await buscarOrdemOperavel(tx, etapa.ordemServicoId);

    const etapasDaOrdem = await tx.etapaProcesso.findMany({
      where: { ordemServicoId: etapa.ordemServicoId },
      select: { id: true, ordem: true, status: true, codigo: true },
    });
    const ocorrenciasImpeditivasAbertas = await tx.ocorrencia.count({
      where: { etapaProcessoId: id, impeditiva: true, status: { in: [...STATUS_OCORRENCIA_ABERTOS] } },
    });

    const novoStatus = validarTransicaoEtapa(dados.acao, {
      etapa,
      etapasDaOrdem,
      usuario: ctx.usuario,
      justificativa: dados.justificativa,
      ocorrenciasImpeditivasAbertas,
    });

    // RN17: concluir a ENTREGA exige etapas, ocorrências e documentos em ordem.
    if (dados.acao === 'CONCLUIR' && etapa.codigo === CODIGO_ETAPA_ENTREGA) {
      const [ocorrenciasAbertasNaOrdem, aprovados] = await Promise.all([
        tx.ocorrencia.count({
          where: { ordemServicoId: etapa.ordemServicoId, status: { in: [...STATUS_OCORRENCIA_ABERTOS] } },
        }),
        tx.documento.findMany({
          where: {
            ordemServicoId: etapa.ordemServicoId,
            status: 'APROVADO',
            tipo: { in: [...DOCUMENTOS_OBRIGATORIOS_ENTREGA] },
          },
          select: { tipo: true },
          distinct: ['tipo'],
        }),
      ]);
      const pendencias = pendenciasParaEntrega({
        etapasDaOrdem,
        ocorrenciasAbertasNaOrdem,
        tiposDocumentosAprovados: aprovados.map((d) => d.tipo),
      });
      if (pendencias.length > 0) {
        throw new BusinessRuleError('Requisitos para a entrega não atendidos', 'RN17', { pendencias });
      }
    }

    const agora = new Date();
    // Atualização condicional (ADR-10): só aplica se o status não mudou desde a leitura.
    const { count } = await tx.etapaProcesso.updateMany({
      where: { id, status: etapa.status },
      data: {
        status: novoStatus,
        // RN11: dataInicio é gravada na primeira vez e não é sobrescrita ao retomar.
        ...(dados.acao === 'INICIAR' && !etapa.dataInicio && { dataInicio: agora }),
        ...(novoStatus === 'CONCLUIDA' && { dataConclusao: agora }),
        // Reabertura volta a etapa para execução: a conclusão anterior fica no histórico.
        ...(dados.acao === 'REABRIR' && { dataConclusao: null }),
      },
    });
    if (count === 0) {
      throw new ConflictError('A etapa foi alterada por outra operação. Recarregue e tente novamente.');
    }

    await registrarHistorico(tx, ctx, {
      ordemServicoId: etapa.ordemServicoId,
      etapaProcessoId: id,
      tipoEvento: 'ETAPA',
      statusAnterior: etapa.status,
      statusNovo: novoStatus,
      descricao: `Etapa ${etapa.nome} ${DESCRICAO_ACAO[dados.acao]}${dados.justificativa ? `: ${dados.justificativa}` : ''}`,
      visivelCliente: true,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'EtapaProcesso',
      entidadeId: id,
      acao: 'ALTERAR_STATUS',
      antes: { status: etapa.status },
      depois: { status: novoStatus, acao: dados.acao, justificativa: dados.justificativa },
    });

    const statusOrdem = await sincronizarStatusOrdem(tx, ctx, etapa.ordemServicoId);
    const atualizada = await tx.etapaProcesso.findUniqueOrThrow({
      where: { id },
      include: responsavelSelect,
    });
    return { etapa: atualizada, statusOrdem };
  });

  return { ...resultado.etapa, prazo: prazoEtapa(resultado.etapa), statusOrdem: resultado.statusOrdem };
}

export async function atribuirResponsavel(
  id: string,
  dados: AtribuirResponsavelInput,
  ctx: ContextoRequisicao,
) {
  const etapa = await buscarEtapa(id);
  if (etapaFinalizada(etapa.status)) {
    throw new BusinessRuleError(
      `Etapa ${etapa.status.toLowerCase()} não pode trocar de responsável`,
      'ETAPA_FINALIZADA',
    );
  }

  const responsavel = await prisma.usuario.findFirst({
    where: { id: dados.responsavelId, ativo: true, perfil: { in: [...PERFIS_RESPONSAVEIS] } },
    select: { id: true, nome: true },
  });
  if (!responsavel) {
    throw new BusinessRuleError(
      'Responsável deve ser um usuário ativo com perfil TECNICO ou GESTOR',
      'RESPONSAVEL_INVALIDO',
    );
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    await buscarOrdemOperavel(tx, etapa.ordemServicoId, { permitirSuspensa: true });
    const anterior = etapa.responsavelId
      ? await tx.usuario.findUnique({ where: { id: etapa.responsavelId }, select: { nome: true } })
      : null;

    const resultado = await tx.etapaProcesso.update({
      where: { id },
      data: { responsavelId: responsavel.id },
      include: responsavelSelect,
    });
    // Não é mudança de status, mas é relevante para a rastreabilidade (RN27).
    await registrarHistorico(tx, ctx, {
      ordemServicoId: etapa.ordemServicoId,
      etapaProcessoId: id,
      tipoEvento: 'ETAPA',
      statusAnterior: etapa.status,
      statusNovo: etapa.status,
      descricao: `Responsável da etapa ${etapa.nome}: ${anterior?.nome ?? '(nenhum)'} → ${responsavel.nome}`,
      visivelCliente: false,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'EtapaProcesso',
      entidadeId: id,
      acao: 'ATUALIZAR',
      antes: { responsavelId: etapa.responsavelId },
      depois: { responsavelId: responsavel.id },
    });
    return resultado;
  });
  return { ...atualizada, prazo: prazoEtapa(atualizada) };
}

export async function alterarPrazoEtapa(id: string, dados: AlterarPrazoEtapaInput, ctx: ContextoRequisicao) {
  const etapa = await buscarEtapa(id);
  if (etapaFinalizada(etapa.status)) {
    throw new BusinessRuleError(
      `Etapa ${etapa.status.toLowerCase()} não pode ter o prazo alterado`,
      'ETAPA_FINALIZADA',
    );
  }
  // RN26: replanejamento (já havia previsão) exige justificativa; a primeira definição não.
  if (etapa.previsaoConclusao && !dados.justificativa) {
    throw new BusinessRuleError('Alterar uma previsão existente exige justificativa', 'RN26');
  }
  if (etapa.previsaoConclusao?.getTime() === dados.previsaoConclusao.getTime()) {
    throw new BusinessRuleError('A nova previsão é igual à atual', 'PREVISAO_INALTERADA');
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    const ordem = await buscarOrdemOperavel(tx, etapa.ordemServicoId, { permitirSuspensa: true });
    if (dados.previsaoConclusao.getTime() <= ordem.dataEntrada.getTime()) {
      throw new BusinessRuleError('A previsão deve ser posterior à entrada do veículo', 'PREVISAO_INVALIDA');
    }

    await tx.alteracaoPrevisao.create({
      data: {
        ordemServicoId: etapa.ordemServicoId,
        etapaProcessoId: id,
        previsaoAnterior: etapa.previsaoConclusao,
        previsaoNova: dados.previsaoConclusao,
        justificativa: dados.justificativa ?? 'Definição inicial do prazo',
        usuarioId: ctx.usuario.id,
      },
    });
    const resultado = await tx.etapaProcesso.update({
      where: { id },
      data: { previsaoConclusao: dados.previsaoConclusao },
      include: responsavelSelect,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'EtapaProcesso',
      entidadeId: id,
      acao: 'ATUALIZAR',
      antes: { previsaoConclusao: etapa.previsaoConclusao },
      depois: { previsaoConclusao: dados.previsaoConclusao, justificativa: dados.justificativa },
    });
    return resultado;
  });
  return { ...atualizada, prazo: prazoEtapa(atualizada) };
}
