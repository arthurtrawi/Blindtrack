import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // NODE_ENV=test faz o env.ts apontar para TEST_DATABASE_URL (nunca para o banco de desenvolvimento).
    env: { NODE_ENV: 'test' },
    // Testes de integração compartilham o mesmo banco; arquivos rodam em sequência.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/server.ts', 'src/types/**'],
    },
  },
});
