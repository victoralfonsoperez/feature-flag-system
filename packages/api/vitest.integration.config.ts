import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ['**/*.integration.test.ts'],
    exclude: [...configDefaults.exclude],
    setupFiles: ['src/__tests__/setup-integration.ts'],
  },
});
