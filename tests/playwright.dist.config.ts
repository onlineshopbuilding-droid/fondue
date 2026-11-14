import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

// Runs the browser tests against the built app (dist, served by `vite preview`) instead of the dev server.
// Usage: npm run build && npx playwright test --config tests/playwright.dist.config.ts
const port = process.env.TEST_PORT ?? '5198';

export default defineConfig({
  ...base,
  testDir: './e2e',
  use: { ...base.use, baseURL: `http://localhost:${port}` },
  webServer: {
    cwd: '..',
    command: `npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
