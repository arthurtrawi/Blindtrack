/**
 * Filtros de listagem guardados na URL (?status=...&page=2): recarregar ou compartilhar o
 * link mantém a busca, e os botões voltar/avançar do navegador funcionam.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useFiltrosNaUrl<C extends string>(chaves: readonly C[]) {
  const [parametros, setParametros] = useSearchParams();

  const filtros = useMemo(() => {
    const valores = {} as Partial<Record<C, string>>;
    for (const chave of chaves) {
      const valor = parametros.get(chave);
      if (valor) valores[chave] = valor;
    }
    return valores;
    // `chaves` é uma lista constante declarada por quem chama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros]);

  const pagina = Math.max(1, Number(parametros.get('page')) || 1);

  /** Altera filtros; qualquer mudança de filtro volta para a página 1. */
  const alterar = useCallback(
    (alteracoes: Partial<Record<C, string | undefined>>) => {
      setParametros((atuais) => {
        const novos = new URLSearchParams(atuais);
        for (const [chave, valor] of Object.entries(alteracoes) as [string, string | undefined][]) {
          if (valor) novos.set(chave, valor);
          else novos.delete(chave);
        }
        novos.delete('page');
        return novos;
      });
    },
    [setParametros],
  );

  const irParaPagina = useCallback(
    (novaPagina: number) => {
      setParametros((atuais) => {
        const novos = new URLSearchParams(atuais);
        if (novaPagina <= 1) novos.delete('page');
        else novos.set('page', String(novaPagina));
        return novos;
      });
    },
    [setParametros],
  );

  const limpar = useCallback(() => setParametros(new URLSearchParams()), [setParametros]);

  return { filtros, pagina, alterar, irParaPagina, limpar };
}
