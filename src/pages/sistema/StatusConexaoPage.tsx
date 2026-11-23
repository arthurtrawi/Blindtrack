/**
 * Diagnóstico da instalação (Fase 2): mostra, com dados REAIS do backend, que a
 * configuração (VITE_API_URL, CORS, api.ts) funciona. Será substituída pelo login na Fase 3,
 * permanecendo acessível em /status.
 */
import { CheckCircle2, Database, ServerCrash, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Carregando, ErroCarregamento } from '@/components/ui/EstadoCarregamento';
import { useApi } from '@/hooks/useApi';
import { saude } from '@/services/dashboard.service';

export function StatusConexaoPage() {
  const { estado, recarregar } = useApi((signal) => saude(signal), []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-4">
      <header className="flex items-center gap-3">
        <span className="rounded-lg bg-marinho-900 p-2 text-white">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-marinho-900">BlindTrack</h1>
          <p className="text-sm text-slate-600">Diagnóstico da conexão com a API</p>
        </div>
      </header>

      <Card titulo="Status do backend">
        {estado.status === 'carregando' && !estado.dados && <Carregando texto="Consultando a API..." />}
        {estado.status === 'erro' && <ErroCarregamento erro={estado.erro} aoTentarNovamente={recarregar} />}
        {estado.dados && (
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-slate-600">
                <ServerCrash className="size-4" aria-hidden="true" /> API
              </dt>
              <dd>
                {estado.dados.status === 'ok' ? (
                  <Badge tom="success" texto="Disponível" icone={CheckCircle2} />
                ) : (
                  <Badge tom="warning" texto="Degradada" icone={XCircle} />
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-slate-600">
                <Database className="size-4" aria-hidden="true" /> Banco de dados
              </dt>
              <dd>
                {estado.dados.database === 'up' ? (
                  <Badge tom="success" texto="Conectado" icone={CheckCircle2} />
                ) : (
                  <Badge tom="danger" texto="Indisponível" icone={XCircle} />
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-slate-600">Endereço configurado</dt>
              <dd className="font-mono text-xs break-all text-slate-800">{import.meta.env.VITE_API_URL}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Tempo no ar</dt>
              <dd className="tabular-nums">{estado.dados.uptimeSeconds} s</dd>
            </div>
          </dl>
        )}
      </Card>
    </main>
  );
}
