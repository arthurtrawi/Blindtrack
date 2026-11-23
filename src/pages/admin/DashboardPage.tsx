/**
 * Dashboard do painel: indicadores REAIS de GET /dashboard/indicadores e as OS atrasadas
 * (GET /ordens-servico?atrasada=true). O gráfico de OS por status usa os mesmos números;
 * sem dados, mostra estado vazio (nunca valores de exemplo).
 */
import {
  AlarmClock,
  CalendarClock,
  ClipboardList,
  Loader,
  MessageSquareWarning,
  PackageCheck,
  TimerOff,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusOsBadge } from '@/components/status/StatusOsBadge';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { useApi } from '@/hooks/useApi';
import { indicadores as carregarIndicadores } from '@/services/dashboard.service';
import { listar as listarOrdens } from '@/services/ordemServico.service';
import type { StatusOrdemServico } from '@/types/ordemServico';
import { formatarData, formatarDataHora, plural } from '@/utils/formatacao';
import { STATUS_OS } from '@/utils/status';

interface IndicadorProps {
  rotulo: string;
  valor: number;
  icone: LucideIcon;
  destaque?: 'alerta' | 'critico';
  /** Link para a lista filtrada, quando existir filtro correspondente na API. */
  para?: string;
}

function Indicador({ rotulo, valor, icone: Icone, destaque, para }: IndicadorProps) {
  const cor =
    destaque === 'critico' && valor > 0
      ? 'text-red-800'
      : destaque === 'alerta' && valor > 0
        ? 'text-amber-800'
        : 'text-marinho-900';
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">{rotulo}</p>
        <Icone className="size-5 text-slate-400" aria-hidden="true" />
      </div>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${cor}`}>{valor}</p>
    </>
  );
  const classe = 'block rounded-lg border border-slate-200 bg-white p-4 shadow-sm';
  return para ? (
    <Link to={para} className={`${classe} transition-colors hover:border-blue-300`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

const ORDEM_STATUS: StatusOrdemServico[] = [
  'ABERTA',
  'EM_ANDAMENTO',
  'SUSPENSA',
  'PRONTA_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADA',
];

function GraficoPorStatus({ porStatus }: { porStatus: Record<StatusOrdemServico, number> }) {
  const maximo = Math.max(...Object.values(porStatus));
  if (maximo === 0) return <Vazio titulo="Ainda não há ordens de serviço" />;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Quantidade de ordens de serviço por status</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Status</th>
          <th scope="col">Quantidade</th>
        </tr>
      </thead>
      <tbody>
        {ORDEM_STATUS.map((status) => (
          <tr key={status}>
            <th scope="row" className="w-44 py-1.5 pr-3 text-left font-normal text-slate-700">
              <Link to={`/painel/ordens?status=${status}`} className="hover:underline">
                {STATUS_OS[status].rotulo}
              </Link>
            </th>
            <td className="py-1.5">
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-blue-700"
                    style={{ width: `${(porStatus[status] / maximo) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums">{porStatus[status]}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DashboardPage() {
  const indicadores = useApi((signal) => carregarIndicadores(signal), []);
  const atrasadas = useApi(
    (signal) =>
      listarOrdens({ atrasada: true, pageSize: 5, ordenarPor: 'previsaoEntrega', direcao: 'asc' }, signal),
    [],
  );
  const dados = indicadores.estado.dados;

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao={dados ? `Atualizado em ${formatarDataHora(dados.geradoEm)}` : 'Visão geral da operação'}
      />

      {indicadores.estado.status === 'carregando' && !dados && (
        <Carregando texto="Carregando indicadores..." />
      )}
      {indicadores.estado.status === 'erro' && (
        <ErroCarregamento erro={indicadores.estado.erro} aoTentarNovamente={indicadores.recarregar} />
      )}

      {dados && (
        <>
          <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              rotulo="Ordens ativas"
              valor={dados.ordensAtivas}
              icone={ClipboardList}
              para="/painel/ordens"
            />
            <Indicador
              rotulo="Em andamento"
              valor={dados.porStatus.EM_ANDAMENTO}
              icone={Loader}
              para="/painel/ordens?status=EM_ANDAMENTO"
            />
            <Indicador
              rotulo="Ordens atrasadas"
              valor={dados.ordensAtrasadas}
              icone={AlarmClock}
              destaque="critico"
              para="/painel/ordens?atrasada=true"
            />
            <Indicador
              rotulo="Prontas para entrega"
              valor={dados.porStatus.PRONTA_PARA_ENTREGA}
              icone={PackageCheck}
              para="/painel/ordens?status=PRONTA_PARA_ENTREGA"
            />
            <Indicador
              rotulo="Entregas nos próximos 7 dias"
              valor={dados.entregasProximos7Dias}
              icone={CalendarClock}
            />
            <Indicador
              rotulo="Ocorrências ativas"
              valor={dados.ocorrenciasAtivas}
              icone={MessageSquareWarning}
              destaque="alerta"
            />
            <Indicador rotulo="Etapas em curso" valor={dados.etapasEmCurso} icone={Loader} />
            <Indicador
              rotulo="Etapas atrasadas"
              valor={dados.etapasAtrasadas}
              icone={TimerOff}
              destaque="critico"
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card titulo="Ordens por status">
              <GraficoPorStatus porStatus={dados.porStatus} />
            </Card>

            <Card
              titulo="Atrasadas há mais tempo"
              acoes={
                <Link
                  to="/painel/ordens?atrasada=true"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  Ver todas
                </Link>
              }
            >
              {atrasadas.estado.status === 'erro' && (
                <ErroCarregamento erro={atrasadas.estado.erro} aoTentarNovamente={atrasadas.recarregar} />
              )}
              {atrasadas.estado.status === 'carregando' && !atrasadas.estado.dados && <Carregando />}
              {atrasadas.estado.dados &&
                (atrasadas.estado.dados.data.length === 0 ? (
                  <Vazio titulo="Nenhuma ordem atrasada" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {atrasadas.estado.dados.data.map((ordem) => (
                      <li key={ordem.id}>
                        <Link
                          to={`/painel/ordens/${ordem.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-slate-900">{ordem.numero}</p>
                            <p className="truncate text-xs text-slate-600">
                              {ordem.cliente.nome} · {ordem.veiculo.placa}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <StatusOsBadge status={ordem.status} />
                            <span className="font-medium text-red-800">
                              {plural(ordem.prazo.diasAtraso, 'dia')} · prev.{' '}
                              {formatarData(ordem.previsaoEntrega)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
