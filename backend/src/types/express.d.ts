/**
 * Extensão dos tipos do Express.
 * `req.user` é preenchido pelo middleware `authenticate`.
 */
import 'express';
import type { UsuarioAutenticado } from './auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UsuarioAutenticado;
  }
}
