/**
 * Detalhe da OS: dados de cliente, veículo e prazo; ações da OS (suspender, retomar,
 * cancelar, replanejar, observações) e abas de etapas, ocorrências, documentos e histórico.
 * Toda alteração passa pela API; depois do sucesso, os dados são recarregados.
 */
import { ArrowLeft, CalendarClock, Pencil, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { JustificativaDialog } from '@/components/forms/JustificativaDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { DocumentosOrdem } from '@/components/ordem/DocumentosOrdem';
import { EtapasOrdem } from '@/components/ordem/EtapasOrdem';
import { OcorrenciasOrdem } from '@/components/ordem/OcorrenciasOrdem';
import { AtrasoBadge, StatusOsBadge } from '@/components/status/StatusOsBadge';
import { HistoricoOrdem } from '@/components/timeline/HistoricoOrdem';
import { Abas } from '@/components/ui/Abas';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/CamposFormulario';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import * as ordemService from '@/services/ordemServico.service';
import type { AcaoOrdem, OrdemServicoDetalhe } from '@/types/ordemServico';
import { dataParaIso, formatarData, formatarPlaca, hojeLocal, isoParaData } from '@/utils/formatacao';
import { calcularProgresso } from '@/utils/progresso';

type AbaOrdem = 'etapas' | 'ocorrencias' | 'documentos' | 'historico';
type Dialogo = { tipo: 'status'; acao: AcaoOrdem } | { tipo: 'previsao' } | { tipo: 'observacoes' } | null;

const TEXTO_ACAO: Record<AcaoOrdem, { titulo: string; botao: string; descricao: string }> = {
  SUSPENDER: {
    titulo: 'Suspender ordem de serviço',
    botao: 'Suspender',
    descricao: 'Enquanto suspensa, as etapas não podem ser movimentadas.',
  },
  RETOMAR: {
    titulo: 'Retomar ordem de serviço',
    botao: 'Retomar',
    descricao: 'A OS volta ao status definido pelas etapas.',
  },
  CANCELAR: {
    titulo: 'Cancelar ordem de serviço',
    botao: 'Cancelar OS',
    descricao:
      'O cancelamento encerra a OS: ela não poderá mais ser alterada. Esta ação não pode ser desfeita.',
  },
};

export function OrdemDetalhePage() {
  const { id = '' } = useParams();
  const [versao, setVersao] = useState(0);
  const { estado, recarregar } = useApi((signal) => ordemService.obter(id, signal), [id, versao]);
  const atualizar = () => setVersao((v) => v + 1);

  const voltar = (
    <Link
      to="/painel/ordens"
      className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Ordens de serviço
    </Link>
  );

  if (estado.status === 'erro' && estado.erro.status === 404) {
    return (
      <>
        {voltar}
        <Card>
          <Vazio titulo="Ordem de serviço não encontrada" />
        </Card>
      </>
    );
  }
  if (estado.status === 'erro') return <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />;
  if (!estado.dados || estado.dados.id !== id) return <Carregando texto="Carregando a ordem de serviço..." />;

  return <DetalheOrdem ordem={estado.dados} voltar={voltar} versao={versao} aoAlterar={atualizar} />;
}

interface DetalheOrdemProps {
  ordem: OrdemServicoDetalhe;
  voltar: ReactNode;
  versao: number;
  aoAlterar: () => void;
}

function DetalheOrdem({ ordem, voltar, versao, aoAlterar }: DetalheOrdemProps) {
  const { usuario } = useAuth();
  const podeFazer = usePermissao();
  const { notificar, notificarErro } = useToast();
  const [aba, setAba] = useState<AbaOrdem>('etapas');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erroCampo, setErroCampo] = useState<string | undefined>();

  const encerrada = ordem.status === 'ENTREGUE' || ordem.status === 'CANCELADA';
  const progresso = calcularProgresso(ordem.etapas);
  const podeEditarObservacoes =
    podeFazer('os.editarObservacoes') && (!encerrada || usuario?.perfil === 'ADMIN');

  const acoesStatus: AcaoOrdem[] = [];
  if (podeFazer('os.alterarStatus') && !encerrada) {
    if (ordem.status === 'SUSPENSA') acoesStatus.push('RETOMAR');
    else acoesStatus.push('SUSPENDER');
    acoesStatus.push('CANCELAR');
  }

  function fechar() {
    setDialogo(null);
    setErroCampo(undefined);
  }

  async function executar(acao: () => Promise<unknown>, sucesso: string, contextoErro: string) {
    try {
      await acao();
      notificar('sucesso', sucesso);
      fechar();
      aoAlterar();
    } catch (erro) {
      notificarErro(erro, contextoErro);
      throw erro;
    }
  }

  return (
    <>
      <PageHeader
        voltar={voltar}
        titulo={`OS ${ordem.numero}`}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <StatusOsBadge status={ordem.status} />
            {ordem.prazo.atrasada && <AtrasoBadge />}
            <span>
              {progresso.concluidas} de {progresso.aplicaveis} etapas concluídas ({progresso.percentual}%)
            </span>
          </span>
        }
        acoes={
          <>
            {acoesStatus.map((acao) => {
              const Icone = acao === 'CANCELAR' ? XCircle : acao === 'RETOMAR' ? PlayCircle : PauseCircle;
              return (
                <Button
                  key={acao}
                  variante={acao === 'CANCELAR' ? 'danger' : 'secondary'}
                  onClick={() => setDialogo({ tipo: 'status', acao })}
                >
                  <Icone className="size-4" aria-hidden="true" /> {TEXTO_ACAO[acao].botao}
                </Button>
              );
            })}
            {podeFazer('os.replanejar') && !encerrada && (
              <Button
                variante="secondary"
                onClick={() => {
                  setNovaPrevisao(isoParaData(ordem.previsaoEntrega));
                  setDialogo({ tipo: 'previsao' });
                }}
              >
                <CalendarClock className="size-4" aria-hidden="true" /> Replanejar entrega
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card titulo="Cliente">
          <p className="font-medium text-slate-900">{ordem.cliente.nome}</p>
          <p className="mt-1 text-xs text-slate-600">OS aberta por {ordem.abertaPor.nome}</p>
        </Card>
        <Card titulo="Veículo">
          <p className="font-medium text-slate-900">
            {ordem.veiculo.marca} {ordem.veiculo.modelo} · {ordem.veiculo.cor}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-600">
            {formatarPlaca(ordem.veiculo.placa)} · {ordem.veiculo.chassi}
          </p>
        </Card>
        <Card titulo="Prazo">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-600">Entrada</dt>
            <dd className="tabular-nums">{formatarData(ordem.dataEntrada)}</dd>
            <dt className="text-slate-600">Previsão</dt>
            <dd className={`tabular-nums ${ordem.prazo.atrasada ? 'font-medium text-red-800' : ''}`}>
              {formatarData(ordem.previsaoEntrega)}
              {ordem.prazo.atrasada && ` (${ordem.prazo.diasAtraso}d de atraso)`}
            </dd>
            <dt className="text-slate-600">Entrega</dt>
            <dd className="tabular-nums">{formatarData(ordem.dataEntrega)}</dd>
            {ordem.prazo.desvioDias !== null && (
              <>
                <dt className="text-slate-600">Desvio</dt>
                <dd className="tabular-nums">{ordem.prazo.desvioDias} dia(s)</dd>
              </>
            )}
          </dl>
        </Card>
      </div>

      <Card
        titulo="Observações internas"
        acoes={
          podeEditarObservacoes && (
            <Button
              tamanho="sm"
              variante="ghost"
              onClick={() => {
                setObservacoes(ordem.observacoes ?? '');
                setDialogo({ tipo: 'observacoes' });
              }}
            >
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Button>
          )
        }
      >
        <p className="text-sm whitespace-pre-line text-slate-700">
          {ordem.observacoes || 'Sem observações.'}
        </p>
      </Card>

      <Card>
        <Abas<AbaOrdem>
          rotulo="Seções da ordem de serviço"
          ativa={aba}
          aoMudar={setAba}
          abas={[
            { chave: 'etapas', rotulo: 'Etapas' },
            { chave: 'ocorrencias', rotulo: `Ocorrências (${ordem.ocorrenciasAbertas} abertas)` },
            { chave: 'documentos', rotulo: `Documentos (${ordem.totalDocumentos})` },
            { chave: 'historico', rotulo: 'Histórico' },
          ]}
        >
          {aba === 'etapas' && <EtapasOrdem ordem={ordem} aoAlterar={aoAlterar} />}
          {aba === 'ocorrencias' && <OcorrenciasOrdem ordem={ordem} aoAlterar={aoAlterar} />}
          {aba === 'documentos' && <DocumentosOrdem ordem={ordem} aoAlterar={aoAlterar} />}
          {aba === 'historico' && <HistoricoOrdem ordemId={ordem.id} versao={versao} />}
        </Abas>
      </Card>

      {dialogo?.tipo === 'status' && (
        <JustificativaDialog
          aberto
          titulo={TEXTO_ACAO[dialogo.acao].titulo}
          descricao={TEXTO_ACAO[dialogo.acao].descricao}
          rotuloConfirmar={TEXTO_ACAO[dialogo.acao].botao}
          exigeJustificativa
          perigo={dialogo.acao === 'CANCELAR'}
          aoCancelar={fechar}
          aoConfirmar={(justificativa) =>
            executar(
              () => ordemService.alterarStatus(ordem.id, dialogo.acao, justificativa ?? ''),
              `OS ${ordem.numero}: ${TEXTO_ACAO[dialogo.acao].botao.toLowerCase()} registrado.`,
              `Não foi possível ${TEXTO_ACAO[dialogo.acao].botao.toLowerCase()}`,
            )
          }
        />
      )}

      {dialogo?.tipo === 'previsao' && (
        <JustificativaDialog
          aberto
          titulo="Replanejar entrega"
          descricao="A previsão anterior e a justificativa ficam registradas (RN26)."
          rotuloConfirmar="Salvar nova previsão"
          exigeJustificativa
          aoCancelar={fechar}
          aoConfirmar={(justificativa) => {
            if (!novaPrevisao) {
              setErroCampo('Informe a nova previsão');
              return Promise.reject(new Error('validação'));
            }
            return executar(
              () => ordemService.replanejarEntrega(ordem.id, dataParaIso(novaPrevisao), justificativa ?? ''),
              'Previsão de entrega atualizada.',
              'Não foi possível replanejar a entrega',
            );
          }}
        >
          <Input
            rotulo="Nova previsão de entrega"
            type="date"
            min={hojeLocal()}
            value={novaPrevisao}
            onChange={(e) => {
              setNovaPrevisao(e.target.value);
              setErroCampo(undefined);
            }}
            erro={erroCampo}
          />
        </JustificativaDialog>
      )}

      {dialogo?.tipo === 'observacoes' && (
        <JustificativaDialog
          aberto
          titulo="Observações internas"
          rotuloConfirmar="Salvar"
          exigeJustificativa={false}
          aoCancelar={fechar}
          aoConfirmar={() =>
            executar(
              () => ordemService.atualizarObservacoes(ordem.id, observacoes.trim() || null),
              'Observações atualizadas.',
              'Não foi possível salvar as observações',
            )
          }
        >
          <Textarea
            rotulo="Observações"
            rows={6}
            maxLength={5000}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            dica="Uso interno: nunca são exibidas ao cliente."
          />
        </JustificativaDialog>
      )}
    </>
  );
}
