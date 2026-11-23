import { AlertTriangle, Inbox, Loader2, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError } from '@/services/api';
import { Button } from './Button';

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-slate-600">
      <Loader2 className="size-5 animate-spin text-blue-700" aria-hidden="true" />
      {texto}
    </div>
  );
}

interface ErroProps {
  erro: ApiError;
  aoTentarNovamente?: () => void;
}

/** Nunca deixa a tela em branco: mensagem compreensível + "Tentar novamente". */
export function ErroCarregamento({ erro, aoTentarNovamente }: ErroProps) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="space-y-2">
          <p className="font-medium">{erro.message}</p>
          {erro.requestId && <p className="text-xs text-red-700">Código para o suporte: {erro.requestId}</p>}
          {aoTentarNovamente && (
            <Button variante="secondary" tamanho="sm" onClick={aoTentarNovamente}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-600">
      <Inbox className="size-8 text-slate-400" aria-hidden="true" />
      <p className="font-medium text-slate-800">{titulo}</p>
      {children}
    </div>
  );
}
