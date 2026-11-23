/**
 * Destino do CLIENTE após o login (Fase 3). Mostra que a sessão e o controle por perfil
 * funcionam; o dashboard do portal (veículos, timeline, ocorrências, documentos) é a Fase 4.
 */
import { CabecalhoSessao } from '@/components/layout/CabecalhoSessao';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export function PortalInicioPage() {
  const { usuario } = useAuth();
  return (
    <div className="min-h-dvh">
      <CabecalhoSessao subtitulo="Portal do cliente" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-marinho-900 md:text-3xl">
          Olá, {usuario?.nome.split(' ')[0]}!
        </h1>
        <Card titulo="Portal em construção">
          <p className="text-slate-700">
            Você está autenticado no portal do cliente. O acompanhamento da blindagem (veículos, linha do
            tempo, ocorrências e documentos) será disponibilizado na próxima etapa do desenvolvimento.
          </p>
        </Card>
      </main>
    </div>
  );
}
