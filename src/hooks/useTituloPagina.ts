import { useEffect } from 'react';

const MARCA = 'BlindTrack';

/**
 * Título da aba por tela (WCAG 2.4.2): identifica a página no histórico, nas abas e para
 * leitores de tela, que o anunciam ao navegar.
 */
export function useTituloPagina(titulo?: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${MARCA}` : MARCA;
  }, [titulo]);
}
