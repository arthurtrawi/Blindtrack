import { AlarmClock, CalendarCheck, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { OrdemPortalDetalhe } from '@/types/portal';
import { formatarData, formatarDataHora } from '@/utils/formatacao';
import { calcularProgresso, indiceEtapaAtual } from '@/utils/progresso';

export function ProgressoCard({ ordem }: { ordem: OrdemPortalDetalhe }) {
  const etapas = [...ordem.etapas].sort((a, b) => a.ordem - b.ordem);
  const progresso = calcularProgresso(etapas);
  const atual = etapas[indiceEtapaAtual(etapas)];
  const ultimaAtualizacao = ordem.linhaDoTempo.reduce<string | null>(
    (maisRecente, item) => (!maisRecente || item.data > maisRecente ? item.data : maisRecente),
    null,
  );
  const entregue = ordem.status === 'ENTREGUE';

  return (
    <Card titulo="Progresso da blindagem">
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-sm text-slate-600">
              {entregue ? 'Blindagem concluída' : atual ? `Etapa atual: ${atual.nome}` : 'Aguardando entrega'}
            </p>
            <p className="text-2xl font-semibold text-marinho-900 tabular-nums">{progresso.percentual}%</p>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso da blindagem"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso.percentual}
            aria-valuetext={`${progresso.percentual}% — ${progresso.concluidas} de ${progresso.aplicaveis} etapas concluídas`}
            className="h-3 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-green-600 transition-[width] duration-500"
              style={{ width: `${progresso.percentual}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {progresso.concluidas} de {progresso.aplicaveis} etapas concluídas
          </p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CalendarCheck className="mt-0.5 size-4 text-slate-500" aria-hidden="true" />
            <div>
              <dt className="text-slate-600">{entregue ? 'Entregue em' : 'Previsão de entrega'}</dt>
              <dd className="font-medium tabular-nums">
                {formatarData(entregue ? ordem.dataEntrega : ordem.previsaoEntrega)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 text-slate-500" aria-hidden="true" />
            <div>
              <dt className="text-slate-600">Última atualização</dt>
              <dd className="font-medium tabular-nums">{formatarDataHora(ultimaAtualizacao)}</dd>
            </div>
          </div>
        </dl>

        {ordem.atrasada && !entregue && (
          <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlarmClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />A previsão de entrega foi
            ultrapassada. Nossa equipe está trabalhando para concluir o serviço o quanto antes.
          </p>
        )}
      </div>
    </Card>
  );
}
