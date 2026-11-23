import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MetaPaginacao } from '@/types/api';
import { Button } from './Button';

interface PaginacaoProps {
  meta: MetaPaginacao;
  aoMudarPagina: (pagina: number) => void;
}

export function Paginacao({ meta, aoMudarPagina }: PaginacaoProps) {
  if (meta.totalPages <= 1) {
    return <p className="text-sm text-slate-600">{meta.total} registro(s)</p>;
  }
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Página <span className="font-medium tabular-nums">{meta.page}</span> de{' '}
        <span className="tabular-nums">{meta.totalPages}</span> · {meta.total} registro(s)
      </p>
      <div className="flex gap-2">
        <Button
          variante="secondary"
          tamanho="sm"
          disabled={meta.page <= 1}
          onClick={() => aoMudarPagina(meta.page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
        </Button>
        <Button
          variante="secondary"
          tamanho="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => aoMudarPagina(meta.page + 1)}
          aria-label="Próxima página"
        >
          Próxima <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
