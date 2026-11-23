/**
 * Log HTTP com identificador único por requisição (RNF15).
 * Reaproveita o cabeçalho X-Request-Id recebido (se válido) ou gera um UUID,
 * e o devolve na resposta para correlação de logs.
 *
 * LGPD (RNF08): parâmetros de busca que identificam pessoas ou veículos (CPF, e-mail,
 * nome, placa...) são mascarados na URL e na query ANTES de chegar ao log. Sem isso,
 * `GET /clientes?documento=<CPF>` gravaria o CPF em texto claro a cada busca.
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { stdSerializers } from 'pino';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

const REQUEST_ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;
const MASCARA = '[REDACTED]';

/** Parâmetros de query que nunca vão para o log em texto claro. */
export const PARAMETROS_SENSIVEIS: ReadonlySet<string> = new Set([
  'documento',
  'cpfCnpj',
  'email',
  'nome',
  'busca',
  'telefone',
  'placa',
  'chassi',
]);

/** Mascara os valores dos parâmetros sensíveis da query string, preservando os demais. */
export function mascararUrl(url: string): string {
  const inicioQuery = url.indexOf('?');
  if (inicioQuery < 0) return url;

  const parametros = new URLSearchParams(url.slice(inicioQuery + 1));
  let alterou = false;
  for (const chave of new Set(parametros.keys())) {
    if (PARAMETROS_SENSIVEIS.has(chave)) {
      parametros.set(chave, MASCARA);
      alterou = true;
    }
  }
  if (!alterou) return url;
  return `${url.slice(0, inicioQuery)}?${parametros.toString().replaceAll(encodeURIComponent(MASCARA), MASCARA)}`;
}

/** Mesma máscara aplicada ao objeto de query já interpretado. */
export function mascararQuery(query: unknown): unknown {
  if (typeof query !== 'object' || query === null) return query;
  return Object.fromEntries(
    Object.entries(query).map(([chave, valor]) => [chave, PARAMETROS_SENSIVEIS.has(chave) ? MASCARA : valor]),
  );
}

export const requestLogger = pinoHttp({
  logger,
  genReqId(req: IncomingMessage, res: ServerResponse): string {
    const recebido = req.headers['x-request-id'];
    const id = typeof recebido === 'string' && REQUEST_ID_VALIDO.test(recebido) ? recebido : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  serializers: {
    req: stdSerializers.wrapRequestSerializer((req) => {
      req.url = mascararUrl(req.url);
      req.query = mascararQuery(req.query) as typeof req.query;
      return req;
    }),
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
});
