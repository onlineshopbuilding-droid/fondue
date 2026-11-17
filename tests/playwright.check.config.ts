import { defineConfig } from '@playwright/test';
import dist from './playwright.dist.config';

// Independent check (Etappe 5): scripted play-through of a fresh profile on the three formats, against the built app.
// Usage: npm run build && TEST_PORT=5197 npx playwright test --config tests/playwright.check.config.ts
export default defineConfig({ ...dist, testDir: './check', timeout: 900_000 });
