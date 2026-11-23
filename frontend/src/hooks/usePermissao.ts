import { useCallback } from 'react';
import { pode, type Acao, type ContextoPermissao } from '@/utils/permissoes';
import { useAuth } from './useAuth';

/** `const podeFazer = usePermissao(); podeFazer('etapa.alterarStatus', { responsavelId })` */
export function usePermissao() {
  const { usuario } = useAuth();
  return useCallback((acao: Acao, contexto?: ContextoPermissao) => pode(usuario, acao, contexto), [usuario]);
}
