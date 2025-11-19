import { defineConfig } from '@playwright/test';

// Configuração básica para rodar e2e com o dev server Vite + backend.
// Usa webServer para iniciar "bun run dev" antes dos testes.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'bun run dev:test',
    url: 'http://localhost:5173',
    timeout: 60_000,
    reuseExistingServer: true
  },
});
