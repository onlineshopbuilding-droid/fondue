import { expect, test } from '@playwright/test';
import { LAND_NAMES } from '../../src/art/registry';
import { startEndless, waitForGame } from './helpers';

test('every landscape renders at day, dusk and night', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?menu=1&seed=51');
  // This test looks at all landscapes, so it waits until the background has made them all.
  await waitForGame(page, { allArt: true });
  await startEndless(page);
  const times: [string, number, boolean][] = [['day', 0.2, false], ['dusk', 0.75, false], ['night', 0.95, true]];
  for (const land of LAND_NAMES) {
    for (const [name, share, night] of times) {
      await page.evaluate(([l, k, n]) => {
        const sim = (window as any).__fondue.session.sim;
        // The sky follows the waves: in endless one cycle of eight waves runs from day to night.
        sim.freezeWaves();
        sim.s.wave = Math.floor((k as number) * 8) + 1;
        sim.s.meta.wave = { ...sim.s.meta.wave, landscape: l, night: n };
        sim.s.spawnQueue = [];
        sim.s.enemies = [];
        for (let i = 0; i < 6; i++) sim.spawnEnemy('grunt', 500 + i * 110);
        sim.s.meta.rev++;
      }, [land, share, night] as const);
      // Two frames are enough to draw the new scenery.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      // Four of them are the pictures in the documents; the rest are only for looking at.
      const shot = `land-${name}-${land}`;
      const inDocs = ['land-night-meadow', 'land-dusk-canyon', 'land-day-marsh', 'land-night-snowpine'].includes(shot);
      await page.screenshot({ path: `${inDocs ? 'docs/screenshots' : 'mobile-screenshots'}/${shot}.png` });
    }
  }
  expect(errors).toEqual([]);
});
