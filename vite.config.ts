/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 5173 está em CORS_ORIGINS do backend; strictPort evita subir em outra porta não autorizada.
    port: 5173,
    strictPort: true,
  },
  preview: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    // Testes de tela digitam e clicam como um usuário real (user-event). Em VMs com pouca CPU,
    // o limite padrão de 5 s mede a máquina, não o código; um timeout ainda deixava digitações
    // pendentes "vazarem" para o teste seguinte, causando falhas em cascata.
    testTimeout: 30_000,
    env: { VITE_API_URL: 'http://api.teste/api/v1' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
