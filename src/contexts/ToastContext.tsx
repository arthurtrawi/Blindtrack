/**
 * Notificações de feedback (sucesso, erro, aviso). Ficam numa região aria-live:
 * sucesso/aviso são anunciados de forma educada; erros, de imediato.
 * Sucesso some em 5 s; erros e avisos ficam até serem fechados.
 */
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContexto, type TipoToast } from './toast-contexto';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
  detalhes?: readonly string[];
}

const ESTILOS: Record<TipoToast, { classe: string; icone: typeof CheckCircle2 }> = {
  sucesso: { classe: 'border-green-200 bg-green-50 text-green-900', icone: CheckCircle2 },
  erro: { classe: 'border-red-200 bg-red-50 text-red-900', icone: XCircle },
  aviso: { classe: 'border-amber-200 bg-amber-50 text-amber-900', icone: AlertTriangle },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(0);

  const fechar = useCallback((id: number) => setToasts((atuais) => atuais.filter((t) => t.id !== id)), []);

  const notificar = useCallback(
    (tipo: TipoToast, mensagem: string, detalhes?: readonly string[]) => {
      proximoId.current += 1;
      const id = proximoId.current;
      setToasts((atuais) => [...atuais.slice(-3), { id, tipo, mensagem, detalhes }]);
      if (tipo === 'sucesso') setTimeout(() => fechar(id), 5_000);
    },
    [fechar],
  );

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <ToastContexto.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        <div aria-live="polite" className="contents">
          {toasts
            .filter((t) => t.tipo !== 'erro')
            .map((t) => (
              <ItemToast key={t.id} toast={t} aoFechar={fechar} />
            ))}
        </div>
        <div aria-live="assertive" className="contents">
          {toasts
            .filter((t) => t.tipo === 'erro')
            .map((t) => (
              <ItemToast key={t.id} toast={t} aoFechar={fechar} />
            ))}
        </div>
      </div>
    </ToastContexto.Provider>
  );
}

function ItemToast({ toast, aoFechar }: { toast: Toast; aoFechar: (id: number) => void }) {
  const { classe, icone: Icone } = ESTILOS[toast.tipo];
  return (
    <div
      role={toast.tipo === 'erro' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border p-3 text-sm shadow-lg ${classe}`}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{toast.mensagem}</p>
        {toast.detalhes && toast.detalhes.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {toast.detalhes.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={() => aoFechar(toast.id)}
        aria-label="Fechar notificação"
        className="rounded p-1 opacity-70 hover:opacity-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
