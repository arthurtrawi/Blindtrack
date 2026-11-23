/**
 * Cabeçalho com a marca, o usuário logado e o botão Sair.
 * Base para o PortalLayout (Fase 4) e o AdminLayout (Fase 5).
 */
import { LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ROTULO_PERFIL } from '@/utils/permissoes';

export function CabecalhoSessao({ subtitulo }: { subtitulo: string }) {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [saindo, setSaindo] = useState(false);

  async function aoSair() {
    setSaindo(true);
    await sair();
    navegar('/login', { replace: true });
  }

  return (
    <header className="bg-marinho-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6" aria-hidden="true" />
          <div className="leading-tight">
            <p className="font-semibold">BlindTrack</p>
            <p className="text-xs text-slate-300">{subtitulo}</p>
          </div>
        </div>
        {usuario && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-medium">{usuario.nome}</p>
              <p className="text-xs text-slate-300">{ROTULO_PERFIL[usuario.perfil]}</p>
            </div>
            <Button
              variante="ghost"
              tamanho="sm"
              onClick={aoSair}
              carregando={saindo}
              className="text-white hover:bg-white/10 disabled:text-slate-300"
            >
              {!saindo && <LogOut className="size-4" aria-hidden="true" />}
              Sair
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
