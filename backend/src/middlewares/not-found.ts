import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../utils/app-error.js';

/** Rota inexistente: encaminha um 404 padronizado ao errorHandler. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Rota ${req.method} ${req.path}`));
}
