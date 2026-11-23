import { BrowserRouter, useLocation } from 'react-router-dom';
import { LimiteDeErro } from '@/components/erros/LimiteDeErro';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppRoutes } from '@/routes/AppRoutes';

/** Falha de renderização fora do painel (login, portal) não deixa a tela em branco. */
function RotasComLimiteDeErro() {
  const { pathname } = useLocation();
  return (
    <LimiteDeErro chaveReinicio={pathname} telaCheia>
      <AppRoutes />
    </LimiteDeErro>
  );
}

/** Só composição: roteador, sessão, avisos e rotas. */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RotasComLimiteDeErro />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
