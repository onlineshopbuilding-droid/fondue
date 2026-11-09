import { defineConfig } from '@playwright/test';

/** Headed run with the real GPU, for frame-rate measurements. */
export default defineConfig({
  testDir: 'tests/perf',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5199', viewport: { width: 1280, height: 720 }, channel: 'msedge' },
  webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199', reuseExistingServer: true, timeout: 60_000 },
});
