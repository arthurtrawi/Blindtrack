import type { Request } from 'express';
import type { ContextoRequisicao } from '../types/auth.js';
import { UnauthorizedError } from './app-error.js';

/**
 * Extrai do Request o contexto que os services precisam (usuário, requestId, IP).
 * Os services ficam independentes do Express, o que facilita testes e reuso.
 */
export function contextoDe(req: Pick<Request, 'user' | 'id' | 'ip'>): ContextoRequisicao {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return {
    usuario: req.user,
    requestId: typeof req.id === 'string' ? req.id : undefined,
    ip: req.ip,
  };
}
