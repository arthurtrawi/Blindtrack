/**
 * Criação e configuração da aplicação Express.
 * Não chama `listen`: assim os testes (Supertest) usam o app sem abrir porta.
 *
 * Ordem dos middlewares globais:
 *   logger/requestId → helmet → cors → parsers → rotas → 404 → errorHandler
 */
import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiDocument } from './config/swagger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { requestLogger } from './middlewares/request-logger.js';
import { v1Routes } from './routes/index.js';

const corsOptions: CorsOptions = {
  origin(origem, callback) {
    // Requisições sem Origin (curl, Postman, server-to-server) não estão sujeitas a CORS.
    if (!origem || env.CORS_ORIGINS.includes(origem)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
};

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Atrás de proxy reverso (nginx etc.), permite que req.ip use X-Forwarded-For (rate limit).
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Swagger UI precisa de scripts inline; a CSP é relaxada apenas nesta rota.
  app.use(
    '/api/v1/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'BlindTrack API' }),
  );

  app.use('/api/v1', v1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
