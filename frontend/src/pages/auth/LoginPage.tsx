/**
 * Login compartilhado pelo portal e pelo painel; o destino depende do perfil.
 * A senha só existe no estado do formulário: nunca é gravada (nem em localStorage).
 * Recuperação de senha: oculta, porque o backend não oferece esse fluxo (planejamento §11.3).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { TelaCarregando } from '@/components/layout/TelaCarregando';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import type { EstadoNavegacaoLogin } from '@/routes/ProtectedRoute';
import { ApiError } from '@/services/api';
import { caminhoPermitido, rotaInicial } from '@/utils/permissoes';

const esquemaLogin = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').pipe(z.email('E-mail inválido')),
  senha: z.string().min(1, 'Informe a senha'),
});
type DadosLogin = z.infer<typeof esquemaLogin>;

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    // 401 e 429 já chegam com mensagem pronta para o usuário (ex.: "E-mail ou senha inválidos").
    if (erro.status === 401 || erro.status === 429 || erro.code === 'REDE' || erro.code === 'TIMEOUT') {
      return erro.message;
    }
    if (erro.status === 400) return 'Verifique os dados informados.';
    return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
  return 'Ocorreu um erro inesperado.';
}

export function LoginPage() {
  useTituloPagina('Entrar');
  const { status, usuario, motivoSaida, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [parametros] = useSearchParams();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DadosLogin>({ resolver: zodResolver(esquemaLogin), defaultValues: { email: '', senha: '' } });

  const sessaoExpirada = parametros.get('expirada') === '1' || motivoSaida === 'expirada';
  const destinoSolicitado = (local.state as EstadoNavegacaoLogin | null)?.de;

  if (status === 'verificando') return <TelaCarregando />;
  // Já autenticado (ex.: voltou para /login): segue para a sua área.
  if (status === 'autenticado' && usuario) return <Navigate to={rotaInicial(usuario.perfil)} replace />;

  async function aoEnviar(dados: DadosLogin) {
    setErroGeral(null);
    try {
      const usuarioLogado = await entrar(dados);
      const destino =
        destinoSolicitado && caminhoPermitido(usuarioLogado.perfil, destinoSolicitado)
          ? destinoSolicitado
          : rotaInicial(usuarioLogado.perfil);
      navegar(destino, { replace: true });
    } catch (erro) {
      if (erro instanceof ApiError) {
        for (const { campo, mensagem } of erro.errosDeCampo) {
          if (campo === 'email' || campo === 'senha') setError(campo, { message: mensagem });
        }
      }
      setErroGeral(mensagemDeErro(erro));
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-xl bg-marinho-900 p-3 text-white shadow-sm">
            <ShieldCheck className="size-8" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-marinho-900">BlindTrack</h1>
            <p className="text-sm text-slate-600">Gestão e acompanhamento de blindagem</p>
          </div>
        </header>

        {sessaoExpirada && !erroGeral && (
          <div
            role="status"
            className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
          >
            Sua sessão expirou. Entre novamente para continuar.
          </div>
        )}

        <form
          noValidate
          onSubmit={handleSubmit(aoEnviar)}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          aria-describedby={erroGeral ? 'erro-login' : undefined}
        >
          {erroGeral && (
            <div
              id="erro-login"
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {erroGeral}
            </div>
          )}

          <Input
            rotulo="E-mail"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            erro={errors.email?.message}
            {...register('email')}
          />

          <Input
            rotulo="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            erro={errors.senha?.message}
            acessorio={
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
                className="rounded p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {mostrarSenha ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            }
            {...register('senha')}
          />

          <Button type="submit" carregando={isSubmitting} className="w-full">
            {!isSubmitting && <LogIn className="size-4" aria-hidden="true" />}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-600">
          Esqueceu a senha? Procure o atendimento da empresa para redefini-la.
        </p>
      </div>
    </main>
  );
}
