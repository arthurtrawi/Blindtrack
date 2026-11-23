/**
 * Exige sessão. Sem sessão, leva ao login guardando o destino para voltar depois.
 * Não é mecanismo de segurança: o backend autoriza cada chamada.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { TelaCarregando } from '@/components/layout/TelaCarregando';
import { useAuth } from '@/hooks/useAuth';

export interface EstadoNavegacaoLogin {
  de?: string;
}

export function ProtectedRoute() {
  const { status, motivoSaida } = useAuth();
  const local = useLocation();

  if (status === 'verificando') return <TelaCarregando />;
  if (status === 'anonimo') {
    const destino = motivoSaida === 'expirada' ? '/login?expirada=1' : '/login';
    const estado: EstadoNavegacaoLogin = { de: `${local.pathname}${local.search}` };
    return <Navigate to={destino} replace state={estado} />;
  }
  return <Outlet />;
}
