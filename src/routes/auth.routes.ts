import { Router } from 'express';
import { env } from '../config/env.js';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { criarLimiteLogin } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';
import { alterarSenhaSchema, loginSchema } from '../validators/auth.schema.js';

export const authRoutes: Router = Router();

const limiteLogin = criarLimiteLogin({
  max: env.LOGIN_RATE_LIMIT_MAX,
  janelaMinutos: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES,
});

// Público (com limite de tentativas falhas por IP)
authRoutes.post('/login', limiteLogin, validate({ body: loginSchema }), authController.login);

// Qualquer usuário autenticado, inclusive CLIENTE
authRoutes.get('/me', authenticate, authController.me);
authRoutes.patch('/senha', authenticate, validate({ body: alterarSenhaSchema }), authController.alterarSenha);
