import { expect, test, type Page } from '@playwright/test';
import { DEVICES, GAME_WAIT, collectErrors, station, waitFor, waitForGame } from '../e2e/helpers';

/**
 * Etappe 5, independent check of B3 in co-op on every device format: host and guest both use the format of
 * the device. Same measurement as tests/e2e/coopStart.spec.ts (host game time until the first raider is inside
 * the guest's visible field), but on iPhone 16, OnePlus 8T and laptop, for the campaign and for endless.
 */
const LIMIT = 2.0;
const BASE = '/?menu=1&fresh=1&net=loopback';

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

for (const d of DEVICES) {
  for (const plan of ['campaign', 'endless'] as const) {
    test(`check B3 co-op ${plan} on ${d.name}`, async ({ browser }) => {
      test.setTimeout(240_000);
      const context = await browser.newContext({ viewport: { width: d.width, height: d.height }, hasTouch: d.touch, isMobile: d.touch, deviceScaleFactor: 1 });
      const host = await context.newPage();
      const guest = await context.newPage();
      const errors = [...collectErrors(host), ...collectErrors(guest)];
      await host.goto(BASE);
      await waitForGame(host);
      if (plan === 'endless') await openEndless(host);
      await station(host, 'coop');
      await host.fill('#name', 'Tim');
      await host.click('button[data-a="openRoom"]');
      await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
      await host.click(plan === 'campaign' ? '#planCampaign' : '#planEndless');
      const code = await host.locator('#roomCode').innerText();
      await guest.goto(`${BASE}&join=${code}`);
      await waitForGame(guest);
      await guest.fill('#name', 'Lenny');
      await guest.click('#doJoin');
      await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 10000 });
      await host.click('#startCoop');
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
      console.log(`B3 COOP ${plan} ${d.name}: ${seconds!.toFixed(2)} s`);
      expect(seconds!).toBeLessThanOrEqual(LIMIT);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}
