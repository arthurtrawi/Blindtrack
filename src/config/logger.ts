/**
 * Logger estruturado (Pino).
 * - Em desenvolvimento usa pino-pretty para leitura humana; nos demais ambientes, JSON puro.
 * - `redact` mascara dados sensíveis (LGPD / RNF08) antes de qualquer saída.
 */
import { pino, type LoggerOptions } from 'pino';
import { env } from './env.js';

export const CAMPOS_SENSIVEIS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.senha',
  '*.senhaAtual',
  '*.novaSenha',
  '*.senhaHash',
  '*.token',
  '*.cpfCnpj',
  '*.password',
];

const opcoes: LoggerOptions = {
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: { paths: CAMPOS_SENSIVEIS, censor: '[REDACTED]' },
  base: { service: 'blindtrack-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (env.NODE_ENV === 'development') {
  opcoes.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname,service' },
  };
}

export const logger = pino(opcoes);
