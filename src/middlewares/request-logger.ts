/**
 * Log HTTP com identificador único por requisição (RNF15).
 * Reaproveita o cabeçalho X-Request-Id recebido (se válido) ou gera um UUID,
 * e o devolve na resposta para correlação de logs.
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

const REQUEST_ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

export const requestLogger = pinoHttp({
  logger,
  genReqId(req: IncomingMessage, res: ServerResponse): string {
    const recebido = req.headers['x-request-id'];
    const id = typeof recebido === 'string' && REQUEST_ID_VALIDO.test(recebido) ? recebido : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
});
