/**
 * Extensão dos tipos do Express.
 * `req.user` é preenchido pelo middleware de autenticação (Fase 4).
 */
import 'express';

export type PerfilUsuario = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'ATENDIMENTO' | 'CLIENTE';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  perfil: PerfilUsuario;
  /** Preenchido somente para o perfil CLIENTE. */
  clienteId: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: UsuarioAutenticado;
  }
}
