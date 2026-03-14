import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
  },
});
