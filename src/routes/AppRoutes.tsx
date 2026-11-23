/**
 * Rotas (planejamento §7). ProtectedRoute exige sessão; RoleRoute separa portal e painel.
 * A segurança real é do backend; estas rotas organizam a navegação.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { TelaCarregando } from '@/components/layout/TelaCarregando';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ClientesPage } from '@/pages/admin/ClientesPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { ModelosEtapaPage } from '@/pages/admin/ModelosEtapaPage';
import { OrdemDetalhePage } from '@/pages/admin/OrdemDetalhePage';
import { OrdensPage } from '@/pages/admin/OrdensPage';
import { UsuariosPage } from '@/pages/admin/UsuariosPage';
import { VeiculosPage } from '@/pages/admin/VeiculosPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { PortalDashboardPage } from '@/pages/cliente/PortalDashboardPage';
import { AcessoNegadoPage } from '@/pages/erros/AcessoNegadoPage';
import { NaoEncontradoPage } from '@/pages/erros/NaoEncontradoPage';
import { StatusConexaoPage } from '@/pages/sistema/StatusConexaoPage';
import { PERFIS_INTERNOS } from '@/types/usuario';
import { rotaInicial } from '@/utils/permissoes';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

/** "/" leva cada um à sua área (ou ao login). */
function Inicio() {
  const { status, usuario } = useAuth();
  if (status === 'verificando') return <TelaCarregando />;
  return <Navigate to={usuario ? rotaInicial(usuario.perfil) : '/login'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/status" element={<StatusConexaoPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute perfis={['CLIENTE']} />}>
          <Route path="/portal" element={<PortalDashboardPage />} />
          <Route path="/portal/ordens/:id" element={<PortalDashboardPage />} />
        </Route>
        <Route element={<RoleRoute perfis={PERFIS_INTERNOS} />}>
          <Route path="/painel" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="ordens" element={<OrdensPage />} />
            <Route path="ordens/:id" element={<OrdemDetalhePage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="veiculos" element={<VeiculosPage />} />
            <Route element={<RoleRoute perfis={['ADMIN']} />}>
              <Route path="usuarios" element={<UsuariosPage />} />
            </Route>
            <Route element={<RoleRoute perfis={['ADMIN', 'GESTOR']} />}>
              <Route path="modelos-etapa" element={<ModelosEtapaPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/acesso-negado" element={<AcessoNegadoPage />} />
      </Route>

      <Route path="*" element={<NaoEncontradoPage />} />
    </Routes>
  );
}
