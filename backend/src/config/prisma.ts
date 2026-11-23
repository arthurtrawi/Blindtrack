/**
 * Instância única do Prisma Client (Prisma 7 + driver adapter do node-postgres).
 *
 * No Prisma 7 a conexão é feita por um "driver adapter": o Prisma Client usa o pool
 * do `pg` em vez de um engine binário próprio.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

function criarPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Padrão do Prisma: 2 s para obter conexão e 5 s por transação interativa.
    // Abrir uma OS grava OS + etapas + histórico + auditoria numa transação; em máquinas
    // lentas, 5 s é pouco. Limites maiores, mas ainda finitos (evitam lock eterno).
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });
}

// Reaproveita a instância entre recargas do watcher, evitando abrir pools duplicados.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalParaPrisma.prisma ?? criarPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = prisma;
}

/** Cliente de transação, para services que precisam participar de uma transação existente. */
export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/** Aceita o client global ou um client de transação. */
export type DbClient = PrismaClient | TransactionClient;
