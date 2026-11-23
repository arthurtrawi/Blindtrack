/**
 * Rotas (planejamento §7). ProtectedRoute exige sessão; RoleRoute separa portal e painel.
 * A segurança real é do backend; estas rotas organizam a navegação.
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TelaCarregando } from '@/components/layout/TelaCarregando';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AcessoNegadoPage } from '@/pages/erros/AcessoNegadoPage';
import { NaoEncontradoPage } from '@/pages/erros/NaoEncontradoPage';
import { PERFIS_INTERNOS } from '@/types/usuario';
import { rotaInicial } from '@/utils/permissoes';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

/*
 * Carregamento sob demanda: login e páginas de erro vão no pacote inicial; o portal e cada
 * tela do painel são baixados só quando abertos. O cliente nunca baixa o código do painel.
 */
const PortalDashboardPage = lazy(() =>
  import('@/pages/cliente/PortalDashboardPage').then((m) => ({ default: m.PortalDashboardPage })),
);
const StatusConexaoPage = lazy(() =>
  import('@/pages/sistema/StatusConexaoPage').then((m) => ({ default: m.StatusConexaoPage })),
);
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const DashboardPage = lazy(() =>
  import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const OrdensPage = lazy(() => import('@/pages/admin/OrdensPage').then((m) => ({ default: m.OrdensPage })));
const OrdemDetalhePage = lazy(() =>
  import('@/pages/admin/OrdemDetalhePage').then((m) => ({ default: m.OrdemDetalhePage })),
);
const ClientesPage = lazy(() =>
  import('@/pages/admin/ClientesPage').then((m) => ({ default: m.ClientesPage })),
);
const VeiculosPage = lazy(() =>
  import('@/pages/admin/VeiculosPage').then((m) => ({ default: m.VeiculosPage })),
);
const UsuariosPage = lazy(() =>
  import('@/pages/admin/UsuariosPage').then((m) => ({ default: m.UsuariosPage })),
);
const ModelosEtapaPage = lazy(() =>
  import('@/pages/admin/ModelosEtapaPage').then((m) => ({ default: m.ModelosEtapaPage })),
);

/** "/" leva cada um à sua área (ou ao login). */
function Inicio() {
  const { status, usuario } = useAuth();
  if (status === 'verificando') return <TelaCarregando />;
  return <Navigate to={usuario ? rotaInicial(usuario.perfil) : '/login'} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<TelaCarregando texto="Carregando..." />}>
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
    </Suspense>
  );
}
