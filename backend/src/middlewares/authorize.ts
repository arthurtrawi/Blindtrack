/**
 * Autorização por perfil (RNF04). Sempre usado depois de `authenticate`.
 * A verificação de PROPRIEDADE do recurso (ex.: o cliente só vê as próprias OS) fica
 * nos services, porque depende dos dados.
 */
import type { NextFunction, Request, Response } from 'express';
import type { PerfilUsuario } from '../types/auth.js';
import { ForbiddenError, UnauthorizedError } from '../utils/app-error.js';

export function authorize(...perfisPermitidos: PerfilUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!perfisPermitidos.includes(req.user.perfil)) {
      throw new ForbiddenError('Seu perfil não tem permissão para esta operação');
    }
    next();
  };
}
