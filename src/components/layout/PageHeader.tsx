import type { ReactNode } from 'react';

interface PageHeaderProps {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  /** Ex.: link "← Ordens de serviço" */
  voltar?: ReactNode;
}

export function PageHeader({ titulo, descricao, acoes, voltar }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {voltar}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-marinho-900 md:text-3xl">{titulo}</h1>
          {descricao && <div className="text-sm text-slate-600">{descricao}</div>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </div>
  );
}
