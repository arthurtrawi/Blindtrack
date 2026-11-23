/**
 * Portal do cliente: veículos (um por OS), progresso, linha do tempo da blindagem,
 * ocorrências, documentos e atualizações. SOMENTE LEITURA: não há nenhum controle de edição.
 * O isolamento entre clientes é garantido pelo backend (OS de outro cliente → 404).
 */
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DocumentosPortal } from '@/components/dashboard/DocumentosPortal';
import { OcorrenciasPortal } from '@/components/dashboard/OcorrenciasPortal';
import { ProgressoCard } from '@/components/dashboard/ProgressoCard';
import { VeiculoSelector } from '@/components/dashboard/VeiculoSelector';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { AtrasoBadge, StatusOsBadge } from '@/components/status/StatusOsBadge';
import { AtualizacoesPortal } from '@/components/timeline/AtualizacoesPortal';
import { BlindagemTimeline } from '@/components/timeline/BlindagemTimeline';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { acompanhar, minhasOrdens } from '@/services/portal.service';
import type { OrdemPortalDetalhe } from '@/types/portal';
import { formatarData, formatarPlaca, mascararPlaca, primeiroNome } from '@/utils/formatacao';

/** O backend limita a página a 100; um cliente não costuma ter tantas OS. */
const LIMITE_ORDENS = 100;

export function PortalDashboardPage() {
  const { usuario } = useAuth();
  const { id: idDaUrl } = useParams();
  const ordens = useApi((signal) => minhasOrdens({ pageSize: LIMITE_ORDENS }, signal), []);
  const lista = ordens.estado.dados?.data ?? [];
  const selecionadaId = idDaUrl ?? lista[0]?.id;

  return (
    <PortalLayout>
      <section aria-labelledby="titulo-portal" className="space-y-1">
        <h1 id="titulo-portal" className="text-2xl font-semibold tracking-tight text-marinho-900 md:text-3xl">
          Olá, {usuario ? primeiroNome(usuario.nome) : ''}!
        </h1>
        <p className="text-slate-600">Acompanhe aqui a blindagem dos seus veículos.</p>
      </section>

      {ordens.estado.status === 'carregando' && !ordens.estado.dados && (
        <Carregando texto="Carregando seus veículos..." />
      )}
      {ordens.estado.status === 'erro' && (
        <ErroCarregamento erro={ordens.estado.erro} aoTentarNovamente={ordens.recarregar} />
      )}

      {ordens.estado.dados && lista.length === 0 && (
        <Card>
          <Vazio titulo="Nenhuma ordem de serviço encontrada">
            <p className="text-sm">
              Quando seu veículo der entrada na empresa, o acompanhamento aparecerá aqui.
            </p>
          </Vazio>
        </Card>
      )}

      {lista.length > 0 && (
        <>
          <section aria-labelledby="titulo-veiculos" className="space-y-3">
            <h2 id="titulo-veiculos" className="text-lg font-semibold text-slate-900">
              {lista.length > 1 ? 'Seus veículos' : 'Seu veículo'}
            </h2>
            <VeiculoSelector ordens={lista} selecionadaId={selecionadaId} />
          </section>

          {selecionadaId && <DetalheOrdem key={selecionadaId} ordemId={selecionadaId} />}
        </>
      )}
    </PortalLayout>
  );
}

function DetalheOrdem({ ordemId }: { ordemId: string }) {
  const { estado, recarregar } = useApi((signal) => acompanhar(ordemId, signal), [ordemId]);

  if (estado.status === 'erro' && estado.erro.status === 404) {
    return (
      <Card>
        <Vazio titulo="Ordem de serviço não encontrada">
          <Link to="/portal" className="text-sm font-medium text-blue-700 hover:underline">
            Voltar aos meus veículos
          </Link>
        </Vazio>
      </Card>
    );
  }
  if (estado.status === 'erro') return <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />;
  // Só exibe dados desta OS (ao trocar de veículo, não mostra a anterior).
  if (!estado.dados || estado.dados.id !== ordemId)
    return <Carregando texto="Carregando o acompanhamento..." />;

  const ordem = estado.dados;
  return (
    <section aria-labelledby="titulo-ordem" className="space-y-6">
      <CabecalhoOrdem ordem={ordem} />
      <ProgressoCard ordem={ordem} />
      <Card titulo="Linha do tempo da blindagem">
        <BlindagemTimeline etapas={ordem.etapas} />
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <OcorrenciasPortal ocorrencias={ordem.ocorrencias} />
        <DocumentosPortal documentos={ordem.documentos} />
      </div>
      <AtualizacoesPortal itens={ordem.linhaDoTempo} />
    </section>
  );
}

function CabecalhoOrdem({ ordem }: { ordem: OrdemPortalDetalhe }) {
  const [placaVisivel, setPlacaVisivel] = useState(false);
  const { veiculo } = ordem;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-slate-200 pt-6">
      <div className="space-y-1">
        <h2 id="titulo-ordem" className="text-xl font-semibold text-marinho-900">
          {veiculo.marca} {veiculo.modelo}{' '}
          <span className="font-normal text-slate-600">{veiculo.anoModelo}</span>
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
          <span>{veiculo.cor}</span>
          <span aria-hidden="true">·</span>
          <span>
            Placa{' '}
            <span className="font-mono text-slate-900">
              {placaVisivel ? formatarPlaca(veiculo.placa) : mascararPlaca(veiculo.placa)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setPlacaVisivel((v) => !v)}
            aria-pressed={placaVisivel}
            aria-label={placaVisivel ? 'Ocultar placa' : 'Mostrar placa'}
            className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {placaVisivel ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
          <span aria-hidden="true">·</span>
          <span>
            OS <span className="font-mono text-slate-900">{ordem.numero}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Entrada em {formatarData(ordem.dataEntrada)}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatusOsBadge status={ordem.status} />
        {ordem.atrasada && ordem.status !== 'ENTREGUE' && <AtrasoBadge />}
      </div>
    </div>
  );
}
