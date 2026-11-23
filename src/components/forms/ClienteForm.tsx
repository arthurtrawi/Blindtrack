/**
 * Cadastro/edição de cliente. Regras espelhadas do backend: CPF ou CNPJ (inclusive
 * alfanumérico) com dígitos verificadores e coerente com o tipo de pessoa; telefone com DDD;
 * endereço opcional (minimização, LGPD). Corrigir CPF/CNPJ: só ADMIN/GESTOR.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/CamposFormulario';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePermissao } from '@/hooks/usePermissao';
import { useToast } from '@/hooks/useToast';
import * as clienteService from '@/services/cliente.service';
import type { Cliente } from '@/types/cliente';
import { aplicarErrosDaApi } from '@/utils/formularios';
import {
  campoEmail,
  campoTelefone,
  campoTexto,
  normalizarDocumento,
  tipoDoDocumento,
  UFS,
} from '@/utils/validacao';

const opcional = (max: number) => z.string().trim().max(max);

const esquema = z
  .object({
    tipoPessoa: z.enum(['FISICA', 'JURIDICA']),
    nome: campoTexto(3, 150, 'Nome'),
    cpfCnpj: z.string().transform(normalizarDocumento),
    email: campoEmail,
    telefone: campoTelefone,
    cep: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .refine((v) => v === '' || v.length === 8, 'CEP com 8 dígitos'),
    logradouro: opcional(150),
    numero: opcional(10),
    complemento: opcional(60),
    bairro: opcional(80),
    cidade: opcional(80),
    uf: z.string(),
  })
  .superRefine((d, ctx) => {
    const tipo = tipoDoDocumento(d.cpfCnpj);
    if (!tipo) ctx.addIssue({ code: 'custom', path: ['cpfCnpj'], message: 'CPF/CNPJ inválido' });
    else if (tipo !== d.tipoPessoa) {
      ctx.addIssue({
        code: 'custom',
        path: ['cpfCnpj'],
        message: d.tipoPessoa === 'FISICA' ? 'Pessoa física exige CPF' : 'Pessoa jurídica exige CNPJ',
      });
    }
  });
type Entrada = z.input<typeof esquema>;
type Saida = z.output<typeof esquema>;

const CAMPOS = [
  'nome',
  'cpfCnpj',
  'email',
  'telefone',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
] as const;

interface ClienteFormProps {
  cliente: Cliente | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function ClienteForm({ cliente, aoFechar, aoSalvar }: ClienteFormProps) {
  const podeFazer = usePermissao();
  const { notificar } = useToast();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const edicao = cliente !== null;
  const podeCorrigirDocumento = !edicao || podeFazer('cliente.corrigirDocumento');

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Entrada, unknown, Saida>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipoPessoa: cliente?.tipoPessoa ?? 'FISICA',
      nome: cliente?.nome ?? '',
      cpfCnpj: cliente?.cpfCnpj ?? '',
      email: cliente?.email ?? '',
      telefone: cliente?.telefone ?? '',
      cep: cliente?.cep ?? '',
      logradouro: cliente?.logradouro ?? '',
      numero: cliente?.numero ?? '',
      complemento: cliente?.complemento ?? '',
      bairro: cliente?.bairro ?? '',
      cidade: cliente?.cidade ?? '',
      uf: cliente?.uf ?? '',
    },
  });
  const tipoPessoa = useWatch({ control, name: 'tipoPessoa' });

  async function salvar(dados: Saida) {
    setErroGeral(null);
    // Endereço vazio: na criação é omitido; na edição vira null (remove o valor).
    const endereco = Object.fromEntries(
      (['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] as const).map((c) => [
        c,
        dados[c] ? dados[c] : edicao ? null : undefined,
      ]),
    );
    try {
      if (cliente) {
        await clienteService.atualizar(cliente.id, {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          ...(podeCorrigirDocumento && dados.cpfCnpj !== cliente.cpfCnpj && { cpfCnpj: dados.cpfCnpj }),
          ...endereco,
        });
        notificar('sucesso', 'Cliente atualizado.');
      } else {
        await clienteService.criar({
          tipoPessoa: dados.tipoPessoa,
          nome: dados.nome,
          cpfCnpj: dados.cpfCnpj,
          email: dados.email,
          telefone: dados.telefone,
          ...endereco,
        });
        notificar('sucesso', 'Cliente cadastrado.');
      }
      aoSalvar();
    } catch (erro) {
      setErroGeral(aplicarErrosDaApi(erro, setError, CAMPOS));
    }
  }

  return (
    <Modal
      aberto
      titulo={edicao ? 'Editar cliente' : 'Novo cliente'}
      aoFechar={aoFechar}
      bloqueado={isSubmitting}
      largura="lg"
      acoes={
        <>
          <Button variante="secondary" onClick={aoFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cliente" carregando={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        id="form-cliente"
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
        {edicao ? (
          // Tipo de pessoa não muda na edição (seria outro cadastro); campo oculto mantém o valor.
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-slate-800">Tipo de pessoa</p>
            <p className="text-slate-700">{tipoPessoa === 'FISICA' ? 'Pessoa física' : 'Pessoa jurídica'}</p>
            <input type="hidden" {...register('tipoPessoa')} />
          </div>
        ) : (
          <Select rotulo="Tipo de pessoa" {...register('tipoPessoa')}>
            <option value="FISICA">Pessoa física</option>
            <option value="JURIDICA">Pessoa jurídica</option>
          </Select>
        )}
        <Input
          rotulo={tipoPessoa === 'FISICA' ? 'CPF' : 'CNPJ'}
          readOnly={!podeCorrigirDocumento}
          className={!podeCorrigirDocumento ? 'bg-slate-100' : ''}
          dica={!podeCorrigirDocumento ? 'Só ADMIN ou GESTOR podem corrigir o documento.' : undefined}
          erro={errors.cpfCnpj?.message}
          {...register('cpfCnpj')}
        />
        <div className="sm:col-span-2">
          <Input
            rotulo={tipoPessoa === 'FISICA' ? 'Nome completo' : 'Razão social'}
            erro={errors.nome?.message}
            {...register('nome')}
          />
        </div>
        <Input rotulo="E-mail" type="email" erro={errors.email?.message} {...register('email')} />
        <Input
          rotulo="Telefone"
          type="tel"
          placeholder="(11) 99999-0000"
          erro={errors.telefone?.message}
          {...register('telefone')}
        />

        <fieldset className="grid gap-4 border-t border-slate-200 pt-4 sm:col-span-2 sm:grid-cols-6">
          <legend className="text-sm font-medium text-slate-800">Endereço (opcional)</legend>
          <div className="sm:col-span-2">
            <Input rotulo="CEP" inputMode="numeric" erro={errors.cep?.message} {...register('cep')} />
          </div>
          <div className="sm:col-span-4">
            <Input rotulo="Logradouro" erro={errors.logradouro?.message} {...register('logradouro')} />
          </div>
          <div className="sm:col-span-2">
            <Input rotulo="Número" erro={errors.numero?.message} {...register('numero')} />
          </div>
          <div className="sm:col-span-4">
            <Input rotulo="Complemento" erro={errors.complemento?.message} {...register('complemento')} />
          </div>
          <div className="sm:col-span-2">
            <Input rotulo="Bairro" erro={errors.bairro?.message} {...register('bairro')} />
          </div>
          <div className="sm:col-span-3">
            <Input rotulo="Cidade" erro={errors.cidade?.message} {...register('cidade')} />
          </div>
          <div className="sm:col-span-1">
            <Select rotulo="UF" {...register('uf')}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
