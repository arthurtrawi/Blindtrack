/**
 * Configurações: modelo de etapas (ADMIN, GESTOR). Alterações valem só para NOVAS OS; as já
 * abertas têm cópia própria das etapas (RN04). ENTREGA é sempre a última ativa, e VISTORIA,
 * INSPECAO_FINAL e ENTREGA são sempre obrigatórias (o backend recusa o contrário).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Textarea } from '@/components/ui/CamposFormulario';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/useToast';
import * as modeloService from '@/services/modeloEtapa.service';
import type { ModeloEtapa } from '@/types/ordemServico';
import { aplicarErrosDaApi } from '@/utils/formularios';
import { campoTexto } from '@/utils/validacao';

const esquema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,39}$/, 'Letras maiúsculas, números e _ (2 a 40 caracteres)'),
  nome: campoTexto(2, 80, 'Nome'),
  descricao: z.string().trim().max(2000),
  ordem: z.coerce.number('Ordem inválida').int().min(1).max(32000),
  obrigatoria: z.boolean(),
  ativo: z.boolean(),
});
type Entrada = z.input<typeof esquema>;
type Saida = z.output<typeof esquema>;

function ModeloForm({
  modelo,
  aoFechar,
  aoSalvar,
}: {
  modelo: ModeloEtapa | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const { notificar } = useToast();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Entrada, unknown, Saida>({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: modelo?.codigo ?? '',
      nome: modelo?.nome ?? '',
      descricao: modelo?.descricao ?? '',
      ordem: modelo?.ordem ?? 10,
      obrigatoria: modelo?.obrigatoria ?? true,
      ativo: modelo?.ativo ?? true,
    },
  });

  async function salvar(dados: Saida) {
    setErroGeral(null);
    try {
      if (modelo) {
        await modeloService.atualizar(modelo.id, {
          nome: dados.nome,
          descricao: dados.descricao || undefined,
          ordem: dados.ordem,
          obrigatoria: dados.obrigatoria,
          ativo: dados.ativo,
        });
      } else {
        await modeloService.criar({
          codigo: dados.codigo,
          nome: dados.nome,
          descricao: dados.descricao || undefined,
          ordem: dados.ordem,
          obrigatoria: dados.obrigatoria,
        });
      }
      notificar('sucesso', modelo ? 'Etapa atualizada.' : 'Etapa criada.');
      aoSalvar();
    } catch (erro) {
      setErroGeral(aplicarErrosDaApi(erro, setError, ['codigo', 'nome', 'descricao', 'ordem'] as const));
    }
  }

  return (
    <Modal
      aberto
      titulo={modelo ? `Editar etapa ${modelo.codigo}` : 'Nova etapa'}
      aoFechar={aoFechar}
      bloqueado={isSubmitting}
      acoes={
        <>
          <Button variante="secondary" onClick={aoFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-modelo" carregando={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-modelo" noValidate onSubmit={handleSubmit(salvar)} className="space-y-4">
        {erroGeral && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {erroGeral}
          </p>
        )}
        <Input
          rotulo="Código"
          readOnly={Boolean(modelo)}
          dica={modelo ? 'O código não muda: é usado pelas regras do sistema.' : 'Ex.: POLIMENTO'}
          erro={errors.codigo?.message}
          {...register('codigo')}
        />
        <Input rotulo="Nome" erro={errors.nome?.message} {...register('nome')} />
        <Textarea
          rotulo="Descrição (exibida ao cliente no portal)"
          erro={errors.descricao?.message}
          {...register('descricao')}
        />
        <Input
          rotulo="Ordem"
          type="number"
          dica="Posição na sequência (intervalos de 10 permitem inserir etapas entre as existentes)."
          erro={errors.ordem?.message}
          {...register('ordem')}
        />
        <Checkbox
          rotulo="Obrigatória"
          dica="Etapas não obrigatórias podem ser dispensadas pela gestão."
          {...register('obrigatoria')}
        />
        {modelo && (
          <Checkbox rotulo="Ativa" dica="Etapas inativas não entram nas novas OS." {...register('ativo')} />
        )}
      </form>
    </Modal>
  );
}

export function ModelosEtapaPage() {
  const { estado, recarregar } = useApi((signal) => modeloService.listar(signal), []);
  const [formulario, setFormulario] = useState<{ modelo: ModeloEtapa | null } | null>(null);

  return (
    <>
      <PageHeader
        titulo="Configurações"
        descricao="Modelo de etapas da blindagem"
        acoes={
          <Button onClick={() => setFormulario({ modelo: null })}>
            <Plus className="size-4" aria-hidden="true" /> Nova etapa
          </Button>
        }
      />
      <p className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        As alterações valem apenas para novas ordens de serviço. As OS já abertas mantêm as etapas copiadas na
        abertura.
      </p>

      <Card>
        {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
        {estado.status === 'carregando' && !estado.dados && <Carregando texto="Carregando etapas..." />}
        {estado.dados?.length === 0 && <Vazio titulo="Nenhuma etapa configurada" />}
        {estado.dados && estado.dados.length > 0 && (
          <ol className="divide-y divide-slate-100">
            {estado.dados.map((modelo) => (
              <li key={modelo.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <span className="w-12 font-mono text-sm text-slate-500 tabular-nums">{modelo.ordem}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-medium ${modelo.ativo ? 'text-slate-900' : 'text-slate-500'}`}>
                      {modelo.nome}
                    </p>
                    <span className="font-mono text-xs text-slate-500">{modelo.codigo}</span>
                    {modelo.obrigatoria ? (
                      <Badge tom="info" texto="Obrigatória" />
                    ) : (
                      <Badge tom="neutral" texto="Dispensável" />
                    )}
                    {!modelo.ativo && <Badge tom="danger" texto="Inativa" />}
                  </div>
                  {modelo.descricao && <p className="text-xs text-slate-600">{modelo.descricao}</p>}
                </div>
                <Button
                  tamanho="sm"
                  variante="secondary"
                  onClick={() => setFormulario({ modelo })}
                  aria-label={`Editar etapa ${modelo.nome}`}
                >
                  <Pencil className="size-4" aria-hidden="true" /> Editar
                </Button>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {formulario && (
        <ModeloForm
          modelo={formulario.modelo}
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
