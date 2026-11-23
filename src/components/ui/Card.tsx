import type { ReactNode } from 'react';

interface CardProps {
  titulo?: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Superfície padrão: branca, borda discreta, sombra leve, cantos de 8 px (Design System §3.2). */
export function Card({ titulo, acoes, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6 ${className}`}>
      {(titulo || acoes) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>}
          {acoes}
        </header>
      )}
      {children}
    </section>
  );
}
