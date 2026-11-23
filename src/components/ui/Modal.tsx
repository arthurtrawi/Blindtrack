/**
 * Diálogo modal acessível: role="dialog" + aria-modal, título ligado por aria-labelledby,
 * foco preso dentro do diálogo (Tab/Shift+Tab), Esc fecha, foco devolvido a quem abriu,
 * rolagem da página travada enquanto aberto.
 */
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  /** Rodapé com as ações (botões). */
  acoes?: ReactNode;
  largura?: 'md' | 'lg';
  /** Impede fechar (Esc/fundo/X) durante um envio. */
  bloqueado?: boolean;
}

export function Modal({
  aberto,
  titulo,
  aoFechar,
  children,
  acoes,
  largura = 'md',
  bloqueado = false,
}: ModalProps) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  const aoFecharRef = useRef(aoFechar);
  const bloqueadoRef = useRef(bloqueado);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
    bloqueadoRef.current = bloqueado;
  });

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco inicial: primeiro campo, senão o primeiro elemento focável.
    const elementos = painel.current?.querySelectorAll<HTMLElement>(FOCAVEIS);
    const campo = painel.current?.querySelector<HTMLElement>('input, select, textarea');
    (campo ?? elementos?.[0] ?? painel.current)?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !bloqueadoRef.current) {
        evento.stopPropagation();
        aoFecharRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !painel.current) return;
      const focaveis = Array.from(painel.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      const primeiro = focaveis[0];
      const ultimo = focaveis.at(-1);
      if (!primeiro || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        aria-hidden="true"
        onClick={() => {
          if (!bloqueado) aoFechar();
        }}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`relative flex max-h-[90dvh] w-full flex-col rounded-t-xl bg-white shadow-lg sm:rounded-lg ${
          largura === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id={idTitulo} className="text-lg font-semibold text-slate-900">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            disabled={bloqueado}
            aria-label="Fechar"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {acoes && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-3 sm:flex-row sm:justify-end">
            {acoes}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
