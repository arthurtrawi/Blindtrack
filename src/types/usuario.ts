import type { DataISO, ParametrosPaginacao } from './api';

export type PerfilUsuario = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'ATENDIMENTO' | 'CLIENTE';

export const PERFIS_INTERNOS: readonly PerfilUsuario[] = ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO'];

/** GET /auth/me e campo `usuario` do login. */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  clienteId: string | null;
}

/** POST /auth/login com X-Requested-With: o token fica só no cookie HttpOnly. */
export interface RespostaLogin {
  tipo: 'Cookie';
  expiraEm: DataISO;
  usuario: UsuarioAutenticado;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
}

/** Usuário retornado por /usuarios (nunca contém hash de senha). */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  clienteId: string | null;
  ultimoLoginEm: DataISO | null;
  createdAt: DataISO;
  updatedAt: DataISO;
}

/** GET /usuarios/responsaveis */
export interface Responsavel {
  id: string;
  nome: string;
  perfil: 'TECNICO' | 'GESTOR';
}

export interface FiltrosUsuarios extends ParametrosPaginacao {
  perfil?: PerfilUsuario;
  ativo?: boolean;
  busca?: string;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
  clienteId?: string;
}

export interface AlteracoesUsuario {
  nome?: string;
  email?: string;
  senha?: string;
  perfil?: PerfilUsuario;
  ativo?: boolean;
}
