import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: { provider: 'v8', include: ['src/core/**'] },
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
