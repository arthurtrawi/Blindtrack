import { useCallback, useContext } from 'react';
import { ToastContexto, type ValorToast } from '@/contexts/toast-contexto';
import { ApiError } from '@/services/api';

export interface ValorUseToast extends ValorToast {
  /** Erro da API → toast: mensagem do backend + regra violada + pendências (RN17). */
  notificarErro: (erro: unknown, contexto?: string) => void;
}

function pendencias(erro: ApiError): string[] {
  const detalhes = erro.details as { pendencias?: unknown } | undefined;
  if (detalhes && Array.isArray(detalhes.pendencias)) {
    return detalhes.pendencias.filter((p): p is string => typeof p === 'string');
  }
  return erro.errosDeCampo.map((e) => `${e.campo}: ${e.mensagem}`);
}

export function useToast(): ValorUseToast {
  const valor = useContext(ToastContexto);
  if (!valor) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  const { notificar } = valor;

  const notificarErro = useCallback(
    (erro: unknown, contexto?: string) => {
      if (!(erro instanceof ApiError)) {
        notificar('erro', contexto ? `${contexto}: erro inesperado.` : 'Ocorreu um erro inesperado.');
        return;
      }
      // Regra de negócio (422) mostra o código, ex.: "RN09"; útil para o usuário falar com o suporte.
      const regra = erro.status === 422 && /^RN\d+/.test(erro.code) ? ` (${erro.code})` : '';
      const mensagem = `${contexto ? `${contexto}: ` : ''}${erro.message}${regra}`;
      notificar('erro', mensagem, pendencias(erro));
    },
    [notificar],
  );

  return { notificar, notificarErro };
}
