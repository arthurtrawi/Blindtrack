/**
 * Gestão de veículos (RF10–RF12). Veículos não são excluídos.
 */
import { prisma } from '../config/prisma.js';
import type { Prisma, Veiculo } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../utils/app-error.js';
import { paraSkipTake, respostaPaginada, type RespostaPaginada } from '../utils/paginacao.js';
import type {
  AtualizarVeiculoInput,
  CriarVeiculoInput,
  ListarVeiculosQuery,
} from '../validators/veiculo.schema.js';
import { diferencas, registrarAuditoria } from './auditoria.service.js';
import { STATUS_OS_ENCERRADOS } from './domain/constantes.js';

const veiculoComClienteInclude = {
  cliente: { select: { id: true, nome: true } },
} as const satisfies Prisma.VeiculoInclude;

export type VeiculoComCliente = Prisma.VeiculoGetPayload<{ include: typeof veiculoComClienteInclude }>;

/** O proprietário precisa existir e não estar inativado. */
async function garantirClienteAtivo(clienteId: string): Promise<void> {
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, deletedAt: null },
    select: { id: true },
  });
  if (!cliente) {
    throw new BusinessRuleError('Cliente não encontrado ou inativado', 'CLIENTE_INVALIDO');
  }
}

async function garantirIdentificacaoDisponivel(
  dados: { placa?: string; chassi?: string },
  ignorarId?: string,
): Promise<void> {
  const conflitos = await prisma.veiculo.findMany({
    where: {
      OR: [
        ...(dados.placa ? [{ placa: dados.placa }] : []),
        ...(dados.chassi ? [{ chassi: dados.chassi }] : []),
      ],
      ...(ignorarId && { NOT: { id: ignorarId } }),
    },
    select: { placa: true, chassi: true },
  });
  if (conflitos.some((v) => v.placa === dados.placa)) throw new ConflictError('Placa já cadastrada');
  if (conflitos.some((v) => v.chassi === dados.chassi)) throw new ConflictError('Chassi já cadastrado');
}

export async function criarVeiculo(
  dados: CriarVeiculoInput,
  ctx: ContextoRequisicao,
): Promise<VeiculoComCliente> {
  await garantirClienteAtivo(dados.clienteId);
  await garantirIdentificacaoDisponivel(dados);

  return prisma.$transaction(async (tx) => {
    const veiculo = await tx.veiculo.create({ data: dados, include: veiculoComClienteInclude });
    const { cliente: _cliente, ...dadosAuditoria } = veiculo;
    await registrarAuditoria(tx, ctx, {
      entidade: 'Veiculo',
      entidadeId: veiculo.id,
      acao: 'CRIAR',
      depois: dadosAuditoria,
    });
    return veiculo;
  });
}

export async function listarVeiculos(
  query: ListarVeiculosQuery,
): Promise<RespostaPaginada<VeiculoComCliente>> {
  const where: Prisma.VeiculoWhereInput = {
    ...(query.placa && { placa: { startsWith: query.placa } }),
    ...(query.chassi && { chassi: query.chassi }),
    ...(query.clienteId && { clienteId: query.clienteId }),
    ...(query.busca && {
      OR: [
        { marca: { contains: query.busca, mode: 'insensitive' } },
        { modelo: { contains: query.busca, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, data] = await prisma.$transaction([
    prisma.veiculo.count({ where }),
    prisma.veiculo.findMany({
      where,
      include: veiculoComClienteInclude,
      orderBy: { placa: 'asc' },
      ...paraSkipTake(query),
    }),
  ]);
  return respostaPaginada(data, total, query);
}

export async function obterVeiculo(id: string): Promise<VeiculoComCliente> {
  const veiculo = await prisma.veiculo.findUnique({ where: { id }, include: veiculoComClienteInclude });
  if (!veiculo) throw new NotFoundError('Veículo');
  return veiculo;
}

export async function atualizarVeiculo(
  id: string,
  dados: AtualizarVeiculoInput,
  ctx: ContextoRequisicao,
): Promise<VeiculoComCliente> {
  const { cliente: _cliente, ...atual }: VeiculoComCliente = await obterVeiculo(id);

  // Anos: valida a combinação final (um campo pode vir sozinho no PATCH).
  const anoFabricacao = dados.anoFabricacao ?? atual.anoFabricacao;
  const anoModelo = dados.anoModelo ?? atual.anoModelo;
  if (anoModelo < anoFabricacao || anoModelo > anoFabricacao + 1) {
    throw new BusinessRuleError(
      'anoModelo deve ser igual ao anoFabricacao ou o ano seguinte',
      'ANOS_INCOERENTES',
    );
  }

  const transferindo = dados.clienteId !== undefined && dados.clienteId !== atual.clienteId;
  if (transferindo) {
    const ordensAtivas = await prisma.ordemServico.count({
      where: { veiculoId: id, status: { notIn: [...STATUS_OS_ENCERRADOS] } },
    });
    if (ordensAtivas > 0) {
      throw new BusinessRuleError(
        'Veículo com ordem de serviço não encerrada não pode trocar de proprietário',
        'RF12',
      );
    }
    await garantirClienteAtivo(dados.clienteId as string);
  }

  await garantirIdentificacaoDisponivel(
    {
      placa: dados.placa !== atual.placa ? dados.placa : undefined,
      chassi: dados.chassi !== atual.chassi ? dados.chassi : undefined,
    },
    id,
  );

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.veiculo.update({
      where: { id },
      data: dados,
      include: veiculoComClienteInclude,
    });
    const { cliente: _c, ...novo }: VeiculoComCliente = atualizado;
    const { antes, depois } = diferencas<Veiculo>(atual, novo);
    await registrarAuditoria(tx, ctx, {
      entidade: 'Veiculo',
      entidadeId: id,
      acao: 'ATUALIZAR',
      antes,
      depois,
    });
    return atualizado;
  });
}
