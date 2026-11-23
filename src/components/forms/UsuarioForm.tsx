/**
 * Cadastro/edição de usuário (ADMIN). Espelha as regras do backend:
 * - perfil CLIENTE exige o cliente vinculado (um usuário de portal por cliente);
 * - na edição, interno ↔ CLIENTE não converte (crie outro usuário);
 * - o ADMIN não desativa nem muda o perfil de si mesmo;
 * - senha forte; redefinir a senha encerra as sessões do usuário (revogação no backend).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ClienteBusca } from '@/components/forms/ClienteBusca';
import { Button } from '@/components/ui/Button';
import { Checkbox, Select } from '@/components/ui/CamposFormulario';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import * as usuarioService from '@/services/usuario.service';
import type { PerfilUsuario, Usuario } from '@/types/usuario';
import { aplicarErrosDaApi } from '@/utils/formularios';
import { ROTULO_PERFIL } from '@/utils/permissoes';
import { campoEmail, campoSenha, campoTexto } from '@/utils/validacao';

const PERFIS = ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO', 'CLIENTE'] as const;

function criarEsquema(edicao: boolean) {
  return z
    .object({
      nome: campoTexto(3, 150, 'Nome'),
      email: campoEmail,
      perfil: z.enum(PERFIS),
      clienteId: z.string(),
      // Na edição a senha é opcional (só para redefinir).
      senha: edicao ? z.union([z.literal(''), campoSenha]) : campoSenha,
      ativo: z.boolean(),
    })
    .refine((d) => d.perfil !== 'CLIENTE' || d.clienteId !== '', {
      message: 'Selecione o cliente vinculado ao acesso do portal',
      path: ['clienteId'],
    });
}
type Dados = z.infer<ReturnType<typeof criarEsquema>>;

const CAMPOS = ['nome', 'email', 'perfil', 'clienteId', 'senha'] as const;

interface UsuarioFormProps {
  usuario: Usuario | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function UsuarioForm({ usuario, aoFechar, aoSalvar }: UsuarioFormProps) {
  const { usuario: logado } = useAuth();
  const { notificar } = useToast();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const edicao = usuario !== null;
  const proprio = usuario?.id === logado?.id;

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({
    resolver: zodResolver(criarEsquema(edicao)),
    defaultValues: {
      nome: usuario?.nome ?? '',
      email: usuario?.email ?? '',
      perfil: usuario?.perfil ?? 'TECNICO',
      clienteId: usuario?.clienteId ?? '',
      senha: '',
      ativo: usuario?.ativo ?? true,
    },
  });
  const perfil = useWatch({ control, name: 'perfil' });

  // Na edição, o perfil só muda dentro do mesmo grupo (interno ↔ interno).
  const perfisPermitidos: readonly PerfilUsuario[] = !usuario
    ? PERFIS
    : usuario.perfil === 'CLIENTE'
      ? ['CLIENTE']
      : PERFIS.filter((p) => p !== 'CLIENTE');

  async function salvar(dados: Dados) {
    setErroGeral(null);
    try {
      if (usuario) {
        await usuarioService.atualizar(usuario.id, {
          nome: dados.nome,
          email: dados.email,
          ...(!proprio && { perfil: dados.perfil, ativo: dados.ativo }),
          ...(dados.senha && { senha: dados.senha }),
        });
        notificar('sucesso', 'Usuário atualizado.');
      } else {
        await usuarioService.criar({
          nome: dados.nome,
          email: dados.email,
          senha: dados.senha,
          perfil: dados.perfil,
          ...(dados.perfil === 'CLIENTE' && { clienteId: dados.clienteId }),
        });
        notificar('sucesso', 'Usuário criado.');
      }
      aoSalvar();
    } catch (erro) {
      setErroGeral(aplicarErrosDaApi(erro, setError, CAMPOS));
    }
  }

  return (
    <Modal
      aberto
      titulo={edicao ? 'Editar usuário' : 'Novo usuário'}
      aoFechar={aoFechar}
      bloqueado={isSubmitting}
      largura="lg"
      acoes={
        <>
          <Button variante="secondary" onClick={aoFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-usuario" carregando={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        id="form-usuario"
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
        <Input rotulo="Nome" erro={errors.nome?.message} {...register('nome')} />
        <Input
          rotulo="E-mail"
          type="email"
          autoComplete="off"
          erro={errors.email?.message}
          {...register('email')}
        />
        {proprio ? (
          // O próprio perfil não muda (backend: AUTO_BLOQUEIO). Campo oculto mantém o valor no formulário.
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-slate-800">Perfil</p>
            <p className="text-slate-700">{ROTULO_PERFIL[perfil]} (você não pode alterar o próprio perfil)</p>
            <input type="hidden" {...register('perfil')} />
          </div>
        ) : (
          <Select rotulo="Perfil" erro={errors.perfil?.message} {...register('perfil')}>
            {perfisPermitidos.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PERFIL[p]}
              </option>
            ))}
          </Select>
        )}
        <Input
          rotulo={edicao ? 'Nova senha (opcional)' : 'Senha'}
          type="password"
          autoComplete="new-password"
          erro={errors.senha?.message}
          dica={
            edicao
              ? 'Preencha só para redefinir. As sessões do usuário serão encerradas.'
              : 'Mínimo de 10 caracteres, com letras e números.'
          }
          {...register('senha')}
        />
        {perfil === 'CLIENTE' && !edicao && (
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="clienteId"
              render={({ field }) => (
                <ClienteBusca
                  rotulo="Cliente vinculado"
                  valor={field.value}
                  aoMudar={field.onChange}
                  erro={errors.clienteId?.message}
                />
              )}
            />
          </div>
        )}
        {edicao && !proprio && (
          <div className="sm:col-span-2">
            <Checkbox
              rotulo="Usuário ativo"
              dica="Desativado não consegue entrar. Técnicos com etapas em curso precisam ser substituídos antes."
              {...register('ativo')}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
