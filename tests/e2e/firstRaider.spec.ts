import { expect, test } from '@playwright/test';
import { DEVICES, openGame, waitFor } from './helpers';

/**
 * B3: after a level starts, the first raider is on screen within 2 seconds of game time (target 1.5),
 * on every device format. Game time is counted in simulation ticks (1/60 s) from the start of the run,
 * so slow software rendering on test machines does not distort the number.
 */

const LIMIT = 2.0;

/** Seconds of game time from the run start until a raider stands inside the visible part of the field. */
async function firstVisible(page: import('@playwright/test').Page): Promise<number> {
  const t = await waitFor(() => page.evaluate(() => {
    const a = (window as any).__fondue;
    const sim = a.session?.sim;
    if (!sim) return null;
    const cam = a.scene.cam as { x: number; w: number };
    const right = cam.x + cam.w;
    const seen = sim.s.enemies.some((e: { x: number; type: string }) => e.x - 20 < right);
    return seen ? sim.s.tick / 60 : sim.s.tick > 60 * 15 ? 99 : null;
  }), (v) => v !== null, 60_000, 20);
  return t as number;
}

const results: string[] = [];

for (const device of DEVICES) {
  test(`first raider visible quickly on ${device.name}`, async ({ browser }) => {
    const { page, context } = await openGame(browser, device);
    // Every campaign level up to 11 is open, and endless with it.
    await page.evaluate(() => {
      const a = (window as any).__fondue;
      a.profile.edit((d: any) => {
        d.seen.tutorial = true;
        a.profile.world('fondue');
        d.worlds.fondue.levelsDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      });
    });
    const times: Record<string, number> = {};
    for (const level of [1, 2, 3, 4, 5]) {
      await page.evaluate((l) => (window as any).__fondue.startCampaign(l), level);
      times[`level ${level}`] = await firstVisible(page);
      await page.evaluate(() => (window as any).__fondue.leaveToMenu());
    }
    await page.evaluate(() => (window as any).__fondue.startEndless());
    times.endless = await firstVisible(page);
    results.push(`${device.name}: ${Object.entries(times).map(([k, v]) => `${k} ${v.toFixed(2)} s`).join(', ')}`);
    console.log(results[results.length - 1]);
    for (const [k, v] of Object.entries(times)) expect(v, `${device.name} ${k}`).toBeLessThanOrEqual(LIMIT);
    await context.close();
  });
}
