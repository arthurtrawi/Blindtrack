/**
 * Etapas da OS no painel, com as ações permitidas ao perfil. A interface só oferece o que
 * faz sentido (ex.: "Iniciar" apenas na próxima etapa da sequência), mas quem decide é o
 * backend: um 422 (RN09, RN12, RN17...) vira notificação com a mensagem e o código da regra.
 */
import { CalendarClock, CheckCheck, Pause, Play, RotateCcw, SkipForward, UserRound } from 'lucide-react';
import { useState } from 'react';
import { JustificativaDialog } from '@/components/forms/JustificativaDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/CamposFormulario';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import * as etapaService from '@/services/etapa.service';
import { responsaveis as carregarResponsaveis } from '@/services/usuario.service';
import type { AcaoEtapa, Etapa, OrdemServicoDetalhe } from '@/types/ordemServico';
import { dataParaIso, formatarData, isoParaData } from '@/utils/formatacao';
import { indiceEtapaAtual } from '@/utils/progresso';
import { statusEtapa } from '@/utils/status';

type Dialogo =
  | { tipo: 'status'; etapa: Etapa; acao: AcaoEtapa }
  | { tipo: 'responsavel'; etapa: Etapa }
  | { tipo: 'prazo'; etapa: Etapa }
  | null;

const TEXTO_ACAO: Record<AcaoEtapa, { titulo: string; botao: string; exige: boolean }> = {
  INICIAR: { titulo: 'Iniciar etapa', botao: 'Iniciar', exige: false },
  PAUSAR: { titulo: 'Pausar etapa', botao: 'Pausar', exige: true },
  RETOMAR: { titulo: 'Retomar etapa', botao: 'Retomar', exige: false },
  CONCLUIR: { titulo: 'Concluir etapa', botao: 'Concluir', exige: false },
  DISPENSAR: { titulo: 'Dispensar etapa', botao: 'Dispensar', exige: true },
  REABRIR: { titulo: 'Reabrir etapa', botao: 'Reabrir', exige: true },
};

interface EtapasOrdemProps {
  ordem: OrdemServicoDetalhe;
  aoAlterar: () => void;
}

