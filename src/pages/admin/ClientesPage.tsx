/**
 * Clientes: busca, paginação, cadastro, edição e inativação lógica.
 * TECNICO consulta só nome e documento mascarado (projeção feita pelo backend, LGPD).
 */
import { Pencil, Plus, Search, UserX } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ClienteForm } from '@/components/forms/ClienteForm';
import { JustificativaDialog } from '@/components/forms/JustificativaDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { Paginacao } from '@/components/ui/Paginacao';
import { useApi } from '@/hooks/useApi';
import { useFiltrosNaUrl } from '@/hooks/useFiltrosNaUrl';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import * as clienteService from '@/services/cliente.service';
import { clienteCompleto, type Cliente, type ClienteVisivel } from '@/types/cliente';

const CHAVES = ['nome', 'documento'] as const;

function formatarDocumento(doc: string): string {
  if (/^\d{11}$/.test(doc)) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (/^[0-9A-Z]{14}$/.test(doc)) return doc.replace(/(.{2})(.{3})(.{3})(.{4})(.{2})/, '$1.$2.$3/$4-$5');
  return doc; // já mascarado pelo backend (TECNICO)
}

export function ClientesPage() {
  const podeFazer = usePermissao();
  const { notificar, notificarErro } = useToast();
  const { filtros, pagina, alterar, irParaPagina } = useFiltrosNaUrl(CHAVES);
  const [rascunho, setRascunho] = useState({ nome: filtros.nome ?? '', documento: filtros.documento ?? '' });
  const [formulario, setFormulario] = useState<{ cliente: Cliente | null } | null>(null);
  const [inativar, setInativar] = useState<ClienteVisivel | null>(null);

  const { estado, recarregar } = useApi(
    (signal) =>
      clienteService.listar(
        { page: pagina, pageSize: 20, nome: filtros.nome, documento: filtros.documento },
        signal,
      ),
    [filtros, pagina],
  );

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    alterar({ nome: rascunho.nome.trim() || undefined, documento: rascunho.documento.trim() || undefined });
  }

  async function confirmarInativacao() {
    if (!inativar) return;
    try {
      await clienteService.inativar(inativar.id);
      notificar('sucesso', `Cliente "${inativar.nome}" inativado.`);
      setInativar(null);
      recarregar();
    } catch (erro) {
      notificarErro(erro, 'Não foi possível inativar o cliente');
      throw erro;
    }
  }

  return (
    <>
      <PageHeader
        titulo="Clientes"
        acoes={
          podeFazer('cliente.editar') && (
            <Button onClick={() => setFormulario({ cliente: null })}>
              <Plus className="size-4" aria-hidden="true" /> Novo cliente
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
            rotulo="Nome"
            value={rascunho.nome}
            onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
          />
          <Input
            rotulo="CPF/CNPJ"
            value={rascunho.documento}
            onChange={(e) => setRascunho((r) => ({ ...r, documento: e.target.value }))}
          />
          <Button type="submit" variante="secondary" className="mb-0">
            <Search className="size-4" aria-hidden="true" /> Buscar
          </Button>
        </form>
      </Card>

      <Card>
        {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
        {estado.status === 'carregando' && !estado.dados && <Carregando texto="Carregando clientes..." />}
        {estado.dados?.data.length === 0 && <Vazio titulo="Nenhum cliente encontrado" />}
        {estado.dados && estado.dados.data.length > 0 && (
          <div className="space-y-4">
            <ul className="divide-y divide-slate-100">
              {estado.dados.data.map((cliente) => (
                <li key={cliente.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{cliente.nome}</p>
                    <p className="text-xs text-slate-600">
                      {cliente.tipoPessoa === 'FISICA' ? 'CPF' : 'CNPJ'}{' '}
                      <span className="font-mono">{formatarDocumento(cliente.cpfCnpj)}</span>
                      {clienteCompleto(cliente) && (
                        <>
                          {' '}
                          · {cliente.email} · {cliente.telefone}
                          {cliente.cidade && ` · ${cliente.cidade}/${cliente.uf ?? ''}`}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {podeFazer('cliente.editar') && clienteCompleto(cliente) && (
                      <Button
                        tamanho="sm"
                        variante="secondary"
                        onClick={() => setFormulario({ cliente })}
                        aria-label={`Editar ${cliente.nome}`}
                      >
                        <Pencil className="size-4" aria-hidden="true" /> Editar
                      </Button>
                    )}
                    {podeFazer('cliente.inativar') && (
                      <Button
                        tamanho="sm"
                        variante="ghost"
                        onClick={() => setInativar(cliente)}
                        aria-label={`Inativar ${cliente.nome}`}
                      >
                        <UserX className="size-4" aria-hidden="true" /> Inativar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Paginacao meta={estado.dados.meta} aoMudarPagina={irParaPagina} />
          </div>
        )}
      </Card>

      {formulario && (
        <ClienteForm
          cliente={formulario.cliente}
          aoFechar={() => setFormulario(null)}
          aoSalvar={() => {
            setFormulario(null);
            recarregar();
          }}
        />
      )}

      {inativar && (
        <JustificativaDialog
          aberto
          titulo="Inativar cliente"
          descricao={
            <>
              <p>
                Inativar <strong>{inativar.nome}</strong>? O histórico das ordens de serviço é preservado e o
                acesso ao portal é desativado.
              </p>
              <p className="mt-2">
                Clientes com ordens de serviço em aberto não podem ser inativados (RN36).
              </p>
            </>
          }
          rotuloConfirmar="Inativar"
          exigeJustificativa={false}
          perigo
          aoCancelar={() => setInativar(null)}
          aoConfirmar={confirmarInativacao}
        />
      )}
    </>
  );
}
