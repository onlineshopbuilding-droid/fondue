import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: process.env.BALANCE ? ['tests/balance/**/*.test.ts'] : ['tests/unit/**/*.test.ts'],
  },
});
