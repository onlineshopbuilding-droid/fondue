import { expect, test } from '@playwright/test';
import { gameState, startSolo, waitFor } from './helpers';

test('every landscape and time of day renders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startSolo(page, '?seed=51');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  const cases: [number, number, string][] = [[1, 40, 'night-meadow'], [4, 30, 'dusk-canyon'], [7, 8, 'day-marsh'], [10, 46, 'night-snowpine']];
  for (const [day, t, name] of cases) {
    await page.evaluate(([d, dt]) => {
      const sim = (window as any).__fondue.session.sim;
      sim.s.day = d; sim.s.dayT = dt; sim.s.spawnQueue = [];
      sim.s.enemies = [];
      for (let i = 0; i < 6; i++) sim.spawnEnemy('grunt', 500 + i * 110);
      sim.s.paused = false;
    }, [day, t]);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `docs/screenshots/land-${name}.png` });
  }
  expect(errors).toEqual([]);
});
