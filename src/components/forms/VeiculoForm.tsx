/**
 * Cadastro/edição de veículo. Placa (antiga ou Mercosul) e chassi (VIN, sem I/O/Q) normalizados;
 * ano-modelo igual ao de fabricação ou o seguinte. Trocar o proprietário só é aceito pelo
 * backend se o veículo não tiver OS ativa (RF12): o erro dele aparece no formulário.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ClienteBusca } from '@/components/forms/ClienteBusca';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import * as veiculoService from '@/services/veiculo.service';
import type { Veiculo } from '@/types/veiculo';
import { aplicarErrosDaApi } from '@/utils/formularios';
import { campoTexto, normalizarChassi, normalizarPlaca, REGEX_CHASSI, REGEX_PLACA } from '@/utils/validacao';

const anoMaximo = new Date().getFullYear() + 1;
const campoAno = (nome: string) =>
  z.coerce
    .number(`${nome} inválido`)
    .int(`${nome} inválido`)
    .min(1950, `${nome}: a partir de 1950`)
    .max(anoMaximo, `${nome}: até ${anoMaximo}`);

const esquema = z
  .object({
    placa: z
      .string()
      .transform(normalizarPlaca)
      .refine((v) => REGEX_PLACA.test(v), 'Placa inválida (ABC1234 ou ABC1D23)'),
    chassi: z
      .string()
      .transform(normalizarChassi)
      .refine((v) => REGEX_CHASSI.test(v), 'Chassi inválido (17 caracteres, sem I, O e Q)'),
    marca: campoTexto(2, 50, 'Marca'),
    modelo: campoTexto(1, 80, 'Modelo'),
    anoFabricacao: campoAno('Ano de fabricação'),
    anoModelo: campoAno('Ano-modelo'),
    cor: campoTexto(3, 30, 'Cor'),
    clienteId: z.string().min(1, 'Selecione o proprietário'),
  })
  .refine((d) => d.anoModelo >= d.anoFabricacao && d.anoModelo <= d.anoFabricacao + 1, {
    message: 'Ano-modelo deve ser igual ao de fabricação ou o seguinte',
    path: ['anoModelo'],
  });
type Entrada = z.input<typeof esquema>;
type Saida = z.output<typeof esquema>;

const CAMPOS = [
  'placa',
  'chassi',
  'marca',
  'modelo',
  'anoFabricacao',
  'anoModelo',
  'cor',
  'clienteId',
] as const;

interface VeiculoFormProps {
  veiculo: Veiculo | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function VeiculoForm({ veiculo, aoFechar, aoSalvar }: VeiculoFormProps) {
  const { notificar } = useToast();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Entrada, unknown, Saida>({
    resolver: zodResolver(esquema),
    defaultValues: {
      placa: veiculo?.placa ?? '',
      chassi: veiculo?.chassi ?? '',
      marca: veiculo?.marca ?? '',
      modelo: veiculo?.modelo ?? '',
      anoFabricacao: veiculo?.anoFabricacao ?? new Date().getFullYear(),
      anoModelo: veiculo?.anoModelo ?? new Date().getFullYear(),
      cor: veiculo?.cor ?? '',
      clienteId: veiculo?.clienteId ?? '',
    },
  });

  async function salvar(dados: Saida) {
    setErroGeral(null);
    try {
      if (veiculo) await veiculoService.atualizar(veiculo.id, dados);
      else await veiculoService.criar(dados);
      notificar('sucesso', veiculo ? 'Veículo atualizado.' : 'Veículo cadastrado.');
      aoSalvar();
    } catch (erro) {
      setErroGeral(aplicarErrosDaApi(erro, setError, CAMPOS));
    }
  }

  return (
    <Modal
      aberto
      titulo={veiculo ? 'Editar veículo' : 'Novo veículo'}
      aoFechar={aoFechar}
      bloqueado={isSubmitting}
      largura="lg"
      acoes={
        <>
          <Button variante="secondary" onClick={aoFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-veiculo" carregando={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        id="form-veiculo"
        noValidate
        onSubmit={handleSubmit(salvar)}
        className="grid gap-4 sm:grid-cols-2"
      >
        {erroGeral && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2"
          >
            {erroGeral}
          </p>
        )}
        <Input rotulo="Placa" placeholder="ABC1D23" erro={errors.placa?.message} {...register('placa')} />
        <Input rotulo="Chassi" erro={errors.chassi?.message} {...register('chassi')} />
        <Input rotulo="Marca" erro={errors.marca?.message} {...register('marca')} />
        <Input rotulo="Modelo" erro={errors.modelo?.message} {...register('modelo')} />
        <Input
          rotulo="Ano de fabricação"
          type="number"
          inputMode="numeric"
          erro={errors.anoFabricacao?.message}
          {...register('anoFabricacao')}
        />
        <Input
          rotulo="Ano-modelo"
          type="number"
          inputMode="numeric"
          erro={errors.anoModelo?.message}
          {...register('anoModelo')}
        />
        <Input rotulo="Cor" erro={errors.cor?.message} {...register('cor')} />
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <ClienteBusca
                rotulo="Proprietário"
                valor={field.value}
                aoMudar={field.onChange}
                erro={errors.clienteId?.message}
                atual={veiculo ? veiculo.cliente : undefined}
              />
            )}
          />
          {veiculo && (
            <p className="mt-1 text-xs text-slate-600">
              Trocar o proprietário só é permitido se o veículo não tiver ordem de serviço em aberto.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
