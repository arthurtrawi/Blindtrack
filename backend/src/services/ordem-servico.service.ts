/**
 * Ordens de serviço (RF13–RF17, RN01–RN08, RN25–RN27).
 * Também expõe operações reutilizadas pelos services de etapa, ocorrência e documento:
 * `buscarOrdemOperavel`, `sincronizarStatusOrdem` e `replanejarEntrega`.
 */
import { prisma, type DbClient, type TransactionClient } from '../config/prisma.js';
import type { OrdemServico, Prisma, StatusOrdemServico } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../utils/app-error.js';
import { paraSkipTake, respostaPaginada } from '../utils/paginacao.js';
import type {
  AbrirOrdemInput,
  AlterarPrevisaoOrdemInput,
  AlterarStatusOrdemInput,
  AtualizarOrdemInput,
  ListarOrdensQuery,
} from '../validators/ordem-servico.schema.js';
import { registrarAuditoria } from './auditoria.service.js';
import {
  CODIGO_ETAPA_ENTREGA,
  etapaAtualDe,
  osEncerrada,
  STATUS_OCORRENCIA_ABERTOS,
  STATUS_OS_ENCERRADOS,
} from './domain/constantes.js';
import { recalcularStatusOrdem, validarAcaoOrdem } from './domain/ordem-servico.state-machine.js';
import { prazoEtapa, prazoOrdem } from './domain/prazos.js';
import { registrarHistorico } from './historico.service.js';

export const ROTULO_STATUS_OS: Record<StatusOrdemServico, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  SUSPENSA: 'Suspensa',
  PRONTA_PARA_ENTREGA: 'Pronta para entrega',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

// -------------------------------------------------------------
// Operações compartilhadas
// -------------------------------------------------------------

interface OpcoesOperavel {
  /** Permite operar em OS suspensa (ex.: registrar ocorrência ou documento). */
  permitirSuspensa?: boolean;
}

/**
 * Carrega a OS e garante que ela aceita alterações operacionais.
 * RN05: OS encerrada (ENTREGUE/CANCELADA) não recebe alterações.
 */
export async function buscarOrdemOperavel(
  db: DbClient,
  id: string,
  { permitirSuspensa = false }: OpcoesOperavel = {},
): Promise<OrdemServico> {
  const ordem = await db.ordemServico.findUnique({ where: { id } });
  if (!ordem) throw new NotFoundError('Ordem de serviço');
  if (osEncerrada(ordem.status)) {
    throw new BusinessRuleError(
      `A OS ${ordem.numero} está ${ROTULO_STATUS_OS[ordem.status].toLowerCase()} e não aceita alterações`,
      'RN05',
    );
  }
  if (ordem.status === 'SUSPENSA' && !permitirSuspensa) {
    throw new BusinessRuleError(
      `A OS ${ordem.numero} está suspensa. Retome-a antes de continuar.`,
      'OS_SUSPENSA',
    );
  }
  return ordem;
}

/**
 * Aplica o status derivado das etapas (RN08) e registra o histórico se mudou.
 * Chamado na mesma transação de cada mudança de etapa.
 */
export async function sincronizarStatusOrdem(
  tx: TransactionClient,
  ctx: ContextoRequisicao,
  ordemServicoId: string,
): Promise<StatusOrdemServico> {
  const ordem = await tx.ordemServico.findUniqueOrThrow({
    where: { id: ordemServicoId },
    select: { status: true, etapas: { select: { codigo: true, status: true } } },
  });
  const novo = recalcularStatusOrdem(ordem.status, ordem.etapas);
  if (novo === ordem.status) return novo;

  // ENTREGUE só é alcançado pela conclusão da ENTREGA: grava a data real (RN06).
  await tx.ordemServico.update({
    where: { id: ordemServicoId },
    data: { status: novo, ...(novo === 'ENTREGUE' && { dataEntrega: new Date() }) },
  });
  await registrarHistorico(tx, ctx, {
    ordemServicoId,
    tipoEvento: 'ORDEM_SERVICO',
    statusAnterior: ordem.status,
    statusNovo: novo,
    descricao: `OS passou para "${ROTULO_STATUS_OS[novo]}" pelo andamento das etapas`,
    visivelCliente: true,
  });
  return novo;
}

/** Replanejamento da entrega com justificativa (RN26). Reutilizado por ocorrências (RN23). */
export async function replanejarEntrega(
  tx: TransactionClient,
  ctx: ContextoRequisicao,
  ordem: Pick<OrdemServico, 'id' | 'previsaoEntrega' | 'dataEntrada'>,
  novaPrevisao: Date,
  justificativa: string,
  ocorrenciaId?: string,
): Promise<void> {
  if (novaPrevisao.getTime() <= ordem.dataEntrada.getTime()) {
    throw new BusinessRuleError(
      'A previsão de entrega deve ser posterior à data de entrada',
      'PREVISAO_INVALIDA',
    );
  }
  if (novaPrevisao.getTime() === ordem.previsaoEntrega.getTime()) {
    throw new BusinessRuleError('A nova previsão é igual à atual', 'PREVISAO_INALTERADA');
  }
  await tx.alteracaoPrevisao.create({
    data: {
      ordemServicoId: ordem.id,
      ocorrenciaId: ocorrenciaId ?? null,
      previsaoAnterior: ordem.previsaoEntrega,
      previsaoNova: novaPrevisao,
      justificativa,
      usuarioId: ctx.usuario.id,
    },
  });
  await tx.ordemServico.update({ where: { id: ordem.id }, data: { previsaoEntrega: novaPrevisao } });
  await registrarAuditoria(tx, ctx, {
    entidade: 'OrdemServico',
    entidadeId: ordem.id,
    acao: 'ATUALIZAR',
    antes: { previsaoEntrega: ordem.previsaoEntrega },
    depois: { previsaoEntrega: novaPrevisao, justificativa },
  });
}

