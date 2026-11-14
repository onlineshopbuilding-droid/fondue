import { expect, test, type Page } from '@playwright/test';
import { CI, GAME_WAIT, collectErrors, station, waitFor, waitForGame } from './helpers';

/**
 * B3 in co-op: after the host starts the run, the first raider is on the guest's screen within
 * 2 seconds of game time. Game time is the host's simulation (ticks of 1/60 s), counted from the start
 * of the run, so slow software rendering does not distort the number. The guest's picture runs a little
 * behind the host, and that delay counts too.
 */

test.describe.configure({ timeout: CI ? 600_000 : 240_000 });

const LIMIT = 2.0;
const BASE = '/?menu=1&fresh=1&net=loopback';

/** Endless opens after the eleventh campaign level: this profile has won all of them. */
async function openEndless(page: Page) {
  await page.evaluate(() => {
    const a = (window as any).__fondue;
    a.profile.edit((d: any) => {
      d.seen.tutorial = true;
      a.profile.world(a.world);
      d.worlds[a.world].levelsDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    });
  });
}

for (const plan of ['campaign', 'endless'] as const) {
  test(`co-op ${plan}: the first raider is on the guest's screen within ${LIMIT} s`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const host = await context.newPage();
    const guest = await context.newPage();
    const hostErrors = collectErrors(host);
    const guestErrors = collectErrors(guest);
    await host.goto(BASE);
    await waitForGame(host);
    if (plan === 'endless') await openEndless(host);
    await station(host, 'coop');
    await host.fill('#name', 'Tim');
    await host.click('button[data-a="openRoom"]');
    await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
    if (plan === 'campaign') await host.click('#planCampaign');
    else await host.click('#planEndless');
    const code = await host.locator('#roomCode').innerText();
    await guest.goto(`${BASE}&join=${code}`);
    await waitForGame(guest);
    await guest.fill('#name', 'Lenny');
    await guest.click('#doJoin');
    await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 10000 });
    await host.click('#startCoop');

    // Polls the guest's own picture; at the first raider inside the guest's camera, reads the host's game clock.
    const seconds = await waitFor(async () => {
      const seen = await guest.evaluate(() => {
        const a = (window as any).__fondue;
        const v = a.session?.view();
        if (!v || a.session.role !== 'guest') return false;
        const cam = a.scene.cam as { x: number; w: number };
        return v.enemies.some((e: { x: number }) => e.x - 20 < cam.x + cam.w);
      });
      const t = await host.evaluate(() => {
        const sim = (window as any).__fondue.session?.sim;
        return sim ? (sim.s.tick as number) / 60 : null;
      });
      if (t === null) return null;
      if (seen) return t;
      return t > 15 ? 99 : null;
    }, (v) => v !== null, GAME_WAIT * 3, 15);
    const mode = await host.evaluate(() => (window as any).__fondue.session.meta().rules.mode as string);
    expect(mode).toBe(plan);
    console.log(`co-op ${plan}: first raider on the guest's screen after ${seconds!.toFixed(2)} s of host game time`);
    expect(seconds!).toBeLessThanOrEqual(LIMIT);
    expect([...hostErrors, ...guestErrors]).toEqual([]);
    await context.close();
  });
}
