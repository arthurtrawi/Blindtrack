/**
 * Documentos da OS: envio (PDF/PNG/JPEG, até 10 MB), download autenticado, aprovação ou
 * rejeição (decisão HUMANA, ADMIN/GESTOR) e o checklist dos documentos obrigatórios para a
 * entrega (RN17). O backend confere o tipo pelo conteúdo do arquivo.
 */
import { Check, Download, EyeIcon, FileUp, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { JustificativaDialog } from '@/components/forms/JustificativaDialog';
import { Badge, type TomBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Select } from '@/components/ui/CamposFormulario';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento, Vazio } from '@/components/ui/EstadoCarregamento';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import { salvarArquivo } from '@/services/api';
import * as documentoService from '@/services/documento.service';
import type { Documento, OrdemServicoDetalhe, StatusDocumento, TipoDocumento } from '@/types/ordemServico';
import { formatarDataHora } from '@/utils/formatacao';
import { ROTULO_TIPO_DOCUMENTO } from '@/utils/status';

const OBRIGATORIOS_ENTREGA: TipoDocumento[] = [
  'CONTRATO',
  'CHECKLIST_VISTORIA',
  'DECLARACAO_BLINDAGEM',
  'TERMO_ENTREGA',
];
const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_ACEITOS = 'application/pdf,image/png,image/jpeg';

const STATUS: Record<StatusDocumento, { rotulo: string; tom: TomBadge }> = {
  PENDENTE: { rotulo: 'Pendente', tom: 'warning' },
  APROVADO: { rotulo: 'Aprovado', tom: 'success' },
  REJEITADO: { rotulo: 'Rejeitado', tom: 'danger' },
};

function tamanhoLegivel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface DocumentosOrdemProps {
  ordem: OrdemServicoDetalhe;
  aoAlterar: () => void;
}

