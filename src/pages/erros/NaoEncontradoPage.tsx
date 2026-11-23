import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTituloPagina } from '@/hooks/useTituloPagina';

export function NaoEncontradoPage() {
  useTituloPagina('Página não encontrada');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <Compass className="size-10 text-slate-400" aria-hidden="true" />
      <h1 className="text-2xl font-semibold text-marinho-900">Página não encontrada</h1>
      <p className="text-slate-600">O endereço acessado não existe ou foi movido.</p>
      <Link to="/" className="font-medium text-blue-700 underline-offset-4 hover:underline">
        Voltar ao início
      </Link>
    </main>
  );
}
