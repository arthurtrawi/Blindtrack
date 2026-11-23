/**
 * Lista de OS: filtros (placa, cliente, status, período, atrasadas) guardados na URL,
 * ordenação feita pelo BACKEND (correta entre páginas), paginação, indicador de atraso,
 * etapa atual e responsável. Tabela no desktop; cards no mobile.
 */
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NovaOrdemDialog } from '@/components/forms/NovaOrdemDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { AtrasoBadge, StatusOsBadge } from '@/components/status/StatusOsBadge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Select } from '@/components/ui/CamposFormulario';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { Paginacao } from '@/components/ui/Paginacao';
import { useApi } from '@/hooks/useApi';
import { useFiltrosNaUrl } from '@/hooks/useFiltrosNaUrl';
import { usePermissao } from '@/hooks/usePermissao';
import { listar } from '@/services/ordemServico.service';
import type { OrdemServicoResumo, OrdenarOrdensPor, StatusOrdemServico } from '@/types/ordemServico';
import { dataParaIso, formatarData } from '@/utils/formatacao';
import { STATUS_OS, statusEtapa } from '@/utils/status';

const CHAVES = [
  'placa',
  'cliente',
  'status',
  'entradaDe',
  'entradaAte',
  'atrasada',
  'ordenarPor',
  'direcao',
] as const;
const TAMANHO_PAGINA = 20;

