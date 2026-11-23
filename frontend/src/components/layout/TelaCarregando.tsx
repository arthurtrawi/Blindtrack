import { Loader2, ShieldCheck } from 'lucide-react';

/** Tela cheia enquanto a sessão é verificada (evita "piscar" o login para quem já está logado). */
export function TelaCarregando({ texto = 'Verificando sua sessão...' }: { texto?: string }) {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 text-slate-600">
      <ShieldCheck className="size-10 text-marinho-900" aria-hidden="true" />
      <p className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {texto}
      </p>
    </div>
  );
}
