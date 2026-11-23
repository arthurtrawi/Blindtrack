/**
 * Linha do tempo da blindagem: uma <ol> com as etapas reais da OS, na ordem.
 * Vertical em telas pequenas; horizontal a partir de lg (1024 px), quando a descrição da
 * etapa atual aparece num quadro abaixo.
 */
import { Info } from 'lucide-react';
import type { EtapaPortal } from '@/types/portal';
import { indiceEtapaAtual } from '@/utils/progresso';
import { TimelineStep } from './TimelineStep';

export function BlindagemTimeline({ etapas }: { etapas: readonly EtapaPortal[] }) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
  const atual = indiceEtapaAtual(ordenadas);
  const etapaAtual = atual >= 0 ? ordenadas[atual] : undefined;

  return (
    <div>
      <ol
        aria-label="Etapas da blindagem"
        className="lg:grid lg:gap-2"
        style={{ gridTemplateColumns: `repeat(${ordenadas.length}, minmax(0, 1fr))` }}
      >
        {ordenadas.map((etapa, indice) => (
          <TimelineStep
            key={`${etapa.ordem}-${etapa.nome}`}
            etapa={etapa}
            atual={indice === atual}
            ultima={indice === ordenadas.length - 1}
          />
        ))}
      </ol>

      {etapaAtual?.descricao && (
        <div
          aria-hidden="true"
          className="mt-6 hidden items-start gap-2 rounded-md bg-blue-50 p-4 text-sm text-blue-900 lg:flex"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">{etapaAtual.nome}: </span>
            {etapaAtual.descricao}
          </p>
        </div>
      )}
    </div>
  );
}
