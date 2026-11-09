import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The audio test renders every sound; on a busy machine that takes more than the default 5 s.
    testTimeout: 30_000,
    include: process.env.BALANCE ? ['tests/balance/**/*.test.ts'] : ['tests/unit/**/*.test.ts'],
  },
});
