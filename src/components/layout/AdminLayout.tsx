/**
 * Layout do painel: sidebar fixa a partir de lg (1024 px) e gaveta no mobile (abre pelo ☰,
 * foco preso, Esc fecha). O menu mostra só os itens permitidos ao perfil.
 */
import {
  Car,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LimiteDeErro } from '@/components/erros/LimiteDeErro';
import { Carregando } from '@/components/ui/EstadoCarregamento';
import { useAuth } from '@/hooks/useAuth';
import type { PerfilUsuario } from '@/types/usuario';
import { PERFIS_MENU, ROTULO_PERFIL } from '@/utils/permissoes';

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  perfis: readonly PerfilUsuario[];
  exato?: boolean;
}

const ITENS_MENU: readonly ItemMenu[] = [
  {
    para: '/painel',
    rotulo: 'Dashboard',
    icone: LayoutDashboard,
    perfis: PERFIS_MENU.dashboard,
    exato: true,
  },
  { para: '/painel/ordens', rotulo: 'Ordens de serviço', icone: ClipboardList, perfis: PERFIS_MENU.ordens },
  { para: '/painel/clientes', rotulo: 'Clientes', icone: Users, perfis: PERFIS_MENU.clientes },
  { para: '/painel/veiculos', rotulo: 'Veículos', icone: Car, perfis: PERFIS_MENU.veiculos },
  { para: '/painel/usuarios', rotulo: 'Usuários', icone: UserCog, perfis: PERFIS_MENU.usuarios },
  {
    para: '/painel/modelos-etapa',
    rotulo: 'Configurações',
    icone: Settings2,
    perfis: PERFIS_MENU.modelosEtapa,
  },
];

function Navegacao({ perfil, aoNavegar }: { perfil: PerfilUsuario; aoNavegar?: () => void }) {
  return (
    <nav aria-label="Menu principal">
      <ul className="space-y-1">
        {ITENS_MENU.filter((item) => item.perfis.includes(perfil)).map((item) => (
          <li key={item.para}>
            <NavLink
              to={item.para}
              end={item.exato}
              onClick={aoNavegar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icone className="size-5" aria-hidden="true" />
              {item.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2 px-3 text-white">
      <ShieldCheck className="size-7" aria-hidden="true" />
      <div className="leading-tight">
        <p className="font-semibold">BlindTrack</p>
        <p className="text-xs text-slate-300">Painel administrativo</p>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const gaveta = useRef<HTMLDivElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const conteudo = useRef<HTMLElement>(null);
  const caminhoAnterior = useRef(local.pathname);

  // Ao trocar de tela, o foco vai para o conteúdo (como numa página nova): o leitor de tela
  // anuncia a nova tela e o Tab recomeça dali. Não roda na primeira carga nem ao mudar filtros.
  useEffect(() => {
    if (caminhoAnterior.current === local.pathname) return;
    caminhoAnterior.current = local.pathname;
    conteudo.current?.focus();
  }, [local.pathname]);

  // Gaveta: Esc fecha, foco vai para dentro ao abrir e volta ao botão ao fechar.
  useEffect(() => {
    if (!gavetaAberta) return;
    const botao = botaoMenu.current;
    gaveta.current?.querySelector<HTMLElement>('a, button')?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGavetaAberta(false);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      botao?.focus();
    };
  }, [gavetaAberta]);

  if (!usuario) return null;

  async function aoSair() {
    setSaindo(true);
    await sair();
    navegar('/login', { replace: true });
  }

  const botaoSair = (
    <button
      type="button"
      onClick={aoSair}
      disabled={saindo}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      <LogOut className="size-5" aria-hidden="true" />
      {saindo ? 'Saindo...' : 'Sair'}
    </button>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-blue-800 shadow"
      >
        Pular para o conteúdo
      </a>

      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between bg-marinho-900 py-5 lg:flex">
        <div className="space-y-6 px-3">
          <Marca />
          <Navegacao perfil={usuario.perfil} />
        </div>
        <div className="px-3">{botaoSair}</div>
      </aside>

      {/* Gaveta (mobile/tablet) */}
      {gavetaAberta && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden="true"
            onClick={() => setGavetaAberta(false)}
          />
          <div
            ref={gaveta}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="relative flex h-full w-72 max-w-[85%] flex-col justify-between bg-marinho-900 py-5"
          >
            <div className="space-y-6 px-3">
              <div className="flex items-center justify-between">
                <Marca />
                <button
                  type="button"
                  onClick={() => setGavetaAberta(false)}
                  aria-label="Fechar menu"
                  className="rounded p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <Navegacao perfil={usuario.perfil} aoNavegar={() => setGavetaAberta(false)} />
            </div>
            <div className="px-3">{botaoSair}</div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          ref={botaoMenu}
          type="button"
          onClick={() => setGavetaAberta(true)}
          aria-label="Abrir menu"
          aria-expanded={gavetaAberta}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <span className="lg:hidden" />
        <div className="ml-auto text-right text-sm leading-tight">
          <p className="font-medium text-slate-900">{usuario.nome}</p>
          <p className="text-xs text-slate-600">{ROTULO_PERFIL[usuario.perfil]}</p>
        </div>
      </header>

      <main
        ref={conteudo}
        id="conteudo"
        tabIndex={-1}
        key={local.pathname}
        className="mx-auto max-w-7xl space-y-6 px-4 py-6 outline-none md:px-6"
      >
        <LimiteDeErro chaveReinicio={local.pathname}>
          <Suspense fallback={<Carregando texto="Carregando a tela..." />}>
            <Outlet />
          </Suspense>
        </LimiteDeErro>
      </main>
    </div>
  );
}