function CabecalhoOrdenavel({
  rotulo,
  campo,
  ordenarPor,
  direcao,
  aoOrdenar,
}: {
  rotulo: string;
  campo: OrdenarOrdensPor;
  ordenarPor: OrdenarOrdensPor;
  direcao: 'asc' | 'desc';
  aoOrdenar: (campo: OrdenarOrdensPor) => void;
}) {
  const ativo = campo === ordenarPor;
  const Icone = !ativo ? ArrowUpDown : direcao === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={ativo ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-3 py-2"
    >
      <button
        type="button"
        onClick={() => aoOrdenar(campo)}
        className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
      >
        {rotulo}
        <Icone className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

function EtapaAtual({ ordem }: { ordem: OrdemServicoResumo }) {
  if (!ordem.etapaAtual) return <span className="text-slate-500">—</span>;
  const { rotulo } = statusEtapa(ordem.etapaAtual.status, 'interno');
  return (
    <span>
      {ordem.etapaAtual.nome} <span className="text-xs text-slate-600">({rotulo.toLowerCase()})</span>
    </span>
  );
}

const OPCOES_ORDENACAO: readonly (readonly [string, string])[] = [
  ['dataEntrada:desc', 'Entrada (mais recentes)'],
  ['dataEntrada:asc', 'Entrada (mais antigas)'],
  ['previsaoEntrega:asc', 'Previsão de entrega (mais próxima)'],
  ['previsaoEntrega:desc', 'Previsão de entrega (mais distante)'],
  ['numero:desc', 'Número (maior primeiro)'],
  ['numero:asc', 'Número (menor primeiro)'],
];

export function OrdensPage() {
  const podeFazer = usePermissao();
  const navegar = useNavigate();
  const { filtros, pagina, alterar, irParaPagina, limpar } = useFiltrosNaUrl(CHAVES);
  const [novaAberta, setNovaAberta] = useState(false);
  const [rascunho, setRascunho] = useState({ placa: filtros.placa ?? '', cliente: filtros.cliente ?? '' });

  const ordenarPor = (filtros.ordenarPor as OrdenarOrdensPor | undefined) ?? 'dataEntrada';
  const direcao = (filtros.direcao as 'asc' | 'desc' | undefined) ?? 'desc';

  const { estado, recarregar } = useApi(
    (signal) =>
      listar(
        {
          page: pagina,
          pageSize: TAMANHO_PAGINA,
          placa: filtros.placa,
          cliente: filtros.cliente,
          status: filtros.status as StatusOrdemServico | undefined,
          entradaDe: filtros.entradaDe ? dataParaIso(filtros.entradaDe, '00:00') : undefined,
          entradaAte: filtros.entradaAte ? dataParaIso(filtros.entradaAte, '23:59') : undefined,
          atrasada: filtros.atrasada === 'true' ? true : undefined,
          ordenarPor,
          direcao,
        },
        signal,
      ),
    [filtros, pagina],
  );

  function aplicarBusca(evento: FormEvent) {
    evento.preventDefault();
    alterar({ placa: rascunho.placa.trim() || undefined, cliente: rascunho.cliente.trim() || undefined });
  }

  function ordenar(campo: OrdenarOrdensPor) {
    const novaDirecao = campo === ordenarPor && direcao === 'desc' ? 'asc' : 'desc';
    alterar({ ordenarPor: campo, direcao: novaDirecao });
  }

  const dados = estado.dados;

  return (
    <>
      <PageHeader
        titulo="Ordens de serviço"
        acoes={
          podeFazer('os.abrir') && (
            <Button onClick={() => setNovaAberta(true)}>
              <Plus className="size-4" aria-hidden="true" /> Nova OS
            </Button>
          )
        }
      />

      <Card>
        <form
          onSubmit={aplicarBusca}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
          aria-label="Filtros"
        >
          <div className="lg:col-span-1">
            <Input
              rotulo="Placa"
              value={rascunho.placa}
              onChange={(e) => setRascunho((r) => ({ ...r, placa: e.target.value }))}
              placeholder="ABC1D23"
            />
          </div>
          <div className="lg:col-span-2">
            <Input
              rotulo="Cliente"
              value={rascunho.cliente}
              onChange={(e) => setRascunho((r) => ({ ...r, cliente: e.target.value }))}
              placeholder="Nome do cliente"
            />
          </div>
          <Select
            rotulo="Status"
            value={filtros.status ?? ''}
            onChange={(e) => alterar({ status: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_OS).map(([valor, { rotulo }]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
          <Input
            rotulo="Entrada de"
            type="date"
            value={filtros.entradaDe ?? ''}
            onChange={(e) => alterar({ entradaDe: e.target.value || undefined })}
          />
          <Input
            rotulo="Entrada até"
            type="date"
            value={filtros.entradaAte ?? ''}
            onChange={(e) => alterar({ entradaAte: e.target.value || undefined })}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-6">
            <Checkbox
              rotulo="Somente atrasadas"
              checked={filtros.atrasada === 'true'}
              onChange={(e) => alterar({ atrasada: e.target.checked ? 'true' : undefined })}
            />
            <div className="flex gap-2">
              <Button
                variante="ghost"
                onClick={() => {
                  setRascunho({ placa: '', cliente: '' });
                  limpar();
                }}
              >
                Limpar filtros
              </Button>
              <Button type="submit" variante="secondary">
                <Search className="size-4" aria-hidden="true" /> Buscar
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card>
        {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
        {estado.status === 'carregando' && !dados && <Carregando texto="Carregando ordens de serviço..." />}
        {dados && dados.data.length === 0 && (
          <Vazio titulo="Nenhuma ordem de serviço encontrada">
            <p className="text-sm">Ajuste os filtros ou limpe a busca.</p>
          </Vazio>
        )}
        {dados && dados.data.length > 0 && (
          <div aria-busy={estado.status === 'carregando'} className="space-y-4">
            {/* A partir de 1280 px: tabela (7 colunas não cabem ao lado do menu em telas menores) */}
            <div className="relative hidden overflow-x-auto xl:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-600 uppercase">
                  <tr>
                    <CabecalhoOrdenavel
                      rotulo="Nº OS"
                      campo="numero"
                      ordenarPor={ordenarPor}
                      direcao={direcao}
                      aoOrdenar={ordenar}
                    />
                    <th scope="col" className="px-3 py-2">
                      Cliente
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Veículo
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Etapa atual
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Responsável
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
                    <CabecalhoOrdenavel
                      rotulo="Entrada"
                      campo="dataEntrada"
                      ordenarPor={ordenarPor}
                      direcao={direcao}
                      aoOrdenar={ordenar}
                    />
                    <CabecalhoOrdenavel
                      rotulo="Previsão"
                      campo="previsaoEntrega"
                      ordenarPor={ordenarPor}
                      direcao={direcao}
                      aoOrdenar={ordenar}
                    />
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dados.data.map((ordem) => (
                    <tr key={ordem.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono font-medium whitespace-nowrap">{ordem.numero}</td>
                      <td className="px-3 py-3">{ordem.cliente.nome}</td>
                      <td className="px-3 py-3">
                        {ordem.veiculo.marca} {ordem.veiculo.modelo}
                        <span className="block font-mono text-xs text-slate-600">{ordem.veiculo.placa}</span>
                      </td>
                      <td className="px-3 py-3">
                        <EtapaAtual ordem={ordem} />
                      </td>
                      <td className="px-3 py-3">
                        {ordem.etapaAtual?.responsavel?.nome ?? <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusOsBadge status={ordem.status} />
                          {ordem.prazo.atrasada && <AtrasoBadge />}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                        {formatarData(ordem.dataEntrada)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                        {formatarData(ordem.previsaoEntrega)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/painel/ordens/${ordem.id}`}
                          className="font-medium text-blue-700 hover:underline"
                          aria-label={`Abrir ${ordem.numero}`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular, tablet e notebook pequeno: cartões (a ordenação vem num seletor) */}
            <div className="max-w-xs xl:hidden">
              <Select
                rotulo="Ordenar por"
                value={`${ordenarPor}:${direcao}`}
                onChange={(e) => {
                  const [campo, sentido] = e.target.value.split(':') as [OrdenarOrdensPor, 'asc' | 'desc'];
                  alterar({ ordenarPor: campo, direcao: sentido });
                }}
              >
                {OPCOES_ORDENACAO.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <ul className="space-y-3 xl:hidden">
              {dados.data.map((ordem) => (
                <li key={ordem.id}>
                  <Link
                    to={`/painel/ordens/${ordem.id}`}
                    className="block space-y-2 rounded-lg border border-slate-200 p-4 hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{ordem.numero}</span>
                      <div className="flex flex-wrap justify-end gap-1">
                        <StatusOsBadge status={ordem.status} />
                        {ordem.prazo.atrasada && <AtrasoBadge />}
                      </div>
                    </div>
                    <p className="text-sm text-slate-900">{ordem.cliente.nome}</p>
                    <p className="text-xs text-slate-600">
                      {ordem.veiculo.marca} {ordem.veiculo.modelo} ·{' '}
                      <span className="font-mono">{ordem.veiculo.placa}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      Etapa: <EtapaAtual ordem={ordem} /> · Previsão {formatarData(ordem.previsaoEntrega)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <Paginacao meta={dados.meta} aoMudarPagina={irParaPagina} />
          </div>
        )}
      </Card>

      <NovaOrdemDialog
        aberto={novaAberta}
        aoFechar={() => setNovaAberta(false)}
        aoCriar={(ordem) => {
          setNovaAberta(false);
          navegar(`/painel/ordens/${ordem.id}`);
        }}
      />
    </>
  );
}
