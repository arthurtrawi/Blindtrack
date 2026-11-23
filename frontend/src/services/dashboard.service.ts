import type { RespostaDados } from '@/types/api';
import type { IndicadoresDashboard, StatusSaude } from '@/types/dashboard';
import { api } from './api';
import { dados } from './util';

export function indicadores(signal?: AbortSignal): Promise<IndicadoresDashboard> {
  return dados(api.get<RespostaDados<IndicadoresDashboard>>('/dashboard/indicadores', { signal }));
}

/**
 * GET /health. O backend responde 503 com o mesmo corpo quando o banco está fora;
 * por isso o 503 é tratado como resposta válida ("degradado"), e não como falha de rede.
 */
export async function saude(signal?: AbortSignal): Promise<StatusSaude> {
  return api.get<StatusSaude>('/health', { signal, ignorar401: true, statusAceitos: [503] });
}
