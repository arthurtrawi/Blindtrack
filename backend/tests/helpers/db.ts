/**
 * Utilitários de banco para os testes de integração (sempre no banco blindtrack_test).
 */
import { prisma } from '../../src/config/prisma.js';

const TABELAS = [
  'historico_status',
  'alteracoes_previsao',
  'auditoria',
  'documentos',
  'ocorrencias',
  'etapas_processo',
  'ordens_servico',
  'veiculos',
  'usuarios',
  'clientes',
  'modelos_etapa',
] as const;

/** Verifica se o banco de testes está acessível. */
export async function bancoDisponivel(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Esvazia todas as tabelas. TRUNCATE não dispara os triggers de linha que tornam o
 * histórico imutável (ver migration init). Por segurança, recusa rodar fora de NODE_ENV=test.
 */
export async function limparBanco(): Promise<void> {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('limparBanco() só pode ser executado com NODE_ENV=test');
  }
  const lista = TABELAS.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}
