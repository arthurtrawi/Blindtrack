/**
 * Registro da trilha de auditoria (RF27). Serviço transversal usado pelos demais.
 * Deve ser chamado DENTRO da mesma transação da alteração auditada (RN29).
 */
import type { DbClient } from '../config/prisma.js';
import type { AcaoAuditoria } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { paraJsonAuditoria } from '../utils/json.js';

export type EntidadeAuditada =
  | 'Usuario'
  | 'Cliente'
  | 'Veiculo'
  | 'OrdemServico'
  | 'EtapaProcesso'
  | 'Ocorrencia'
  | 'Documento'
  | 'ModeloEtapa';

export interface RegistroAuditoria {
  entidade: EntidadeAuditada;
  entidadeId: string;
  acao: AcaoAuditoria;
  antes?: unknown;
  depois?: unknown;
}

export async function registrarAuditoria(
  db: DbClient,
  ctx: ContextoRequisicao | null,
  registro: RegistroAuditoria,
): Promise<void> {
  await db.auditoria.create({
    data: {
      usuarioId: ctx?.usuario.id ?? null,
      entidade: registro.entidade,
      entidadeId: registro.entidadeId,
      acao: registro.acao,
      dadosAnteriores: paraJsonAuditoria(registro.antes),
      dadosNovos: paraJsonAuditoria(registro.depois),
      requestId: ctx?.requestId?.slice(0, 64) ?? null,
      ip: ctx?.ip?.slice(0, 45) ?? null,
    },
  });
}

/** Mantém em `depois` só os campos que de fato mudaram (auditoria mais legível). */
export function diferencas<T extends Record<string, unknown>>(
  antes: T,
  depois: T,
): { antes: Partial<T>; depois: Partial<T> } {
  const resultadoAntes: Partial<T> = {};
  const resultadoDepois: Partial<T> = {};
  for (const chave of Object.keys(depois) as (keyof T)[]) {
    const a = antes[chave];
    const d = depois[chave];
    const iguais =
      a instanceof Date && d instanceof Date
        ? a.getTime() === d.getTime()
        : JSON.stringify(a) === JSON.stringify(d);
    if (!iguais) {
      resultadoAntes[chave] = a;
      resultadoDepois[chave] = d;
    }
  }
  return { antes: resultadoAntes, depois: resultadoDepois };
}
