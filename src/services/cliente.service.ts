/**
 * Gestão de clientes (RF06–RF09).
 *
 * LGPD (minimização): o perfil TECNICO recebe só identificação mínima, com o documento
 * mascarado e sem contato ou endereço. Ele não precisa desses dados para executar a blindagem.
 */
import { prisma } from '../config/prisma.js';
import type { Cliente, Prisma } from '../generated/prisma/client.js';
import type { ContextoRequisicao, PerfilUsuario } from '../types/auth.js';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../utils/app-error.js';
import { mascararDocumento, tipoPessoaDoDocumento } from '../utils/documento.js';
import { paraSkipTake, respostaPaginada, type RespostaPaginada } from '../utils/paginacao.js';
import type {
  AtualizarClienteInput,
  CriarClienteInput,
  ListarClientesQuery,
} from '../validators/cliente.schema.js';
import { diferencas, registrarAuditoria } from './auditoria.service.js';
import { STATUS_OS_ENCERRADOS } from './domain/constantes.js';

/** Visão reduzida para o perfil TECNICO. */
export interface ClienteResumido {
  id: string;
  tipoPessoa: Cliente['tipoPessoa'];
  nome: string;
  cpfCnpj: string;
}

export type ClienteVisivel = Cliente | ClienteResumido;

const PERFIS_COM_DADOS_COMPLETOS: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR', 'ATENDIMENTO'];
const PERFIS_QUE_VEEM_INATIVOS: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR'];
const PERFIS_QUE_CORRIGEM_DOCUMENTO: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR'];

function projetarCliente(cliente: Cliente, perfil: PerfilUsuario): ClienteVisivel {
  if (PERFIS_COM_DADOS_COMPLETOS.includes(perfil)) return cliente;
  return {
    id: cliente.id,
    tipoPessoa: cliente.tipoPessoa,
    nome: cliente.nome,
    cpfCnpj: mascararDocumento(cliente.cpfCnpj),
  };
}

async function garantirDocumentoDisponivel(cpfCnpj: string, ignorarId?: string): Promise<void> {
  // Considera também os inativados: o documento continua pertencendo àquele cadastro.
  const existente = await prisma.cliente.findUnique({ where: { cpfCnpj }, select: { id: true } });
  if (existente && existente.id !== ignorarId) {
    throw new ConflictError('CPF/CNPJ já cadastrado');
  }
}

/** Busca cliente ativo (não inativado). */
async function buscarClienteAtivo(id: string): Promise<Cliente> {
  const cliente = await prisma.cliente.findFirst({ where: { id, deletedAt: null } });
  if (!cliente) throw new NotFoundError('Cliente');
  return cliente;
}

export async function criarCliente(dados: CriarClienteInput, ctx: ContextoRequisicao): Promise<Cliente> {
  await garantirDocumentoDisponivel(dados.cpfCnpj);

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({ data: dados });
    await registrarAuditoria(tx, ctx, {
      entidade: 'Cliente',
      entidadeId: cliente.id,
      acao: 'CRIAR',
      depois: cliente,
    });
    return cliente;
  });
}

export async function listarClientes(
  query: ListarClientesQuery,
  ctx: ContextoRequisicao,
): Promise<RespostaPaginada<ClienteVisivel>> {
  if (query.incluirInativos && !PERFIS_QUE_VEEM_INATIVOS.includes(ctx.usuario.perfil)) {
    throw new ForbiddenError('Somente ADMIN e GESTOR podem listar clientes inativados');
  }

  const where: Prisma.ClienteWhereInput = {
    ...(!query.incluirInativos && { deletedAt: null }),
    ...(query.nome && { nome: { contains: query.nome, mode: 'insensitive' } }),
    ...(query.documento && { cpfCnpj: query.documento }),
    ...(query.email && { email: { contains: query.email, mode: 'insensitive' } }),
    ...(query.tipoPessoa && { tipoPessoa: query.tipoPessoa }),
  };

  const [total, clientes] = await prisma.$transaction([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({ where, orderBy: { nome: 'asc' }, ...paraSkipTake(query) }),
  ]);

  return respostaPaginada(
    clientes.map((c) => projetarCliente(c, ctx.usuario.perfil)),
    total,
    query,
  );
}

export async function obterCliente(
  id: string,
  ctx: ContextoRequisicao,
): Promise<ClienteVisivel & { veiculos: { id: string; placa: string; marca: string; modelo: string }[] }> {
  const cliente = await buscarClienteAtivo(id);
  const veiculos = await prisma.veiculo.findMany({
    where: { clienteId: id },
    select: { id: true, placa: true, marca: true, modelo: true },
    orderBy: { createdAt: 'asc' },
  });
  return { ...projetarCliente(cliente, ctx.usuario.perfil), veiculos };
}

export async function atualizarCliente(
  id: string,
  dados: AtualizarClienteInput,
  ctx: ContextoRequisicao,
): Promise<Cliente> {
  const atual = await buscarClienteAtivo(id);

  if (dados.cpfCnpj !== undefined && dados.cpfCnpj !== atual.cpfCnpj) {
    if (!PERFIS_QUE_CORRIGEM_DOCUMENTO.includes(ctx.usuario.perfil)) {
      throw new ForbiddenError('Somente ADMIN e GESTOR podem corrigir CPF/CNPJ');
    }
    if (tipoPessoaDoDocumento(dados.cpfCnpj) !== atual.tipoPessoa) {
      throw new BusinessRuleError(
        atual.tipoPessoa === 'FISICA' ? 'Pessoa física exige CPF' : 'Pessoa jurídica exige CNPJ',
        'DOCUMENTO_INCOMPATIVEL',
      );
    }
    await garantirDocumentoDisponivel(dados.cpfCnpj, id);
  }

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.cliente.update({ where: { id }, data: dados });
    const { antes, depois } = diferencas(atual, atualizado);
    await registrarAuditoria(tx, ctx, {
      entidade: 'Cliente',
      entidadeId: id,
      acao: 'ATUALIZAR',
      antes,
      depois,
    });
    return atualizado;
  });
}

/**
 * Inativação lógica (RN36): bloqueada se houver OS não encerrada.
 * O usuário de portal vinculado é desativado na mesma transação.
 */
export async function inativarCliente(id: string, ctx: ContextoRequisicao): Promise<void> {
  await buscarClienteAtivo(id);

  const ordensAtivas = await prisma.ordemServico.count({
    where: { clienteId: id, status: { notIn: [...STATUS_OS_ENCERRADOS] } },
  });
  if (ordensAtivas > 0) {
    throw new BusinessRuleError(
      'Cliente possui ordens de serviço não encerradas e não pode ser inativado',
      'RN36',
      { ordensAtivas },
    );
  }

  await prisma.$transaction(async (tx) => {
    const agora = new Date();
    await tx.cliente.update({ where: { id }, data: { deletedAt: agora } });
    const portal = await tx.usuario.updateMany({
      where: { clienteId: id, ativo: true },
      data: { ativo: false },
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'Cliente',
      entidadeId: id,
      acao: 'INATIVAR',
      antes: { deletedAt: null },
      depois: { deletedAt: agora, usuarioPortalDesativado: portal.count > 0 },
    });
  });
}