export function EtapasOrdem({ ordem, aoAlterar }: EtapasOrdemProps) {
  const podeFazer = usePermissao();
  const { notificar, notificarErro } = useToast();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [executando, setExecutando] = useState<string | null>(null);
  const [responsavelId, setResponsavelId] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [erroCampo, setErroCampo] = useState<string | undefined>();

  const podeAtribuir = podeFazer('etapa.atribuirResponsavel');
  const responsaveis = useApi(
    (signal) => (podeAtribuir ? carregarResponsaveis(signal) : Promise.resolve([])),
    [podeAtribuir],
  );

  const etapas = [...ordem.etapas].sort((a, b) => a.ordem - b.ordem);
  const indiceAtual = indiceEtapaAtual(etapas);
  const encerrada = ordem.status === 'ENTREGUE' || ordem.status === 'CANCELADA';
  const suspensa = ordem.status === 'SUSPENSA';

  function fechar() {
    setDialogo(null);
    setErroCampo(undefined);
  }

  async function executar(etapa: Etapa, acao: AcaoEtapa, justificativa?: string) {
    setExecutando(etapa.id);
    try {
      const resultado = await etapaService.alterarStatus(etapa.id, acao, justificativa);
      notificar(
        'sucesso',
        `${etapa.nome}: ${statusEtapa(resultado.status, 'interno').rotulo.toLowerCase()}.${
          resultado.statusOrdem !== ordem.status ? ' Status da OS atualizado.' : ''
        }`,
      );
      fechar();
      aoAlterar();
    } catch (erro) {
      notificarErro(erro, `Não foi possível ${TEXTO_ACAO[acao].botao.toLowerCase()} "${etapa.nome}"`);
      throw erro; // mantém o diálogo aberto
    } finally {
      setExecutando(null);
    }
  }

  async function salvarResponsavel() {
    if (dialogo?.tipo !== 'responsavel') return;
    if (!responsavelId) {
      setErroCampo('Selecione o responsável');
      throw new Error('validação');
    }
    try {
      await etapaService.atribuirResponsavel(dialogo.etapa.id, responsavelId);
      notificar('sucesso', `Responsável de "${dialogo.etapa.nome}" atualizado.`);
      fechar();
      aoAlterar();
    } catch (erro) {
      notificarErro(erro, 'Não foi possível atribuir o responsável');
      throw erro;
    }
  }

  async function salvarPrazo(justificativa: string | undefined) {
    if (dialogo?.tipo !== 'prazo') return;
    if (!novaPrevisao) {
      setErroCampo('Informe a nova previsão');
      throw new Error('validação');
    }
    try {
      await etapaService.alterarPrazo(dialogo.etapa.id, dataParaIso(novaPrevisao), justificativa);
      notificar('sucesso', `Previsão de "${dialogo.etapa.nome}" atualizada.`);
      fechar();
      aoAlterar();
    } catch (erro) {
      notificarErro(erro, 'Não foi possível alterar a previsão');
      throw erro;
    }
  }

  /** Ações de status que a interface oferece para a etapa (o backend valida de novo). */
  function acoesDe(etapa: Etapa, indice: number): AcaoEtapa[] {
    if (encerrada || suspensa) return [];
    const acoes: AcaoEtapa[] = [];
    if (podeFazer('etapa.alterarStatus', { responsavelId: etapa.responsavelId })) {
      if (etapa.status === 'PENDENTE' && indice === indiceAtual) acoes.push('INICIAR');
      if (etapa.status === 'EM_ANDAMENTO') acoes.push('PAUSAR', 'CONCLUIR');
      if (etapa.status === 'PAUSADA') acoes.push('RETOMAR');
    }
    if (podeFazer('etapa.dispensarOuReabrir')) {
      if (etapa.status === 'PENDENTE' && !etapa.obrigatoria) acoes.push('DISPENSAR');
      if (etapa.status === 'CONCLUIDA' && etapa.codigo !== 'ENTREGA') acoes.push('REABRIR');
    }
    return acoes;
  }

  const ICONES: Record<AcaoEtapa, typeof Play> = {
    INICIAR: Play,
    PAUSAR: Pause,
    RETOMAR: Play,
    CONCLUIR: CheckCheck,
    DISPENSAR: SkipForward,
    REABRIR: RotateCcw,
  };

  return (
    <div className="space-y-3">
      {suspensa && (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          A OS está suspensa: retome-a para alterar o status das etapas.
        </p>
      )}

      <ol className="divide-y divide-slate-100" aria-label="Etapas da ordem de serviço">
        {etapas.map((etapa, indice) => {
          const apresentacao = statusEtapa(etapa.status, 'interno');
          const finalizada = etapa.status === 'CONCLUIDA' || etapa.status === 'DISPENSADA';
          const acoes = acoesDe(etapa, indice);
          return (
            <li
              key={etapa.id}
              aria-current={indice === indiceAtual ? 'step' : undefined}
              className={`flex flex-col gap-3 py-4 lg:flex-row lg:items-center ${indice === indiceAtual ? 'bg-blue-50/40' : ''}`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 text-right text-xs text-slate-500 tabular-nums">{indice + 1}.</span>
                  <p className="font-medium text-slate-900">{etapa.nome}</p>
                  <Badge tom={apresentacao.tom} texto={apresentacao.rotulo} icone={apresentacao.icone} />
                  {!etapa.obrigatoria && <Badge tom="neutral" texto="Dispensável" />}
                  {etapa.prazo.atrasada && (
                    <Badge tom="danger" texto={`Atrasada ${etapa.prazo.diasAtraso}d`} />
                  )}
                </div>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 pl-8 text-xs text-slate-600">
                  <div>
                    <dt className="inline">Responsável: </dt>
                    <dd className="inline font-medium text-slate-800">{etapa.responsavel?.nome ?? '—'}</dd>
                  </div>
                  {etapa.dataInicio && (
                    <div>
                      <dt className="inline">Início: </dt>
                      <dd className="inline tabular-nums">{formatarData(etapa.dataInicio)}</dd>
                    </div>
                  )}
                  {etapa.previsaoConclusao && (
                    <div>
                      <dt className="inline">Previsão: </dt>
                      <dd className="inline tabular-nums">{formatarData(etapa.previsaoConclusao)}</dd>
                    </div>
                  )}
                  {etapa.dataConclusao && (
                    <div>
                      <dt className="inline">Conclusão: </dt>
                      <dd className="inline tabular-nums">{formatarData(etapa.dataConclusao)}</dd>
                    </div>
                  )}
                </dl>
                {etapa.status === 'PENDENTE' &&
                  indice === indiceAtual &&
                  !etapa.responsavelId &&
                  !encerrada && (
                    <p className="pl-8 text-xs text-amber-800">
                      Defina o responsável antes de iniciar (RN10).
                    </p>
                  )}
              </div>

              <div className="flex flex-wrap gap-2 pl-8 lg:pl-0">
                {acoes.map((acao) => {
                  const Icone = ICONES[acao];
                  const direta = acao === 'INICIAR' || acao === 'RETOMAR';
                  return (
                    <Button
                      key={acao}
                      tamanho="sm"
                      variante={acao === 'CONCLUIR' || acao === 'INICIAR' ? 'primary' : 'secondary'}
                      carregando={direta && executando === etapa.id}
                      disabled={executando !== null && executando !== etapa.id}
                      onClick={() =>
                        direta
                          ? void executar(etapa, acao).catch(() => undefined)
                          : setDialogo({ tipo: 'status', etapa, acao })
                      }
                      aria-label={`${TEXTO_ACAO[acao].botao} ${etapa.nome}`}
                    >
                      <Icone className="size-4" aria-hidden="true" />
                      {TEXTO_ACAO[acao].botao}
                    </Button>
                  );
                })}
                {podeAtribuir && !finalizada && !encerrada && (
                  <Button
                    tamanho="sm"
                    variante="ghost"
                    onClick={() => {
                      setResponsavelId(etapa.responsavelId ?? '');
                      setDialogo({ tipo: 'responsavel', etapa });
                    }}
                    aria-label={`Definir responsável de ${etapa.nome}`}
                  >
                    <UserRound className="size-4" aria-hidden="true" /> Responsável
                  </Button>
                )}
                {podeFazer('etapa.alterarPrazo') && !finalizada && !encerrada && (
                  <Button
                    tamanho="sm"
                    variante="ghost"
                    onClick={() => {
                      setNovaPrevisao(isoParaData(etapa.previsaoConclusao));
                      setDialogo({ tipo: 'prazo', etapa });
                    }}
                    aria-label={`Alterar previsão de ${etapa.nome}`}
                  >
                    <CalendarClock className="size-4" aria-hidden="true" /> Prazo
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {dialogo?.tipo === 'status' && (
        <JustificativaDialog
          aberto
          titulo={`${TEXTO_ACAO[dialogo.acao].titulo}: ${dialogo.etapa.nome}`}
          rotuloConfirmar={TEXTO_ACAO[dialogo.acao].botao}
          exigeJustificativa={TEXTO_ACAO[dialogo.acao].exige}
          descricao={
            dialogo.acao === 'CONCLUIR' && dialogo.etapa.codigo === 'ENTREGA'
              ? 'Concluir a entrega encerra a OS. Exige todas as etapas finalizadas, nenhuma ocorrência aberta e os documentos obrigatórios aprovados.'
              : dialogo.acao === 'CONCLUIR'
                ? 'Confirme que a etapa foi concluída. A data de conclusão será registrada.'
                : undefined
          }
          aoCancelar={fechar}
          aoConfirmar={(justificativa) => executar(dialogo.etapa, dialogo.acao, justificativa)}
        />
      )}

      {dialogo?.tipo === 'responsavel' && (
        <JustificativaDialog
          aberto
          titulo={`Responsável: ${dialogo.etapa.nome}`}
          rotuloConfirmar="Salvar"
          exigeJustificativa={false}
          aoCancelar={fechar}
          aoConfirmar={salvarResponsavel}
        >
          <Select
            rotulo="Responsável técnico"
            value={responsavelId}
            onChange={(e) => {
              setResponsavelId(e.target.value);
              setErroCampo(undefined);
            }}
            erro={erroCampo}
          >
            <option value="">Selecione</option>
            {(responsaveis.estado.dados ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} ({r.perfil === 'GESTOR' ? 'Gestor' : 'Técnico'})
              </option>
            ))}
          </Select>
        </JustificativaDialog>
      )}

      {dialogo?.tipo === 'prazo' && (
        <JustificativaDialog
          aberto
          titulo={`Previsão: ${dialogo.etapa.nome}`}
          rotuloConfirmar="Salvar previsão"
          exigeJustificativa={Boolean(dialogo.etapa.previsaoConclusao)}
          descricao={
            dialogo.etapa.previsaoConclusao
              ? 'Alterar uma previsão já definida exige justificativa (RN26).'
              : 'Defina a previsão de conclusão desta etapa.'
          }
          aoCancelar={fechar}
          aoConfirmar={salvarPrazo}
        >
          <Input
            rotulo="Nova previsão"
            type="date"
            value={novaPrevisao}
            onChange={(e) => {
              setNovaPrevisao(e.target.value);
              setErroCampo(undefined);
            }}
            erro={erroCampo}
          />
        </JustificativaDialog>
      )}
    </div>
  );
}
