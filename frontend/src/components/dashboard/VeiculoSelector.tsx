/**
 * Veículos (um por OS) do cliente. Cada item é um link para /portal/ordens/:id:
 * a seleção fica na URL (dá para recarregar ou compartilhar) e é navegável por teclado.
 */
import { Car, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AtrasoBadge, StatusOsBadge } from '@/components/status/StatusOsBadge';
import type { OrdemPortalResumo } from '@/types/portal';
import { formatarData, mascararPlaca } from '@/utils/formatacao';

interface VeiculoSelectorProps {
  ordens: readonly OrdemPortalResumo[];
  selecionadaId: string | undefined;
}

export function VeiculoSelector({ ordens, selecionadaId }: VeiculoSelectorProps) {
  return (
    <nav aria-label="Seus veículos">
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ordens.map((ordem) => {
          const selecionada = ordem.id === selecionadaId;
          return (
            <li key={ordem.id}>
              <Link
                to={`/portal/ordens/${ordem.id}`}
                aria-current={selecionada ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition-colors hover:border-blue-300 ${
                  selecionada ? 'border-blue-700 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <Car
                  className={`size-6 shrink-0 ${selecionada ? 'text-blue-700' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium text-slate-900">
                    {ordem.veiculo.marca} {ordem.veiculo.modelo}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-mono" aria-label={`Placa final ${ordem.veiculo.placa.slice(-2)}`}>
                      {mascararPlaca(ordem.veiculo.placa)}
                    </span>
                    {' · '}
                    <span className="font-mono">{ordem.numero}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusOsBadge status={ordem.status} />
                    {ordem.atrasada && ordem.status !== 'ENTREGUE' && <AtrasoBadge />}
                  </div>
                  <p className="text-xs text-slate-600">
                    {ordem.etapaAtual ? `Etapa: ${ordem.etapaAtual} · ` : ''}
                    {ordem.status === 'ENTREGUE'
                      ? `Entregue em ${formatarData(ordem.dataEntrega)}`
                      : `Previsão: ${formatarData(ordem.previsaoEntrega)}`}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
