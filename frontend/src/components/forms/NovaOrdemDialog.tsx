/**
 * Abertura de OS (ADMIN, GESTOR, ATENDIMENTO). Busca o cliente pelo nome e lista só os
 * veículos dele (RN01). As demais regras (OS ativa por veículo, previsão futura) são do
 * backend; os erros dele aparecem no formulário.
 */
import { useState, type FormEvent } from 'react';
import { ClienteBusca } from '@/components/forms/ClienteBusca';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/CamposFormulario';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/services/api';
import * as clienteService from '@/services/cliente.service';
import * as ordemService from '@/services/ordemServico.service';
import type { OrdemServicoDetalhe } from '@/types/ordemServico';
import { dataParaIso, hojeLocal } from '@/utils/formatacao';

interface NovaOrdemDialogProps {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (ordem: OrdemServicoDetalhe) => void;
}

export function NovaOrdemDialog({ aberto, aoFechar, aoCriar }: NovaOrdemDialogProps) {
  const { notificar } = useToast();
  const [clienteId, setClienteId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const cliente = useApi(
    (signal) => (clienteId ? clienteService.obter(clienteId, signal) : Promise.resolve(null)),
    [clienteId],
  );
  const veiculos = cliente.estado.dados?.veiculos ?? [];

  function limpar() {
    setClienteId('');
    setVeiculoId('');
    setPrevisao('');
    setObservacoes('');
    setErros({});
  }

  function fechar() {
    limpar();
    aoFechar();
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novosErros: Record<string, string> = {};
    if (!clienteId) novosErros['clienteId'] = 'Selecione o cliente';
    if (!veiculoId) novosErros['veiculoId'] = 'Selecione o veículo';
    if (!previsao) novosErros['previsaoEntrega'] = 'Informe a previsão de entrega';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      const ordem = await ordemService.abrir({
        clienteId,
        veiculoId,
        previsaoEntrega: dataParaIso(previsao),
        observacoes: observacoes.trim() || undefined,
      });
      notificar('sucesso', `Ordem de serviço ${ordem.numero} aberta.`);
      limpar();
      aoCriar(ordem);
    } catch (erro) {
      if (erro instanceof ApiError) {
        const porCampo = Object.fromEntries(erro.errosDeCampo.map((e) => [e.campo, e.mensagem]));
        setErros({ ...porCampo, geral: erro.message });
      } else {
        setErros({ geral: 'Não foi possível abrir a ordem de serviço.' });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Nova ordem de serviço"
      aoFechar={fechar}
      bloqueado={enviando}
      largura="lg"
      acoes={
        <>
          <Button variante="secondary" onClick={fechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-nova-os" carregando={enviando}>
            Abrir ordem de serviço
          </Button>
        </>
      }
    >
      <form id="form-nova-os" noValidate onSubmit={enviar} className="space-y-4">
        {erros['geral'] && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {erros['geral']}
          </p>
        )}

        <ClienteBusca
          valor={clienteId}
          aoMudar={(id) => {
            setClienteId(id);
            setVeiculoId('');
          }}
          erro={erros['clienteId']}
        />

        <Select
          rotulo="Veículo"
          value={veiculoId}
          onChange={(e) => setVeiculoId(e.target.value)}
          erro={erros['veiculoId']}
          disabled={!clienteId || veiculos.length === 0}
          dica={
            clienteId && cliente.estado.dados && veiculos.length === 0
              ? 'Este cliente não tem veículos cadastrados.'
              : undefined
          }
        >
          <option value="">Selecione</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.marca} {v.modelo} · {v.placa}
            </option>
          ))}
        </Select>

        <Input
          rotulo="Previsão de entrega"
          type="date"
          min={hojeLocal()}
          value={previsao}
          onChange={(e) => setPrevisao(e.target.value)}
          erro={erros['previsaoEntrega']}
        />

        <Textarea
          rotulo="Observações internas (opcional)"
          value={observacoes}
          maxLength={5000}
          onChange={(e) => setObservacoes(e.target.value)}
          dica="Não são exibidas ao cliente."
        />
      </form>
    </Modal>
  );
}
