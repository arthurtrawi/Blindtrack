/**
 * Carrega e valida as variáveis de ambiente com Zod.
 * Se faltar algo ou houver valor inválido, a aplicação não sobe e mostra o problema
 * ("fail fast"), em vez de falhar mais tarde em produção.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter((origem) => origem.length > 0),
    ),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN deve ter o formato <número><s|m|h|d>, ex.: 8h')
    .default('8h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().positive().max(50).default(10),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  TEST_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
});

export type Env = z.infer<typeof envSchema>;

function carregarEnv(): Env {
  const resultado = envSchema.safeParse(process.env);

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // O logger depende do env; por isso aqui usamos console.
    console.error(`Variáveis de ambiente inválidas:\n${problemas}`);
    process.exit(1);
  }

  const dados = resultado.data;

  // Nos testes, a aplicação aponta para o banco de testes, nunca para o de desenvolvimento.
  if (dados.NODE_ENV === 'test') {
    if (!dados.TEST_DATABASE_URL) {
      console.error('TEST_DATABASE_URL é obrigatória quando NODE_ENV=test');
      process.exit(1);
    }
    dados.DATABASE_URL = dados.TEST_DATABASE_URL;
  }

  return dados;
}

export const env: Env = carregarEnv();
