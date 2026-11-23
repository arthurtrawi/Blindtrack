/** Veículos: busca por placa e marca/modelo, paginação, cadastro e edição. */
import { Pencil, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { VeiculoForm } from '@/components/forms/VeiculoForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { Paginacao } from '@/components/ui/Paginacao';
import { useApi } from '@/hooks/useApi';
import { useFiltrosNaUrl } from '@/hooks/useFiltrosNaUrl';
import { usePermissao } from '@/hooks/usePermissao';
import * as veiculoService from '@/services/veiculo.service';
import type { Veiculo } from '@/types/veiculo';
import { formatarPlaca } from '@/utils/formatacao';

const CHAVES = ['placa', 'busca'] as const;

export function VeiculosPage() {
  const podeFazer = usePermissao();
  const { filtros, pagina, alterar, irParaPagina } = useFiltrosNaUrl(CHAVES);
  const [rascunho, setRascunho] = useState({ placa: filtros.placa ?? '', busca: filtros.busca ?? '' });
  const [formulario, setFormulario] = useState<{ veiculo: Veiculo | null } | null>(null);

  const { estado, recarregar } = useApi(
    (signal) =>
      veiculoService.listar(
        { page: pagina, pageSize: 20, placa: filtros.placa, busca: filtros.busca },
        signal,
      ),
    [filtros, pagina],
  );

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    alterar({ placa: rascunho.placa.trim() || undefined, busca: rascunho.busca.trim() || undefined });
  }

  return (
    <>
      <PageHeader
        titulo="Veículos"
        acoes={
          podeFazer('veiculo.editar') && (
            <Button onClick={() => setFormulario({ veiculo: null })}>
              <Plus className="size-4" aria-hidden="true" /> Novo veículo
            </Button>
          )
        }
      />

      <Card>
        <form
          onSubmit={buscar}
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          aria-label="Filtros"
        >
          <Input
            rotulo="Placa"
            value={rascunho.placa}
            onChange={(e) => setRascunho((r) => ({ ...r, placa: e.target.value }))}
          />
          <Input
            rotulo="Marca ou modelo"
            value={rascunho.busca}
            onChange={(e) => setRascunho((r) => ({ ...r, busca: e.target.value }))}
          />
          <Button type="submit" variante="secondary">
            <Search className="size-4" aria-hidden="true" /> Buscar
          </Button>
        </form>
      </Card>

      <Card>
        {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
        {estado.status === 'carregando' && !estado.dados && <Carregando texto="Carregando veículos..." />}
        {estado.dados?.data.length === 0 && <Vazio titulo="Nenhum veículo encontrado" />}
        {estado.dados && estado.dados.data.length > 0 && (
          <div className="space-y-4">
            <ul className="divide-y divide-slate-100">
              {estado.dados.data.map((veiculo) => (
                <li key={veiculo.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {veiculo.marca} {veiculo.modelo}{' '}
                      <span className="font-normal text-slate-600">
                        {veiculo.anoFabricacao}/{veiculo.anoModelo} · {veiculo.cor}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-mono">{formatarPlaca(veiculo.placa)}</span> · Chassi{' '}
                      <span className="font-mono">{veiculo.chassi}</span> · Proprietário:{' '}
                      {veiculo.cliente.nome}
                    </p>
                  </div>
                  {podeFazer('veiculo.editar') && (
                    <Button
                      tamanho="sm"
                      variante="secondary"
                      onClick={() => setFormulario({ veiculo })}
                      aria-label={`Editar ${veiculo.placa}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" /> Editar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <Paginacao meta={estado.dados.meta} aoMudarPagina={irParaPagina} />
          </div>
        )}
      </Card>

      {formulario && (
        <VeiculoForm
          veiculo={formulario.veiculo}
          aoFechar={() => setFormulario(null)}
          aoSalvar={() => {
            setFormulario(null);
            recarregar();
          }}
        />
      )}
    </>
  );
}
