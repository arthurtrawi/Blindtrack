/** Usuários (ADMIN): busca, filtro por perfil/situação, criação e edição. Nunca exclui: desativa. */
import { Pencil, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { UsuarioForm } from '@/components/forms/UsuarioForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/CamposFormulario';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { Paginacao } from '@/components/ui/Paginacao';
import { useApi } from '@/hooks/useApi';
import { useFiltrosNaUrl } from '@/hooks/useFiltrosNaUrl';
import * as usuarioService from '@/services/usuario.service';
import type { PerfilUsuario, Usuario } from '@/types/usuario';
import { formatarDataHora } from '@/utils/formatacao';
import { ROTULO_PERFIL } from '@/utils/permissoes';

const CHAVES = ['busca', 'perfil', 'ativo'] as const;

export function UsuariosPage() {
  const { filtros, pagina, alterar, irParaPagina } = useFiltrosNaUrl(CHAVES);
  const [busca, setBusca] = useState(filtros.busca ?? '');
  const [formulario, setFormulario] = useState<{ usuario: Usuario | null } | null>(null);

  const { estado, recarregar } = useApi(
    (signal) =>
      usuarioService.listar(
        {
          page: pagina,
          pageSize: 20,
          busca: filtros.busca,
          perfil: filtros.perfil as PerfilUsuario | undefined,
          ativo: filtros.ativo === undefined ? undefined : filtros.ativo === 'true',
        },
        signal,
      ),
    [filtros, pagina],
  );

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    alterar({ busca: busca.trim().length >= 2 ? busca.trim() : undefined });
  }

  return (
    <>
      <PageHeader
        titulo="Usuários"
        acoes={
          <Button onClick={() => setFormulario({ usuario: null })}>
            <Plus className="size-4" aria-hidden="true" /> Novo usuário
          </Button>
        }
      />

      <Card>
        <form
          onSubmit={buscar}
          className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
          aria-label="Filtros"
        >
          <Input rotulo="Nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select
            rotulo="Perfil"
            value={filtros.perfil ?? ''}
            onChange={(e) => alterar({ perfil: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {Object.entries(ROTULO_PERFIL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
          <Select
            rotulo="Situação"
            value={filtros.ativo ?? ''}
            onChange={(e) => alterar({ ativo: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </Select>
          <Button type="submit" variante="secondary">
            <Search className="size-4" aria-hidden="true" /> Buscar
          </Button>
        </form>
      </Card>

      <Card>
        {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
        {estado.status === 'carregando' && !estado.dados && <Carregando texto="Carregando usuários..." />}
        {estado.dados?.data.length === 0 && <Vazio titulo="Nenhum usuário encontrado" />}
        {estado.dados && estado.dados.data.length > 0 && (
          <div className="space-y-4">
            <ul className="divide-y divide-slate-100">
              {estado.dados.data.map((usuario) => (
                <li key={usuario.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{usuario.nome}</p>
                      <Badge tom="neutral" texto={ROTULO_PERFIL[usuario.perfil]} />
                      {!usuario.ativo && <Badge tom="danger" texto="Inativo" />}
                    </div>
                    <p className="text-xs text-slate-600">
                      {usuario.email} · Último acesso: {formatarDataHora(usuario.ultimoLoginEm)}
                    </p>
                  </div>
                  <Button
                    tamanho="sm"
                    variante="secondary"
                    onClick={() => setFormulario({ usuario })}
                    aria-label={`Editar ${usuario.nome}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" /> Editar
                  </Button>
                </li>
              ))}
            </ul>
            <Paginacao meta={estado.dados.meta} aoMudarPagina={irParaPagina} />
          </div>
        )}
      </Card>

      {formulario && (
        <UsuarioForm
          usuario={formulario.usuario}
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
