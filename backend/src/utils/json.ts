/**
 * Prepara dados para colunas JSON (auditoria).
 * - Converte Date em string ISO e remove valores não serializáveis.
 * - Remove recursivamente campos sensíveis: hash ou senha nunca vão para a auditoria (LGPD).
 */
import type { Prisma } from '../generated/prisma/client.js';

const CHAVES_SENSIVEIS = new Set(['senha', 'senhaHash', 'senhaAtual', 'novaSenha', 'token']);

export function paraJsonAuditoria(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;

  const texto = JSON.stringify(valor, (chave, v: unknown) => (CHAVES_SENSIVEIS.has(chave) ? undefined : v));
  return JSON.parse(texto) as Prisma.InputJsonValue;
}
