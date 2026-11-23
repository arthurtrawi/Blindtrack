/**
 * Restringe uma área da interface a perfis específicos (usado dentro de ProtectedRoute).
 * Perfil fora da lista → página de acesso negado.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { PerfilUsuario } from '@/types/usuario';

export function RoleRoute({ perfis }: { perfis: readonly PerfilUsuario[] }) {
  const { usuario } = useAuth();
  if (!usuario || !perfis.includes(usuario.perfil)) {
    return <Navigate to="/acesso-negado" replace />;
  }
  return <Outlet />;
}
