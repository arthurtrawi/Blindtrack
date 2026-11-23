/**
 * Abas acessíveis (padrão WAI-ARIA Tabs): role tablist/tab/tabpanel, aria-selected,
 * setas ←/→ e Home/End movem entre as abas, só a aba ativa entra na ordem do Tab.
 */
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface Aba<C extends string> {
  chave: C;
  rotulo: ReactNode;
}

interface AbasProps<C extends string> {
  abas: readonly Aba<C>[];
  ativa: C;
  aoMudar: (chave: C) => void;
  rotulo: string;
  children: ReactNode;
}

export function Abas<C extends string>({ abas, ativa, aoMudar, rotulo, children }: AbasProps<C>) {
  const base = useId();
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);

  function aoTeclar(evento: KeyboardEvent, indice: number) {
    const destinos: Record<string, number> = {
      ArrowRight: (indice + 1) % abas.length,
      ArrowLeft: (indice - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    const aba = abas[destino];
    if (aba) {
      aoMudar(aba.chave);
      botoes.current[destino]?.focus();
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={rotulo}
        className="relative flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {abas.map((aba, indice) => {
          const selecionada = aba.chave === ativa;
          return (
            <button
              key={aba.chave}
              ref={(el) => {
                botoes.current[indice] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-aba-${aba.chave}`}
              aria-selected={selecionada}
              aria-controls={`${base}-painel`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => aoMudar(aba.chave)}
              onKeyDown={(e) => aoTeclar(e, indice)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap ${
                selecionada
                  ? 'border-blue-700 text-blue-800'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-painel`}
        aria-labelledby={`${base}-aba-${ativa}`}
        tabIndex={0}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  );
}
