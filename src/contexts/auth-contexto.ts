import { createContext } from 'react';
import type { CredenciaisLogin, UsuarioAutenticado } from '@/types/usuario';

/** verificando = consultando GET /auth/me ao abrir a aplicação (recuperação de sessão). */
export type StatusSessao = 'verificando' | 'autenticado' | 'anonimo';

/** Por que a sessão terminou (para a mensagem exibida no login). */
export type MotivoSaida = 'logout' | 'expirada' | null;

export interface ValorAuth {
  status: StatusSessao;
  usuario: UsuarioAutenticado | null;
  motivoSaida: MotivoSaida;
  entrar: (credenciais: CredenciaisLogin) => Promise<UsuarioAutenticado>;
  sair: () => Promise<void>;
}

export const AuthContexto = createContext<ValorAuth | null>(null);
