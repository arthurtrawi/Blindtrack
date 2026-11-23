/**
 * Ponto de entrada: valida o ambiente, confirma a conexão com o PostgreSQL,
 * sobe o servidor HTTP e trata o encerramento gracioso (SIGINT/SIGTERM).
 */
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const TENTATIVAS_CONEXAO = 5;
const INTERVALO_TENTATIVA_MS = 2000;

async function aguardar(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tenta conectar algumas vezes, pois o container pode ainda estar inicializando. */
async function conectarBanco(): Promise<void> {
  for (let tentativa = 1; tentativa <= TENTATIVAS_CONEXAO; tentativa++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      logger.info('Conectado ao PostgreSQL');
      return;
    } catch (erro) {
      logger.warn(
        { tentativa, max: TENTATIVAS_CONEXAO, err: erro },
        'Falha ao conectar ao PostgreSQL. O container está rodando? (docker compose ps)',
      );
      if (tentativa === TENTATIVAS_CONEXAO) throw erro;
      await aguardar(INTERVALO_TENTATIVA_MS);
    }
  }
}

async function iniciar(): Promise<void> {
  await conectarBanco();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`API em http://localhost:${env.PORT}/api/v1 (docs: /api/v1/docs)`);
  });

  let encerrando = false;
  const encerrar = (sinal: NodeJS.Signals): void => {
    if (encerrando) return;
    encerrando = true;
    logger.info({ sinal }, 'Encerrando servidor...');

    // Força a saída se o encerramento travar.
    const timeout = setTimeout(() => {
      logger.error('Encerramento forçado após timeout');
      process.exit(1);
    }, 10_000);
    timeout.unref();

    server.close(() => {
      prisma
        .$disconnect()
        .then(() => {
          logger.info('Servidor encerrado');
          process.exit(0);
        })
        .catch((erro: unknown) => {
          logger.error({ err: erro }, 'Erro ao desconectar do banco');
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
}

process.on('unhandledRejection', (motivo) => {
  logger.fatal({ err: motivo }, 'Promise rejeitada sem tratamento');
  process.exit(1);
});

iniciar().catch((erro: unknown) => {
  logger.fatal({ err: erro }, 'Não foi possível iniciar a aplicação');
  process.exit(1);
});
