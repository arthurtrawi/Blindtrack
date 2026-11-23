/**
 * Ocorrências da OS: lista, registro e transições (iniciar tratamento, resolver com
 * solução, cancelar com motivo). Só o responsável ou ADMIN/GESTOR alteram (RF31).
 */
import { CheckCircle2, EyeIcon, Lock, Plus, Wrench, XCircle } from 'lucide-react';
import { useState } from 'react';
import { OcorrenciaForm } from '@/components/forms/OcorrenciaForm';
import { JustificativaDialog } from '@/components/forms/JustificativaDialog';
import { Badge, type TomBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { useApi } from '@/hooks/useApi';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import * as ocorrenciaService from '@/services/ocorrencia.service';
import type {
  AcaoOcorrencia,
  Ocorrencia,
  OrdemServicoDetalhe,
  PrioridadeOcorrencia,
  StatusOcorrencia,
} from '@/types/ordemServico';
import { formatarDataHora } from '@/utils/formatacao';
import { ROTULO_PRIORIDADE, ROTULO_TIPO_OCORRENCIA } from '@/utils/status';

const STATUS: Record<StatusOcorrencia, { rotulo: string; tom: TomBadge }> = {
  ABERTA: { rotulo: 'Aberta', tom: 'warning' },
  EM_TRATAMENTO: { rotulo: 'Em tratamento', tom: 'info' },
  RESOLVIDA: { rotulo: 'Resolvida', tom: 'success' },
  CANCELADA: { rotulo: 'Cancelada', tom: 'neutral' },
};

const TOM_PRIORIDADE: Record<PrioridadeOcorrencia, TomBadge> = {
  BAIXA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  CRITICA: 'danger',
};

interface OcorrenciasOrdemProps {
  ordem: OrdemServicoDetalhe;
  aoAlterar: () => void;
}

export function OcorrenciasOrdem({ ordem, aoAlterar }: OcorrenciasOrdemProps) {
  const podeFazer = usePermissao();
  const { notificar, notificarErro } = useToast();
  const { estado, recarregar } = useApi(
    (signal) => ocorrenciaService.listarDaOrdem(ordem.id, undefined, signal),
    [ordem.id],
  );
  const [formAberto, setFormAberto] = useState(false);
  const [transicao, setTransicao] = useState<{ ocorrencia: Ocorrencia; acao: AcaoOcorrencia } | null>(null);
  const [executando, setExecutando] = useState<string | null>(null);
  const encerrada = ordem.status === 'ENTREGUE' || ordem.status === 'CANCELADA';

  function atualizarTudo() {
    recarregar();
    aoAlterar();
  }

  async function aplicar(ocorrencia: Ocorrencia, acao: AcaoOcorrencia, texto?: string) {
    setExecutando(ocorrencia.id);
    try {
      await ocorrenciaService.atualizar(ocorrencia.id, {
        acao,
        ...(acao === 'RESOLVER' && { solucao: texto }),
        ...(acao === 'CANCELAR' && { motivo: texto }),
      });
      notificar('sucesso', `Ocorrência "${ocorrencia.titulo}" atualizada.`);
      setTransicao(null);
      atualizarTudo();
    } catch (erro) {
      notificarErro(erro, 'Não foi possível atualizar a ocorrência');
      throw erro;
    } finally {
      setExecutando(null);
    }
  }

  return (
    <div className="space-y-4">
      {!encerrada && podeFazer('ocorrencia.abrir') && (
        <div className="flex justify-end">
          <Button onClick={() => setFormAberto(true)}>
            <Plus className="size-4" aria-hidden="true" /> Registrar ocorrência
          </Button>
        </div>
      )}

      {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
      {estado.status === 'carregando' && !estado.dados && <Carregando texto="Carregando ocorrências..." />}
      {estado.dados?.length === 0 && <Vazio titulo="Nenhuma ocorrência registrada" />}

      {estado.dados && estado.dados.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {estado.dados.map((ocorrencia) => {
            const finalizada = ocorrencia.status === 'RESOLVIDA' || ocorrencia.status === 'CANCELADA';
            const podeAlterar =
              !encerrada &&
              !finalizada &&
              podeFazer('ocorrencia.alterar', { responsavelId: ocorrencia.usuarioResponsavelId });
            return (
              <li key={ocorrencia.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{ocorrencia.titulo}</p>
                  <Badge tom={STATUS[ocorrencia.status].tom} texto={STATUS[ocorrencia.status].rotulo} />
                  <Badge
                    tom={TOM_PRIORIDADE[ocorrencia.prioridade]}
                    texto={`Prioridade ${ROTULO_PRIORIDADE[ocorrencia.prioridade].toLowerCase()}`}
                  />
                  {ocorrencia.impeditiva && <Badge tom="danger" texto="Impeditiva" icone={Lock} />}
                  {ocorrencia.visivelCliente && (
                    <Badge tom="info" texto="Visível ao cliente" icone={EyeIcon} />
                  )}
                </div>
                <p className="text-sm text-slate-700">{ocorrencia.descricao}</p>
                {ocorrencia.solucao && (
                  <p className="text-sm text-green-900">
                    <span className="font-medium">Solução: </span>
                    {ocorrencia.solucao}
                  </p>
                )}
                <p className="text-xs text-slate-600">
                  {ROTULO_TIPO_OCORRENCIA[ocorrencia.tipo]}
                  {ocorrencia.etapaProcesso && ` · Etapa: ${ocorrencia.etapaProcesso.nome}`} · Responsável:{' '}
                  {ocorrencia.usuarioResponsavel.nome} · Aberta em {formatarDataHora(ocorrencia.dataAbertura)}{' '}
                  por {ocorrencia.abertaPor.nome}
                  {ocorrencia.dataResolucao &&
                    ` · Resolvida em ${formatarDataHora(ocorrencia.dataResolucao)}`}
                </p>
                {podeAlterar && (
                  <div className="flex flex-wrap gap-2">
                    {ocorrencia.status === 'ABERTA' && (
                      <Button
                        tamanho="sm"
                        variante="secondary"
                        carregando={executando === ocorrencia.id}
                        onClick={() => void aplicar(ocorrencia, 'INICIAR_TRATAMENTO').catch(() => undefined)}
                      >
                        <Wrench className="size-4" aria-hidden="true" /> Iniciar tratamento
                      </Button>
                    )}
                    <Button tamanho="sm" onClick={() => setTransicao({ ocorrencia, acao: 'RESOLVER' })}>
                      <CheckCircle2 className="size-4" aria-hidden="true" /> Resolver
                    </Button>
                    <Button
                      tamanho="sm"
                      variante="ghost"
                      onClick={() => setTransicao({ ocorrencia, acao: 'CANCELAR' })}
                    >
                      <XCircle className="size-4" aria-hidden="true" /> Cancelar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <OcorrenciaForm
        aberto={formAberto}
        ordemId={ordem.id}
        etapas={ordem.etapas}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={() => {
          setFormAberto(false);
          atualizarTudo();
        }}
      />

      {transicao && (
        <JustificativaDialog
          aberto
          titulo={`${transicao.acao === 'RESOLVER' ? 'Resolver' : 'Cancelar'} ocorrência`}
          descricao={transicao.ocorrencia.titulo}
          rotuloConfirmar={transicao.acao === 'RESOLVER' ? 'Resolver' : 'Cancelar ocorrência'}
          rotuloCampo={transicao.acao === 'RESOLVER' ? 'Solução' : 'Motivo'}
          exigeJustificativa
          perigo={transicao.acao === 'CANCELAR'}
          aoCancelar={() => setTransicao(null)}
          aoConfirmar={(texto) => aplicar(transicao.ocorrencia, transicao.acao, texto)}
        />
      )}
    </div>
  );
}
