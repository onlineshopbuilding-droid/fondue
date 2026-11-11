import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the published site. LIVE_URL picks another copy of it, for example
 * LIVE_URL=https://onlineshopbuilding-droid.github.io/fondue/classic/ (keep the trailing slash).
 */
export default defineConfig({
  testDir: 'tests/live',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.LIVE_URL ?? 'https://onlineshopbuilding-droid.github.io/fondue/',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] } } },
    { name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions: { firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false } } } },
  ],
});
