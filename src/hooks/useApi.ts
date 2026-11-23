/**
 * Carrega dados de um serviço com os estados exigidos (carregando, erro, sucesso) e
 * cancela a requisição ao desmontar o componente ou ao mudar as dependências.
 *
 * O estado "carregando" é DERIVADO (a resposta guardada pertence a outra chave de
 * requisição), em vez de definido com setState dentro do efeito: isso evita renderizações
 * em cascata (regra react-hooks/set-state-in-effect).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, ehCancelamento } from '@/services/api';

export type EstadoApi<T> =
  | { status: 'carregando'; dados: T | null; erro: null }
  | { status: 'sucesso'; dados: T; erro: null }
  | { status: 'erro'; dados: T | null; erro: ApiError };

export interface ResultadoUseApi<T> {
  estado: EstadoApi<T>;
  recarregar: () => void;
}

type Resolucao<T> =
  | { chave: string; status: 'sucesso'; dados: T }
  | { chave: string; status: 'erro'; dados: T | null; erro: ApiError };

function comoApiError(erro: unknown): ApiError {
  if (erro instanceof ApiError) return erro;
  return new ApiError('Ocorreu um erro inesperado.', 0, 'ERRO');
}

/**
 * @param dependencias valores simples (ids, filtros) que, ao mudar, disparam nova carga.
 */
export function useApi<T>(
  carregar: (signal: AbortSignal) => Promise<T>,
  dependencias: readonly unknown[],
): ResultadoUseApi<T> {
  const [versao, setVersao] = useState(0);
  const [resolucao, setResolucao] = useState<Resolucao<T> | null>(null);
  const chave = `${versao}|${JSON.stringify(dependencias)}`;

  // Sempre a versão mais recente da função, sem reexecutar o efeito a cada renderização.
  const carregarRef = useRef(carregar);
  useEffect(() => {
    carregarRef.current = carregar;
  });

  useEffect(() => {
    const controlador = new AbortController();
    carregarRef
      .current(controlador.signal)
      .then((dados) => {
        if (!controlador.signal.aborted) setResolucao({ chave, status: 'sucesso', dados });
      })
      .catch((erro: unknown) => {
        if (controlador.signal.aborted || ehCancelamento(erro)) return;
        setResolucao((anterior) => ({
          chave,
          status: 'erro',
          dados: anterior?.dados ?? null,
          erro: comoApiError(erro),
        }));
      });
    return () => controlador.abort();
  }, [chave]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  let estado: EstadoApi<T>;
  if (resolucao?.chave !== chave) {
    // Mantém os dados anteriores enquanto recarrega (evita a tela "piscar").
    estado = { status: 'carregando', dados: resolucao?.dados ?? null, erro: null };
  } else if (resolucao.status === 'sucesso') {
    estado = { status: 'sucesso', dados: resolucao.dados, erro: null };
  } else {
    estado = { status: 'erro', dados: resolucao.dados, erro: resolucao.erro };
  }
  return { estado, recarregar };
}
