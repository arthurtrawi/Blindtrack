/**
 * Um passo da linha do tempo. Estados visuais distintos também sem cor:
 * concluída (✓ verde, conector sólido), atual (azul, maior, aria-current), interrompida
 * (pausa âmbar), futura (contorno cinza) e "não se aplica" (contorno tracejado, texto riscado).
 */
import { AlertTriangle } from 'lucide-react';
import type { EtapaPortal } from '@/types/portal';
import { dataVencida, formatarDataCurta } from '@/utils/formatacao';
import { statusEtapa } from '@/utils/status';

interface TimelineStepProps {
  etapa: EtapaPortal;
  atual: boolean;
  ultima: boolean;
}

function classesMarcador(etapa: EtapaPortal, atual: boolean): string {
  switch (etapa.status) {
    case 'CONCLUIDA':
      return 'border-green-600 bg-green-600 text-white';
    case 'EM_ANDAMENTO':
      return 'border-blue-700 bg-blue-700 text-white ring-4 ring-blue-100';
    case 'PAUSADA':
      return 'border-amber-600 bg-amber-50 text-amber-800 ring-4 ring-amber-100';
    case 'DISPENSADA':
      return 'border-dashed border-slate-400 bg-white text-slate-400';
    case 'PENDENTE':
      return atual ? 'border-blue-700 bg-white text-blue-700' : 'border-slate-300 bg-white text-slate-400';
  }
}

export function TimelineStep({ etapa, atual, ultima }: TimelineStepProps) {
  const apresentacao = statusEtapa(etapa.status, 'cliente');
  const Icone = apresentacao.icone;
  const finalizada = etapa.status === 'CONCLUIDA' || etapa.status === 'DISPENSADA';
  const previsaoVencida = !finalizada && dataVencida(etapa.previsaoConclusao);
  const conectorConcluido = etapa.status === 'CONCLUIDA';

  return (
    <li
      aria-current={atual ? 'step' : undefined}
      className="relative flex gap-4 pb-8 last:pb-0 lg:flex-col lg:items-center lg:gap-3 lg:pb-0 lg:text-center"
    >
      {/* Conector até a próxima etapa: vertical (mobile) ou horizontal (lg). */}
      {!ultima && (
        <span
          aria-hidden="true"
          className={`absolute top-10 left-5 h-[calc(100%-2.5rem)] w-0.5 -translate-x-1/2 lg:top-5 lg:left-[calc(50%+1.25rem)] lg:h-0.5 lg:w-[calc(100%-2.5rem)] lg:translate-x-0 ${
            conectorConcluido ? 'bg-green-600' : 'bg-slate-200'
          }`}
        />
      )}

      <span
        className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 ${classesMarcador(etapa, atual)}`}
        aria-hidden="true"
      >
        <Icone className="size-5" strokeWidth={2.25} />
      </span>

      <div className="min-w-0 flex-1 pt-1 lg:pt-0">
        <p
          className={`font-medium ${atual ? 'text-blue-800' : 'text-slate-900'} ${
            etapa.status === 'DISPENSADA' ? 'text-slate-500 line-through decoration-slate-400' : ''
          }`}
        >
          {etapa.nome}
        </p>
        <p className={`text-sm ${atual ? 'font-medium text-blue-800' : 'text-slate-600'}`}>
          {apresentacao.rotulo}
          {atual && <span className="sr-only"> — etapa atual</span>}
        </p>

        <dl className="mt-1 space-y-0.5 text-xs text-slate-600">
          {etapa.dataInicio && (
            <div>
              <dt className="inline">Início: </dt>
              <dd className="inline tabular-nums">{formatarDataCurta(etapa.dataInicio)}</dd>
            </div>
          )}
          {etapa.dataConclusao && (
            <div>
              <dt className="inline">Conclusão: </dt>
              <dd className="inline tabular-nums">{formatarDataCurta(etapa.dataConclusao)}</dd>
            </div>
          )}
          {!finalizada && etapa.previsaoConclusao && (
            <div className={previsaoVencida ? 'font-medium text-amber-800' : undefined}>
              <dt className="inline">Previsão: </dt>
              <dd className="inline tabular-nums">
                {formatarDataCurta(etapa.previsaoConclusao)}
                {previsaoVencida && (
                  <span className="ml-1 inline-flex items-center gap-0.5">
                    <AlertTriangle className="size-3" aria-hidden="true" /> vencida
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>

        {/* Descrição institucional: visível no mobile; no desktop fica no quadro da etapa atual. */}
        {etapa.descricao && <p className="mt-2 text-sm text-slate-700 lg:sr-only">{etapa.descricao}</p>}
      </div>
    </li>
  );
}
