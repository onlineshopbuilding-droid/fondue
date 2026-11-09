import { expect, test } from '@playwright/test';
import { drag, gameState, waitFor } from './helpers';

test('single player loads, shows the battle and a throw kills', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?seed=7');
  await page.waitForSelector('.overlay .panel', { timeout: 60_000 });
  await page.screenshot({ path: 'docs/screenshots/menu.png' });
  await page.click('button[data-a="play"]');
  await page.click('button[data-a="solo"]');
  await waitFor(() => gameState(page), (s) => s?.phase === 'banner');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/day-start.png' });
  const st = await waitFor(() => gameState(page), (s) => (s?.enemies.filter((e: any) => e.x < 1200).length ?? 0) > 0, 30000);
  const e = st!.enemies.find((q: any) => q.x < 1200)!;
  await drag(page, [e.x - 20, e.y - 44], [e.x - 40, 120], 10, 8);
  await page.waitForTimeout(60);
  await page.screenshot({ path: 'docs/screenshots/throw.png' });
  await waitFor(() => gameState(page), (s) => (s?.gold ?? 0) >= 10, 8000);
  expect(errors).toEqual([]);
  await page.waitForTimeout(9000);
  await page.screenshot({ path: 'docs/screenshots/battle.png' });
});
