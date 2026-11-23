/**
 * Destino dos perfis internos após o login (Fase 3). O layout com menu, o dashboard e as
 * telas de operação são a Fase 5.
 */
import { CabecalhoSessao } from '@/components/layout/CabecalhoSessao';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { ROTULO_PERFIL } from '@/utils/permissoes';

export function PainelInicioPage() {
  const { usuario } = useAuth();
  return (
    <div className="min-h-dvh">
      <CabecalhoSessao subtitulo="Painel administrativo" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-marinho-900 md:text-3xl">
          Bem-vindo(a), {usuario?.nome.split(' ')[0]}
        </h1>
        <Card titulo="Painel em construção">
          <p className="text-slate-700">
            Você entrou como <strong>{usuario ? ROTULO_PERFIL[usuario.perfil] : ''}</strong>. O dashboard, as
            ordens de serviço e os cadastros serão disponibilizados nas próximas etapas do desenvolvimento.
          </p>
        </Card>
      </main>
    </div>
  );
}
