/**
 * Autenticação: login, emissão e verificação de JWT, troca de senha.
 */
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import type { ContextoRequisicao, UsuarioAutenticado } from '../types/auth.js';
import { BusinessRuleError, UnauthorizedError } from '../utils/app-error.js';
import type { AlterarSenhaInput, LoginInput } from '../validators/auth.schema.js';
import { registrarAuditoria } from './auditoria.service.js';

const JWT_ISSUER = 'blindtrack-api';
const JWT_AUDIENCE = 'blindtrack';
const JWT_ALGORITHM = 'HS256';
const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos';

const usuarioAutenticadoSelect = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  clienteId: true,
} as const;

export interface PayloadToken {
  sub: string;
  perfil: UsuarioAutenticado['perfil'];
}

export interface ResultadoLogin {
  token: string;
  tipo: 'Bearer';
  expiraEm: string;
  usuario: UsuarioAutenticado;
}

/**
 * Hash "falso" usado quando o e-mail não existe, para que a resposta demore o mesmo
 * tempo nos dois casos. Isso impede descobrir quais e-mails estão cadastrados pelo tempo.
 */
let hashFicticio: string | null = null;
async function obterHashFicticio(): Promise<string> {
  hashFicticio ??= await bcrypt.hash('senha-ficticia-para-tempo-constante', env.BCRYPT_SALT_ROUNDS);
  return hashFicticio;
}

export function gerarToken(usuario: Pick<UsuarioAutenticado, 'id' | 'perfil'>): {
  token: string;
  expiraEm: Date;
} {
  const payload: Omit<PayloadToken, 'sub'> = { perfil: usuario.perfil };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    subject: usuario.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: JWT_ALGORITHM,
  });
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, expiraEm: new Date(exp * 1000) };
}

/** Valida assinatura, algoritmo, emissor, público e expiração. */
export function verificarToken(token: string): PayloadToken {
  try {
    const decodificado = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM], // impede ataques de troca de algoritmo ("alg": "none")
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof decodificado === 'string' || typeof decodificado.sub !== 'string') {
      throw new UnauthorizedError('Token inválido');
    }
    return { sub: decodificado.sub, perfil: decodificado['perfil'] as PayloadToken['perfil'] };
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expirado');
    }
    if (erro instanceof UnauthorizedError) throw erro;
    throw new UnauthorizedError('Token inválido');
  }
}

/** Carrega o usuário do token. Retorna null se não existir ou estiver inativo. */
export async function carregarUsuarioAutenticado(id: string): Promise<UsuarioAutenticado | null> {
  return prisma.usuario.findFirst({
    where: { id, ativo: true },
    select: usuarioAutenticadoSelect,
  });
}

export async function login({ email, senha }: LoginInput): Promise<ResultadoLogin> {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { ...usuarioAutenticadoSelect, senhaHash: true, ativo: true },
  });

  // Compara sempre, mesmo sem usuário, para manter o tempo de resposta constante.
  const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? (await obterHashFicticio()));

  if (!usuario || !senhaConfere || !usuario.ativo) {
    // Mesma mensagem para todos os casos: não revela se o e-mail existe nem se está inativo.
    throw new UnauthorizedError(MENSAGEM_CREDENCIAIS_INVALIDAS);
  }

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLoginEm: new Date() } });

  const { senhaHash: _senhaHash, ativo: _ativo, ...dadosUsuario } = usuario;
  const { token, expiraEm } = gerarToken(dadosUsuario);
  return { token, tipo: 'Bearer', expiraEm: expiraEm.toISOString(), usuario: dadosUsuario };
}

export async function alterarPropriaSenha(ctx: ContextoRequisicao, dados: AlterarSenhaInput): Promise<void> {
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: ctx.usuario.id },
    select: { senhaHash: true },
  });

  if (!(await bcrypt.compare(dados.senhaAtual, usuario.senhaHash))) {
    throw new BusinessRuleError('Senha atual incorreta', 'SENHA_ATUAL_INCORRETA');
  }

  const novoHash = await bcrypt.hash(dados.novaSenha, env.BCRYPT_SALT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: ctx.usuario.id }, data: { senhaHash: novoHash } });
    await registrarAuditoria(tx, ctx, {
      entidade: 'Usuario',
      entidadeId: ctx.usuario.id,
      acao: 'ATUALIZAR',
      depois: { senhaAlterada: true },
    });
  });
}
