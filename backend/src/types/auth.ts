import type { PerfilUsuario } from '../generated/prisma/client.js';

export type { PerfilUsuario };

/** Usuário autenticado, anexado em `req.user` pelo middleware `authenticate`. */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  /** Preenchido somente para o perfil CLIENTE. */
  clienteId: string | null;
}

/**
 * Contexto da requisição repassado aos services: quem está agindo e dados de
 * correlação para a auditoria. Os services não dependem do objeto Request do Express.
 */
export interface ContextoRequisicao {
  usuario: UsuarioAutenticado;
  requestId?: string;
  ip?: string;
}

/** Perfis internos (painel administrativo). */
export const PERFIS_INTERNOS = [
  'ADMIN',
  'GESTOR',
  'TECNICO',
  'ATENDIMENTO',
] as const satisfies readonly PerfilUsuario[];
