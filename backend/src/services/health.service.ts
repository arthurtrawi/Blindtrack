import type { DbClient } from '../config/prisma.js';

export interface StatusSaude {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Verifica a disponibilidade do banco com uma consulta trivial.
 * Recebe o client por parâmetro (injeção de dependência), o que facilita os testes.
 */
export async function verificarSaude(db: DbClient): Promise<StatusSaude> {
  let database: StatusSaude['database'] = 'up';
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }

  return {
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
