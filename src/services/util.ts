import type { RespostaDados } from '@/types/api';

/** Desembrulha o envelope `{ data }` das respostas da API. */
export async function dados<T>(resposta: Promise<RespostaDados<T>>): Promise<T> {
  return (await resposta).data;
}

/** Converte filtros tipados em query string aceita pelo api.ts. */
export function comoQuery<T extends object>(
  filtros: T | undefined,
): Record<string, string | number | boolean | undefined> {
  return { ...(filtros as Record<string, string | number | boolean | undefined>) };
}
