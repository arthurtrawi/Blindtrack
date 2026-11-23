// Configuração do Prisma CLI (Prisma 7).
// A URL do banco fica aqui, não no schema.prisma, e o .env é carregado explicitamente.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
