import { createContext } from 'react';

export type TipoToast = 'sucesso' | 'erro' | 'aviso';

export interface ValorToast {
  notificar: (tipo: TipoToast, mensagem: string, detalhes?: readonly string[]) => void;
}

export const ToastContexto = createContext<ValorToast | null>(null);
