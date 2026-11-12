import { expect, test } from '@playwright/test';
import { drag, gameState, station, waitFor, waitForGame, waitPhase } from './helpers';

test('single player loads into the lobby, starts endless and a throw kills', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?menu=1&seed=7');
  await waitForGame(page);
  await station(page, 'play');
  await page.screenshot({ path: 'docs/screenshots/menu.png' });
  await page.click('#startEndless');
  await waitPhase(page, 'banner');
  await page.screenshot({ path: 'docs/screenshots/day-start.png' });
  const st = await waitFor(() => gameState(page), (s) => (s?.enemies.filter((e: any) => e.x < 1100 && e.x > 300 && e.st === 'walk').length ?? 0) > 0, 30000);
  const e = st!.enemies.find((q: any) => q.x < 1100 && q.x > 300 && q.st === 'walk')!;
  const at = await page.evaluate(([x, y]) => (window as any).__fondue.scene.worldToCss(x, y), [e.x - 20, e.y - 44]);
  await drag(page, [at.x, at.y], [at.x - 20, 90], 10, 8);
  await page.screenshot({ path: 'docs/screenshots/throw.png' });
  await waitFor(() => gameState(page), (s) => (s?.gold ?? 0) >= 10, 8000);
  await waitFor(() => gameState(page), (s) => (s?.enemies.length ?? 0) >= 3, 30000);
  await page.screenshot({ path: 'docs/screenshots/battle.png' });
  expect(errors).toEqual([]);
});
