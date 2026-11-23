/**
 * Paginação padronizada das listagens (RNF14): padrão 20 itens, máximo 100.
 */

export interface ParametrosPaginacao {
  page: number;
  pageSize: number;
}

export interface RespostaPaginada<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Converte page/pageSize em skip/take do Prisma. */
export function paraSkipTake({ page, pageSize }: ParametrosPaginacao): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function respostaPaginada<T>(
  data: T[],
  total: number,
  { page, pageSize }: ParametrosPaginacao,
): RespostaPaginada<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
