import type { LucideIcon } from 'lucide-react';

export type TomBadge = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** Pares de cor com contraste ≥ 6,8:1 (Fase 1, §2). */
const TONS: Record<TomBadge, string> = {
  success: 'bg-green-50 text-green-800 ring-green-600/20',
  info: 'bg-blue-50 text-blue-800 ring-blue-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-50 text-red-800 ring-red-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

interface BadgeProps {
  tom: TomBadge;
  /** Texto sempre presente: o status nunca é comunicado só pela cor. */
  texto: string;
  icone?: LucideIcon;
}

export function Badge({ tom, texto, icone: Icone }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONS[tom]}`}
    >
      {Icone && <Icone className="size-3.5" aria-hidden="true" strokeWidth={2} />}
      {texto}
    </span>
  );
}