export function DocumentosOrdem({ ordem, aoAlterar }: DocumentosOrdemProps) {
  const podeFazer = usePermissao();
  const { notificar, notificarErro } = useToast();
  const { estado, recarregar } = useApi(
    (signal) => documentoService.listarDaOrdem(ordem.id, signal),
    [ordem.id],
  );
  const encerrada = ordem.status === 'ENTREGUE' || ordem.status === 'CANCELADA';

  const campoArquivo = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>('CONTRATO');
  const [visivelCliente, setVisivelCliente] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [rejeitar, setRejeitar] = useState<Documento | null>(null);

  const aprovados = new Set((estado.dados ?? []).filter((d) => d.status === 'APROVADO').map((d) => d.tipo));

  function atualizarTudo() {
    recarregar();
    aoAlterar();
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novosErros: Record<string, string> = {};
    if (!arquivo) novosErros['arquivo'] = 'Selecione o arquivo';
    else if (arquivo.size > TAMANHO_MAXIMO) novosErros['arquivo'] = 'O arquivo excede 10 MB';
    if (nome.trim().length < 3) novosErros['nome'] = 'Informe o nome (mínimo de 3 caracteres)';
    setErros(novosErros);
    if (!arquivo || Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await documentoService.enviar(ordem.id, { arquivo, nome: nome.trim(), tipo, visivelCliente });
      notificar('sucesso', `Documento "${nome.trim()}" enviado para aprovação.`);
      setArquivo(null);
      setNome('');
      setVisivelCliente(false);
      if (campoArquivo.current) campoArquivo.current.value = '';
      atualizarTudo();
    } catch (erro) {
      notificarErro(erro, 'Não foi possível enviar o documento');
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(documento: Documento) {
    setBaixando(documento.id);
    try {
      salvarArquivo(await documentoService.baixar(documento.id));
    } catch (erro) {
      notificarErro(erro, `Não foi possível baixar "${documento.nome}"`);
    } finally {
      setBaixando(null);
    }
  }

  async function avaliar(documento: Documento, status: 'APROVADO' | 'REJEITADO', motivo?: string) {
    setAvaliando(documento.id);
    try {
      await documentoService.avaliar(documento.id, status, motivo);
      notificar(
        'sucesso',
        `Documento "${documento.nome}" ${status === 'APROVADO' ? 'aprovado' : 'rejeitado'}.`,
      );
      setRejeitar(null);
      atualizarTudo();
    } catch (erro) {
      notificarErro(erro, 'Não foi possível registrar a avaliação');
      throw erro;
    } finally {
      setAvaliando(null);
    }
  }

  return (
    <div className="space-y-6">
      <section aria-label="Documentos obrigatórios para a entrega" className="rounded-md bg-slate-50 p-4">
        <p className="mb-2 text-sm font-medium text-slate-800">
          Obrigatórios para a entrega (aprovados por gestor)
        </p>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {OBRIGATORIOS_ENTREGA.map((t) => {
            const ok = aprovados.has(t);
            return (
              <li key={t} className={`flex items-center gap-2 ${ok ? 'text-green-800' : 'text-slate-600'}`}>
                {ok ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <X className="size-4" aria-hidden="true" />
                )}
                {ROTULO_TIPO_DOCUMENTO[t]}
                <span className="sr-only">{ok ? ': aprovado' : ': pendente'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {!encerrada && podeFazer('documento.enviar') && (
        <Card titulo="Enviar documento">
          <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                ref={campoArquivo}
                rotulo="Arquivo"
                type="file"
                accept={TIPOS_ACEITOS}
                className="py-2"
                erro={erros['arquivo']}
                dica={
                  arquivo
                    ? `${arquivo.name} · ${tamanhoLegivel(arquivo.size)}`
                    : 'PDF, PNG ou JPEG, até 10 MB.'
                }
                onChange={(e) => {
                  const escolhido = e.target.files?.[0] ?? null;
                  setArquivo(escolhido);
                  if (escolhido && !nome) setNome(escolhido.name.replace(/\.[^.]+$/, ''));
                }}
              />
            </div>
            <Input
              rotulo="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              erro={erros['nome']}
            />
            <Select rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)}>
              {Object.entries(ROTULO_TIPO_DOCUMENTO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <Checkbox
                rotulo="Disponível para o cliente baixar no portal"
                checked={visivelCliente}
                onChange={(e) => setVisivelCliente(e.target.checked)}
              />
              <Button type="submit" carregando={enviando}>
                <FileUp className="size-4" aria-hidden="true" /> Enviar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
      {estado.status === 'carregando' && !estado.dados && <Carregando texto="Carregando documentos..." />}
      {estado.dados?.length === 0 && <Vazio titulo="Nenhum documento enviado" />}
      {estado.dados && estado.dados.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {estado.dados.map((documento) => (
            <li key={documento.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{documento.nome}</p>
                  <Badge tom={STATUS[documento.status].tom} texto={STATUS[documento.status].rotulo} />
                  {documento.visivelCliente && (
                    <Badge tom="info" texto="Visível ao cliente" icone={EyeIcon} />
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {ROTULO_TIPO_DOCUMENTO[documento.tipo]} · {tamanhoLegivel(documento.tamanhoBytes)} · Enviado
                  por {documento.enviadoPor.nome} em {formatarDataHora(documento.createdAt)}
                  {documento.avaliadoPor &&
                    ` · ${documento.status === 'APROVADO' ? 'Aprovado' : 'Rejeitado'} por ${documento.avaliadoPor.nome}`}
                </p>
                {documento.motivoRejeicao && (
                  <p className="text-xs text-red-800">Motivo da rejeição: {documento.motivoRejeicao}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  tamanho="sm"
                  variante="secondary"
                  carregando={baixando === documento.id}
                  onClick={() => baixar(documento)}
                  aria-label={`Baixar ${documento.nome}`}
                >
                  <Download className="size-4" aria-hidden="true" /> Baixar
                </Button>
                {!encerrada && documento.status === 'PENDENTE' && podeFazer('documento.avaliar') && (
                  <>
                    <Button
                      tamanho="sm"
                      carregando={avaliando === documento.id}
                      onClick={() => void avaliar(documento, 'APROVADO').catch(() => undefined)}
                      aria-label={`Aprovar ${documento.nome}`}
                    >
                      <ThumbsUp className="size-4" aria-hidden="true" /> Aprovar
                    </Button>
                    <Button
                      tamanho="sm"
                      variante="ghost"
                      onClick={() => setRejeitar(documento)}
                      aria-label={`Rejeitar ${documento.nome}`}
                    >
                      <ThumbsDown className="size-4" aria-hidden="true" /> Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejeitar && (
        <JustificativaDialog
          aberto
          titulo="Rejeitar documento"
          descricao={`"${rejeitar.nome}". Para substituí-lo, envie uma nova versão.`}
          rotuloConfirmar="Rejeitar"
          rotuloCampo="Motivo da rejeição"
          exigeJustificativa
          perigo
          aoCancelar={() => setRejeitar(null)}
          aoConfirmar={(motivo) => avaliar(rejeitar, 'REJEITADO', motivo)}
        />
      )}
    </div>
  );
}
