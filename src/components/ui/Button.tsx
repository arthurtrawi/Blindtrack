import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type VarianteBotao = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTES: Record<VarianteBotao, string> = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-700/60',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/60',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: 'sm' | 'md';
  /** Durante o envio: desabilita (evita clique duplo) e mostra spinner. */
  carregando?: boolean;
  children: ReactNode;
}

export function Button({
  variante = 'primary',
  tamanho = 'md',
  carregando = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const tamanhos = tamanho === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm md:h-10';
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${tamanhos} ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {carregando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
