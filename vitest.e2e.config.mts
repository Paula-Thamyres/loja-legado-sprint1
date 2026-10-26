import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Testes ponta a ponta: sobem um servidor Vendure de verdade (SQLite em memória via sql.js).
// O SWC entra porque o transpilador padrão do Vitest não emite os metadados de decorators que o NestJS usa.
// Fonte: https://docs.vendure.io/current/core/developer-guide/testing
export default defineConfig({
  test: {
    include: ['test-e2e/**/*.e2e-spec.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    typecheck: { tsconfig: './tsconfig.e2e.json' },
  },
  plugins: [
    swc.vite({
      jsc: { transform: { useDefineForClassFields: false } },
    }),
  ],
});
