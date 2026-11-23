/**
 * Ocorrências marcadas pela empresa como visíveis ao cliente. Só o texto escrito PARA o
 * cliente chega aqui (o backend nunca envia título, descrição interna ou responsável).
 */
import { MessageSquareWarning } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Vazio } from '@/components/ui/EstadoCarregamento';
import type { OcorrenciaPortal } from '@/types/portal';
import { formatarData } from '@/utils/formatacao';
import { tomOcorrenciaPortal } from '@/utils/status';

export function OcorrenciasPortal({ ocorrencias }: { ocorrencias: readonly OcorrenciaPortal[] }) {
  return (
    <Card titulo="Ocorrências">
      {ocorrencias.length === 0 ? (
        <Vazio titulo="Nenhuma ocorrência">
          <p className="text-sm">Quando houver algo que afete o andamento, você verá aqui.</p>
        </Vazio>
      ) : (
        <ul className="divide-y divide-slate-100">
          {[...ocorrencias]
            .sort((a, b) => b.dataAbertura.localeCompare(a.dataAbertura))
            .map((ocorrencia, indice) => (
              <li
                key={`${ocorrencia.dataAbertura}-${indice}`}
                className="flex gap-3 py-3 first:pt-0 last:pb-0"
              >
                <MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-slate-900">{ocorrencia.descricao ?? 'Ocorrência registrada'}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <Badge tom={tomOcorrenciaPortal(ocorrencia.status)} texto={ocorrencia.status} />
                    <span>Aberta em {formatarData(ocorrencia.dataAbertura)}</span>
                    {ocorrencia.dataResolucao && (
                      <span>· Resolvida em {formatarData(ocorrencia.dataResolucao)}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
