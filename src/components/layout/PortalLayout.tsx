import type { ReactNode } from 'react';
import { CabecalhoSessao } from './CabecalhoSessao';

/** Estrutura do portal: link "pular para o conteúdo", cabeçalho e área principal. */
export function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-blue-800 shadow"
      >
        Pular para o conteúdo
      </a>
      <CabecalhoSessao subtitulo="Portal do cliente" />
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
