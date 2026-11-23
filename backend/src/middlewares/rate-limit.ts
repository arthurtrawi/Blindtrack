/**
 * Limite de tentativas de login por IP (RNF05), contra força bruta.
 * É uma fábrica para que os testes criem limitadores com limites pequenos.
 */
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import { AppError } from '../utils/app-error.js';

export interface OpcoesLimite {
  max: number;
  janelaMinutos: number;
}

export function criarLimiteLogin({ max, janelaMinutos }: OpcoesLimite): RateLimitRequestHandler {
  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Só tentativas que falharam contam: um usuário legítimo não fica bloqueado.
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          `Muitas tentativas de login. Tente novamente em ${janelaMinutos} minutos.`,
          429,
          'TOO_MANY_REQUESTS',
        ),
      );
    },
  });
}