// -------------------------------------------------------------
// Casos de uso
// -------------------------------------------------------------

export async function abrirOrdem(dados: AbrirOrdemInput, ctx: ContextoRequisicao) {
  const veiculo = await prisma.veiculo.findUnique({
    where: { id: dados.veiculoId },
    select: { id: true, clienteId: true, placa: true, cliente: { select: { deletedAt: true } } },
  });
  if (!veiculo) throw new BusinessRuleError('Veículo não encontrado', 'VEICULO_INVALIDO');
  if (veiculo.cliente.deletedAt) throw new BusinessRuleError('Cliente inativado', 'CLIENTE_INVALIDO');
  // RN01: o veículo precisa pertencer ao cliente informado.
  if (veiculo.clienteId !== dados.clienteId) {
    throw new BusinessRuleError('O veículo não pertence ao cliente informado', 'RN01');
  }
  if (dados.previsaoEntrega.getTime() <= Date.now()) {
    throw new BusinessRuleError('A previsão de entrega deve ser futura', 'PREVISAO_INVALIDA');
  }
  // RN03: uma OS não encerrada por veículo (também garantido por índice único parcial).
  const ativa = await prisma.ordemServico.findFirst({
    where: { veiculoId: dados.veiculoId, status: { notIn: [...STATUS_OS_ENCERRADOS] } },
    select: { numero: true },
  });
  if (ativa) {
    throw new ConflictError(`O veículo ${veiculo.placa} já possui a OS ${ativa.numero} em aberto`);
  }

  const modelos = await prisma.modeloEtapa.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });
  if (modelos.at(-1)?.codigo !== CODIGO_ETAPA_ENTREGA) {
    throw new BusinessRuleError(
      'Modelo de etapas inválido: é preciso haver uma etapa ENTREGA ativa como última etapa',
      'MODELO_ETAPAS_INVALIDO',
    );
  }

  const id = await prisma.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.create({
      data: {
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId,
        previsaoEntrega: dados.previsaoEntrega,
        observacoes: dados.observacoes ?? null,
        abertaPorId: ctx.usuario.id,
        // RN04: etapas copiadas do modelo ativo; mudanças futuras no modelo não as afetam.
        etapas: {
          create: modelos.map((m) => ({
            modeloEtapaId: m.id,
            codigo: m.codigo,
            nome: m.nome,
            descricao: m.descricao,
            ordem: m.ordem,
            obrigatoria: m.obrigatoria,
          })),
        },
      },
    });
    await registrarHistorico(tx, ctx, {
      ordemServicoId: ordem.id,
      tipoEvento: 'ORDEM_SERVICO',
      statusAnterior: null,
      statusNovo: 'ABERTA',
      descricao: `OS ${ordem.numero} aberta`,
      visivelCliente: true,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'OrdemServico',
      entidadeId: ordem.id,
      acao: 'CRIAR',
      depois: ordem,
    });
    return ordem.id;
  });

  return obterOrdem(id);
}

/** RN27b: atrasada = não encerrada com previsão vencida, ou entregue depois da previsão. */
export function filtroOrdensAtrasadas(agora: Date): Prisma.OrdemServicoWhereInput {
  return {
    OR: [
      { status: { notIn: [...STATUS_OS_ENCERRADOS] }, previsaoEntrega: { lt: agora } },
      { status: 'ENTREGUE', dataEntrega: { gt: prisma.ordemServico.fields.previsaoEntrega } },
    ],
  };
}

const ordemListagemInclude = {
  cliente: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
  // Para calcular a etapa atual e seu responsável na listagem (P2). Uma OS tem ~8 etapas.
  etapas: {
    orderBy: { ordem: 'asc' },
    select: { nome: true, status: true, responsavel: { select: { id: true, nome: true } } },
  },
  _count: { select: { ocorrencias: { where: { status: { in: [...STATUS_OCORRENCIA_ABERTOS] } } } } },
} as const satisfies Prisma.OrdemServicoInclude;

