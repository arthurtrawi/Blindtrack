import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { rotaInicial } from '@/utils/permissoes';

export function AcessoNegadoPage() {
  const { usuario } = useAuth();
  const inicio = usuario ? rotaInicial(usuario.perfil) : '/login';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <ShieldX className="size-10 text-red-700" aria-hidden="true" />
      <h1 className="text-2xl font-semibold text-marinho-900">Acesso negado</h1>
      <p className="text-slate-600">Seu perfil não tem permissão para acessar esta área.</p>
      <Link to={inicio} className="font-medium text-blue-700 underline-offset-4 hover:underline">
        Ir para a minha área
      </Link>
    </main>
  );
}
