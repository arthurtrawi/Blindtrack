/**
 * Sessão do usuário (cookie HttpOnly emitido pelo backend; o token nunca passa por aqui).
 *
 * - Recuperação: ao abrir a aplicação, GET /auth/me diz se o cookie ainda vale.
 * - Login: POST /auth/login; o backend define o cookie e devolve só os dados do usuário.
 * - Logout: POST /auth/logout apaga o cookie. Mesmo que a rede falhe, a sessão local é encerrada.
 * - Expiração: qualquer 401 da API (via api.ts) encerra a sessão com o motivo "expirada".
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { definirOuvinteSessaoExpirada, ehCancelamento } from '@/services/api';
import * as authService from '@/services/auth.service';
import type { CredenciaisLogin, UsuarioAutenticado } from '@/types/usuario';
import { AuthContexto, type MotivoSaida, type StatusSessao, type ValorAuth } from './auth-contexto';

interface EstadoSessao {
  status: StatusSessao;
  usuario: UsuarioAutenticado | null;
  motivoSaida: MotivoSaida;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>({
    status: 'verificando',
    usuario: null,
    motivoSaida: null,
  });

  // Recuperação da sessão a partir do cookie.
  useEffect(() => {
    const controlador = new AbortController();
    authService
      .usuarioAtual(controlador.signal)
      .then((usuario) => setEstado({ status: 'autenticado', usuario, motivoSaida: null }))
      .catch((erro: unknown) => {
        if (ehCancelamento(erro) || controlador.signal.aborted) return;
        // 401 = sem sessão; falha de rede também cai no login, que mostrará o erro ao tentar entrar.
        setEstado({ status: 'anonimo', usuario: null, motivoSaida: null });
      });
    return () => controlador.abort();
  }, []);

  // Sessão expirada em qualquer chamada da aplicação.
  useEffect(() => {
    definirOuvinteSessaoExpirada(() => {
      setEstado((atual) =>
        atual.status === 'autenticado'
          ? { status: 'anonimo', usuario: null, motivoSaida: 'expirada' }
          : atual,
      );
    });
    return () => definirOuvinteSessaoExpirada(null);
  }, []);

  const entrar = useCallback(async (credenciais: CredenciaisLogin) => {
    const { usuario } = await authService.login(credenciais);
    setEstado({ status: 'autenticado', usuario, motivoSaida: null });
    return usuario;
  }, []);

  const sair = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Logout é idempotente no backend; se a rede falhar, ainda encerramos a sessão local.
    } finally {
      setEstado({ status: 'anonimo', usuario: null, motivoSaida: 'logout' });
    }
  }, []);

  const valor = useMemo<ValorAuth>(() => ({ ...estado, entrar, sair }), [estado, entrar, sair]);
  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}