export async function listarOrdens(query: ListarOrdensQuery) {
  const agora = new Date();
  const where: Prisma.OrdemServicoWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.clienteId && { clienteId: query.clienteId }),
    ...(query.veiculoId && { veiculoId: query.veiculoId }),
    ...(query.placa && { veiculo: { placa: { startsWith: query.placa } } }),
    ...(query.numero && { numero: { contains: query.numero } }),
    ...(query.cliente && { cliente: { nome: { contains: query.cliente, mode: 'insensitive' } } }),
    ...((query.entradaDe || query.entradaAte) && {
      dataEntrada: {
        ...(query.entradaDe && { gte: query.entradaDe }),
        ...(query.entradaAte && { lte: query.entradaAte }),
      },
    }),
    ...(query.atrasada === true && filtroOrdensAtrasadas(agora)),
    ...(query.atrasada === false && { NOT: filtroOrdensAtrasadas(agora) }),
  };

  const [total, ordens] = await prisma.$transaction([
    prisma.ordemServico.count({ where }),
    prisma.ordemServico.findMany({
      where,
      include: ordemListagemInclude,
      // Desempate por id garante paginação estável quando o campo ordenado se repete.
      orderBy: [{ [query.ordenarPor]: query.direcao }, { id: query.direcao }],
      ...paraSkipTake(query),
    }),
  ]);

  const data = ordens.map(({ _count, etapas, ...ordem }) => {
    const atual = etapaAtualDe(etapas);
    return {
      ...ordem,
      etapaAtual: atual ? { nome: atual.nome, status: atual.status, responsavel: atual.responsavel } : null,
      ocorrenciasAbertas: _count.ocorrencias,
      prazo: prazoOrdem(ordem, agora),
    };
  });
  return respostaPaginada(data, total, query);
}

export async function obterOrdem(id: string) {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true } },
      veiculo: { select: { id: true, placa: true, chassi: true, marca: true, modelo: true, cor: true } },
      abertaPor: { select: { id: true, nome: true } },
      etapas: { orderBy: { ordem: 'asc' }, include: { responsavel: { select: { id: true, nome: true } } } },
      _count: { select: { documentos: true } },
    },
  });
  if (!ordem) throw new NotFoundError('Ordem de serviço');

  const ocorrenciasAbertas = await prisma.ocorrencia.count({
    where: { ordemServicoId: id, status: { in: [...STATUS_OCORRENCIA_ABERTOS] } },
  });
  const agora = new Date();
  const { _count, etapas, ...dados } = ordem;
  return {
    ...dados,
    prazo: prazoOrdem(ordem, agora),
    etapas: etapas.map((e) => ({ ...e, prazo: prazoEtapa(e, agora) })),
    ocorrenciasAbertas,
    totalDocumentos: _count.documentos,
  };
}

export async function atualizarOrdem(id: string, dados: AtualizarOrdemInput, ctx: ContextoRequisicao) {
  const ordem = await prisma.ordemServico.findUnique({ where: { id } });
  if (!ordem) throw new NotFoundError('Ordem de serviço');
  // RN05: em OS encerrada, só ADMIN pode complementar observações.
  if (osEncerrada(ordem.status) && ctx.usuario.perfil !== 'ADMIN') {
    throw new ForbiddenError('Somente ADMIN pode alterar observações de OS encerrada');
  }

  await prisma.$transaction(async (tx) => {
    await tx.ordemServico.update({ where: { id }, data: { observacoes: dados.observacoes } });
    await registrarAuditoria(tx, ctx, {
      entidade: 'OrdemServico',
      entidadeId: id,
      acao: 'ATUALIZAR',
      antes: { observacoes: ordem.observacoes },
      depois: { observacoes: dados.observacoes },
    });
  });
  return obterOrdem(id);
}

export async function alterarStatusOrdem(
  id: string,
  dados: AlterarStatusOrdemInput,
  ctx: ContextoRequisicao,
) {
  await prisma.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.findUnique({
      where: { id },
      include: { etapas: { select: { codigo: true, status: true } } },
    });
    if (!ordem) throw new NotFoundError('Ordem de serviço');

    const novo = validarAcaoOrdem(dados.acao, ordem.status, ordem.etapas);

    // Atualização condicional: falha se outra requisição mudou o status no meio tempo (ADR-10).
    const { count } = await tx.ordemServico.updateMany({
      where: { id, status: ordem.status },
      data: { status: novo },
    });
    if (count === 0) {
      throw new ConflictError('A OS foi alterada por outra operação. Recarregue e tente novamente.');
    }

    await registrarHistorico(tx, ctx, {
      ordemServicoId: id,
      tipoEvento: 'ORDEM_SERVICO',
      statusAnterior: ordem.status,
      statusNovo: novo,
      descricao: `${dados.acao}: ${dados.justificativa}`,
      visivelCliente: true,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'OrdemServico',
      entidadeId: id,
      acao: 'ALTERAR_STATUS',
      antes: { status: ordem.status },
      depois: { status: novo, acao: dados.acao, justificativa: dados.justificativa },
    });
  });
  return obterOrdem(id);
}

export async function alterarPrevisaoOrdem(
  id: string,
  dados: AlterarPrevisaoOrdemInput,
  ctx: ContextoRequisicao,
) {
  await prisma.$transaction(async (tx) => {
    const ordem = await buscarOrdemOperavel(tx, id, { permitirSuspensa: true });
    await replanejarEntrega(tx, ctx, ordem, dados.previsaoEntrega, dados.justificativa);
  });
  return obterOrdem(id);
}
