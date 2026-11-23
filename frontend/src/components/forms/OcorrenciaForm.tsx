/**
 * Registro de ocorrência (RF29). Regras espelhadas do backend (o backend valida de novo):
 * - visível ao cliente exige um texto próprio para ele (a descrição interna nunca é exposta);
 * - replanejar a entrega junto (RN23) só para ADMIN/GESTOR;
 * - o responsável é escolhido entre TECNICO/GESTOR por quem pode listar responsáveis
 *   (ADMIN/GESTOR); para os demais perfis, o próprio usuário fica como responsável.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Checkbox, Select, Textarea } from '@/components/ui/CamposFormulario';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/services/api';
import * as ocorrenciaService from '@/services/ocorrencia.service';
import { responsaveis as carregarResponsaveis } from '@/services/usuario.service';
import type { Etapa } from '@/types/ordemServico';
import { dataParaIso, hojeLocal } from '@/utils/formatacao';
import { ROTULO_PRIORIDADE, ROTULO_TIPO_OCORRENCIA } from '@/utils/status';

const esquema = z
  .object({
    titulo: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(150),
    descricao: z.string().trim().min(5, 'Mínimo de 5 caracteres').max(5000),
    tipo: z.enum(['AGUARDANDO_PECA', 'PENDENCIA_DOCUMENTAL', 'RETRABALHO', 'ATRASO', 'OUTROS']),
    prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
    etapaProcessoId: z.string(),
    usuarioResponsavelId: z.string().min(1, 'Selecione o responsável'),
    impeditiva: z.boolean(),
    visivelCliente: z.boolean(),
    descricaoCliente: z.string().trim().max(1000),
    novaPrevisaoEntrega: z.string(),
  })
  .refine((d) => !d.visivelCliente || d.descricaoCliente.length >= 5, {
    message: 'Escreva o texto que o cliente verá (mínimo de 5 caracteres)',
    path: ['descricaoCliente'],
  });
type DadosOcorrencia = z.infer<typeof esquema>;
const CAMPOS = [
  'titulo',
  'descricao',
  'usuarioResponsavelId',
  'descricaoCliente',
  'novaPrevisaoEntrega',
] as const;

interface OcorrenciaFormProps {
  aberto: boolean;
  ordemId: string;
  etapas: readonly Etapa[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function OcorrenciaForm({ aberto, ordemId, etapas, aoFechar, aoSalvar }: OcorrenciaFormProps) {
  const { usuario } = useAuth();
  const podeFazer = usePermissao();
  const { notificar, notificarErro } = useToast();
  const gestao = podeFazer('etapa.atribuirResponsavel'); // ADMIN/GESTOR: podem listar responsáveis
  const responsaveis = useApi(
    (signal) => (gestao ? carregarResponsaveis(signal) : Promise.resolve([])),
    [gestao],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DadosOcorrencia>({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: '',
      descricao: '',
      tipo: 'OUTROS',
      prioridade: 'MEDIA',
      etapaProcessoId: '',
      usuarioResponsavelId: gestao ? '' : (usuario?.id ?? ''),
      impeditiva: false,
      visivelCliente: false,
      descricaoCliente: '',
      novaPrevisaoEntrega: '',
    },
  });
  const visivel = useWatch({ control, name: 'visivelCliente' });

  function fechar() {
    reset();
    aoFechar();
  }

  async function salvar(dados: DadosOcorrencia) {
    try {
      await ocorrenciaService.abrir(ordemId, {
        titulo: dados.titulo,
        descricao: dados.descricao,
        tipo: dados.tipo,
        prioridade: dados.prioridade,
        etapaProcessoId: dados.etapaProcessoId || undefined,
        usuarioResponsavelId: dados.usuarioResponsavelId,
        impeditiva: dados.impeditiva,
        visivelCliente: dados.visivelCliente,
        descricaoCliente: dados.visivelCliente ? dados.descricaoCliente : undefined,
        novaPrevisaoEntrega: dados.novaPrevisaoEntrega ? dataParaIso(dados.novaPrevisaoEntrega) : undefined,
      });
      notificar('sucesso', 'Ocorrência registrada.');
      reset();
      aoSalvar();
    } catch (erro) {
      if (erro instanceof ApiError) {
        for (const { campo, mensagem } of erro.errosDeCampo) {
          if ((CAMPOS as readonly string[]).includes(campo)) {
            setError(campo as keyof DadosOcorrencia, { message: mensagem });
          }
        }
      }
      notificarErro(erro, 'Não foi possível registrar a ocorrência');
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Registrar ocorrência"
      aoFechar={fechar}
      bloqueado={isSubmitting}
      largura="lg"
      acoes={
        <>
          <Button variante="secondary" onClick={fechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-ocorrencia" carregando={isSubmitting}>
            Registrar
          </Button>
        </>
      }
    >
      <form
        id="form-ocorrencia"
        noValidate
        onSubmit={handleSubmit(salvar)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <Input rotulo="Título" erro={errors.titulo?.message} {...register('titulo')} />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            rotulo="Descrição (interna)"
            erro={errors.descricao?.message}
            dica="Uso interno: nunca é exibida ao cliente."
            {...register('descricao')}
          />
        </div>
        <Select rotulo="Tipo" {...register('tipo')}>
          {Object.entries(ROTULO_TIPO_OCORRENCIA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
        <Select rotulo="Prioridade" {...register('prioridade')}>
          {Object.entries(ROTULO_PRIORIDADE).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
        <Select rotulo="Etapa afetada (opcional)" {...register('etapaProcessoId')}>
          <option value="">Nenhuma etapa específica</option>
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Select>
        {gestao ? (
          <Select
            rotulo="Responsável"
            erro={errors.usuarioResponsavelId?.message}
            {...register('usuarioResponsavelId')}
          >
            <option value="">Selecione</option>
            {(responsaveis.estado.dados ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Select>
        ) : (
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-slate-800">Responsável</p>
            <p className="text-slate-700">{usuario?.nome} (você)</p>
          </div>
        )}
        <div className="space-y-3 sm:col-span-2">
          <Checkbox
            rotulo="Impeditiva"
            dica="Bloqueia a conclusão da etapa afetada até ser resolvida (RN12)."
            {...register('impeditiva')}
          />
          <Checkbox
            rotulo="Visível ao cliente"
            dica="Aparece no portal com o texto abaixo."
            {...register('visivelCliente')}
          />
        </div>
        {visivel && (
          <div className="sm:col-span-2">
            <Textarea
              rotulo="Texto para o cliente"
              erro={errors.descricaoCliente?.message}
              {...register('descricaoCliente')}
            />
          </div>
        )}
        {podeFazer('ocorrencia.replanejarEntrega') && (
          <div className="sm:col-span-2">
            <Input
              rotulo="Nova previsão de entrega (opcional)"
              type="date"
              min={hojeLocal()}
              dica="Se informada, a entrega é replanejada com esta ocorrência como justificativa (RN23)."
              {...register('novaPrevisaoEntrega')}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
