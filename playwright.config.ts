import { defineConfig } from '@playwright/test';

// Parallel sessions on one machine must not share a server: set TEST_PORT to a free port.
const port = process.env.TEST_PORT ?? '5199';

export default defineConfig({
  testDir: 'tests/e2e',
  // GitHub's machines render the game in software several times slower than the laptop.
  timeout: process.env.CI ? 420_000 : 180_000,
  // With one worker nothing runs at once; this makes --shard split by test instead of by whole file.
  fullyParallel: true,
  workers: 1,
  reporter: [['list']],
  // An expectation waits for the page to show something; on GitHub's machines a single frame can take seconds.
  expect: { timeout: process.env.CI ? 30_000 : 5_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 720 },
    // A click or tap that cannot happen fails with its reason instead of waiting for the whole test.
    actionTimeout: process.env.CI ? 45_000 : 15_000,
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
