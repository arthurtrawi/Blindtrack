import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/setup/global-setup.ts'],
    include: ['tests/**/*.test.ts'],
    // NODE_ENV=test faz o env.ts apontar para TEST_DATABASE_URL (nunca para o banco de desenvolvimento).
    env: { NODE_ENV: 'test' },
    // Testes de integração compartilham o mesmo banco; arquivos rodam em sequência.
    fileParallelism: false,
    // Testes de integração usam PostgreSQL real e bcrypt. Em VMs com pouca CPU/RAM, os
    // limites padrão (5 s por teste, 10 s por hook) medem a máquina, não o código.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/server.ts', 'src/types/**'],
    },
  },
});
