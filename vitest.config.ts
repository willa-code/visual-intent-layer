import { defineConfig } from 'vitest/config';

// CI gives the suite two cores and the browser-heavy files drive real browsers and a
// real service; run in parallel they starve each other and fail as timing races
// rather than as defects.
const serialiseFiles = process.env['CI'] !== undefined;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: !serialiseFiles,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/generated/**']
    }
  }
});
