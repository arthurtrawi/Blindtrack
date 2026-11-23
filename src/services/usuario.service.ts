/**
 * Gestão de usuários (RF03, RF04). Acesso restrito a ADMIN, controlado nas rotas.
 * Usuários nunca são excluídos: são desativados (RN36).
 */
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../utils/app-error.js';
import { paraSkipTake, respostaPaginada, type RespostaPaginada } from '../utils/paginacao.js';
import type {
  AtualizarUsuarioInput,
  CriarUsuarioInput,
  ListarUsuariosQuery,
} from '../validators/usuario.schema.js';
import { diferencas, registrarAuditoria } from './auditoria.service.js';
import { STATUS_ETAPA_EM_CURSO, STATUS_OCORRENCIA_ABERTOS } from './domain/constantes.js';

/** Projeção pública: o hash da senha nunca sai do service. */
export const usuarioPublicoSelect = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  clienteId: true,
  ultimoLoginEm: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UsuarioSelect;

export type UsuarioPublico = Prisma.UsuarioGetPayload<{ select: typeof usuarioPublicoSelect }>;

async function garantirEmailDisponivel(email: string, ignorarId?: string): Promise<void> {
  const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existente && existente.id !== ignorarId) {
    throw new ConflictError('E-mail já cadastrado para outro usuário');
  }
}

export async function criarUsuario(
  dados: CriarUsuarioInput,
  ctx: ContextoRequisicao,
): Promise<UsuarioPublico> {
  await garantirEmailDisponivel(dados.email);

  if (dados.clienteId) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: dados.clienteId, deletedAt: null },
      select: { id: true, usuarioPortal: { select: { id: true } } },
    });
    if (!cliente) throw new NotFoundError('Cliente');
    if (cliente.usuarioPortal) {
      throw new ConflictError('Este cliente já possui usuário de acesso ao portal');
    }
  }

  const senhaHash = await bcrypt.hash(dados.senha, env.BCRYPT_SALT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        perfil: dados.perfil,
        clienteId: dados.clienteId ?? null,
      },
      select: usuarioPublicoSelect,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'Usuario',
      entidadeId: usuario.id,
      acao: 'CRIAR',
      depois: usuario,
    });
    return usuario;
  });
}

export async function listarUsuarios(query: ListarUsuariosQuery): Promise<RespostaPaginada<UsuarioPublico>> {
  const where: Prisma.UsuarioWhereInput = {
    perfil: query.perfil,
    ativo: query.ativo,
    ...(query.busca && {
      OR: [
        { nome: { contains: query.busca, mode: 'insensitive' } },
        { email: { contains: query.busca, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, data] = await prisma.$transaction([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: usuarioPublicoSelect,
      orderBy: { nome: 'asc' },
      ...paraSkipTake(query),
    }),
  ]);
  return respostaPaginada(data, total, query);
}

export async function obterUsuario(id: string): Promise<UsuarioPublico> {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: usuarioPublicoSelect });
  if (!usuario) throw new NotFoundError('Usuário');
  return usuario;
}

/**
 * Impede desativar quem ainda é responsável por trabalho em curso: etapas em andamento
 * ou pausadas, ou ocorrências abertas. É preciso reatribuir antes.
 */
async function garantirSemPendencias(usuarioId: string): Promise<void> {
  const [etapas, ocorrencias] = await Promise.all([
    prisma.etapaProcesso.count({
      where: { responsavelId: usuarioId, status: { in: [...STATUS_ETAPA_EM_CURSO] } },
    }),
    prisma.ocorrencia.count({
      where: { usuarioResponsavelId: usuarioId, status: { in: [...STATUS_OCORRENCIA_ABERTOS] } },
    }),
  ]);
  if (etapas > 0 || ocorrencias > 0) {
    throw new BusinessRuleError(
      'O usuário é responsável por etapas em curso ou ocorrências abertas. Reatribua-as antes de desativá-lo.',
      'USUARIO_COM_PENDENCIAS',
      { etapasEmCurso: etapas, ocorrenciasAbertas: ocorrencias },
    );
  }
}

export async function atualizarUsuario(
  id: string,
  dados: AtualizarUsuarioInput,
  ctx: ContextoRequisicao,
): Promise<UsuarioPublico> {
  const atual = await obterUsuario(id);
  const desativando = dados.ativo === false && atual.ativo;
  const mudandoPerfil = dados.perfil !== undefined && dados.perfil !== atual.perfil;

  // Proteção contra auto-bloqueio: sempre resta ao menos o ADMIN que está agindo.
  if (id === ctx.usuario.id && (desativando || mudandoPerfil)) {
    throw new BusinessRuleError(
      'Você não pode desativar nem alterar o perfil do próprio usuário',
      'AUTO_BLOQUEIO',
    );
  }

  // CLIENTE ↔ interno muda a natureza da conta (vínculo com Cliente). Crie outro usuário.
  if (mudandoPerfil && (atual.perfil === 'CLIENTE' || dados.perfil === 'CLIENTE')) {
    throw new BusinessRuleError(
      'Não é possível converter usuário de portal em usuário interno (ou vice-versa). Crie um novo usuário.',
      'CONVERSAO_PERFIL_CLIENTE',
    );
  }

  if (dados.email && dados.email !== atual.email) {
    await garantirEmailDisponivel(dados.email, id);
  }
  if (desativando) {
    await garantirSemPendencias(id);
  }

  const senhaHash = dados.senha ? await bcrypt.hash(dados.senha, env.BCRYPT_SALT_ROUNDS) : undefined;

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.usuario.update({
      where: { id },
      data: {
        nome: dados.nome,
        email: dados.email,
        perfil: dados.perfil,
        ativo: dados.ativo,
        // Redefinição pelo ADMIN também derruba as sessões existentes do usuário.
        ...(senhaHash && { senhaHash, senhaAlteradaEm: new Date() }),
      },
      select: usuarioPublicoSelect,
    });

    const reativando = dados.ativo === true && !atual.ativo;
    const { antes, depois } = diferencas(atual, atualizado);
    await registrarAuditoria(tx, ctx, {
      entidade: 'Usuario',
      entidadeId: id,
      acao: desativando ? 'INATIVAR' : reativando ? 'REATIVAR' : 'ATUALIZAR',
      antes,
      depois: { ...depois, ...(senhaHash && { senhaRedefinida: true }) },
    });
    return atualizado;
  });
}
