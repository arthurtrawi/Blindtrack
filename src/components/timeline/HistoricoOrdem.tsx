/**
 * Linha do tempo interna (histórico imutável + replanejamentos), da mais recente para a
 * mais antiga. Diferente do portal, aqui aparecem as descrições internas e os usuários.
 */
import { CalendarClock, History } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { useApi } from '@/hooks/useApi';
import { linhaDoTempo } from '@/services/ordemServico.service';
import { formatarData, formatarDataHora } from '@/utils/formatacao';

export function HistoricoOrdem({ ordemId, versao }: { ordemId: string; versao: number }) {
  const { estado, recarregar } = useApi((signal) => linhaDoTempo(ordemId, signal), [ordemId, versao]);

  if (estado.status === 'erro') return <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />;
  if (!estado.dados) return <Carregando texto="Carregando histórico..." />;
  if (estado.dados.length === 0) return <Vazio titulo="Sem registros no histórico" />;

  const itens = [...estado.dados].sort((a, b) => b.data.localeCompare(a.data));
  return (
    <ol className="space-y-4" aria-label="Histórico da ordem de serviço">
      {itens.map((item, indice) => {
        const replanejamento = item.tipo === 'REPLANEJAMENTO';
        const Icone = replanejamento ? CalendarClock : History;
        const detalhes = item.detalhes as {
          previsaoAnterior?: string;
          previsaoNova?: string;
          justificativa?: string;
        };
        return (
          <li key={`${item.data}-${indice}`} className="flex gap-3">
            <Icone
              className={`mt-0.5 size-5 shrink-0 ${replanejamento ? 'text-amber-700' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-900">{item.descricao}</p>
                {replanejamento && <Badge tom="warning" texto="Replanejamento" />}
              </div>
              {replanejamento && (
                <p className="text-xs text-slate-700">
                  {formatarData(detalhes.previsaoAnterior)} → {formatarData(detalhes.previsaoNova)}
                  {detalhes.justificativa && ` · ${detalhes.justificativa}`}
                </p>
              )}
              <p className="text-xs text-slate-600">
                {formatarDataHora(item.data)} · {item.usuario.nome}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
