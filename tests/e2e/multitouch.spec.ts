// Two thumbs at once (C9): on the phone formats a second finger grabs a second raider with the
// second hand of hand tier 7, the page neither zooms nor scrolls, and without a second hand a
// second finger does nothing.
import { expect, test, type Page } from '@playwright/test';
import { ENEMIES } from '../../src/config/enemies';
import { PHONE_DEVICES, clearField, css, gameState, openGame, spawn, startEndless, waitFor } from './helpers';

type Point = { x: number; y: number; id: number };

async function touches(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', pts: Point[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 4, radiusY: 4, force: 1 })) });
  return { send };
}

/** Where to put a finger on a raider (the middle of its body), in CSS pixels. */
async function fingerOn(page: Page, id: number, finger: number): Promise<Point> {
  const s = (await gameState(page))!;
  const e = s.enemies.find((o: any) => o.id === id)!;
  const p = await css(page, e.x, e.y - ENEMIES.grunt.height * 0.5);
  return { x: p.x, y: p.y, id: finger };
}

const pageZoom = (page: Page) => page.evaluate(() => ({
  scale: window.visualViewport?.scale ?? 1,
  scrollX: window.scrollX, scrollY: window.scrollY,
  offX: window.visualViewport?.offsetLeft ?? 0, offY: window.visualViewport?.offsetTop ?? 0,
}));

async function setUp(page: Page, handTier: number) {
  await page.evaluate((t) => { const a = (window as any).__fondue; a.profile.edit((d: any) => { d.keep.handTier = t; }); }, handTier);
  await startEndless(page);
  await clearField(page);
  const a = await spawn(page, 'grunt', 560);
  const b = await spawn(page, 'grunt', 860);
  await waitFor(() => gameState(page), (s) => s!.enemies.length === 2, 3000);
  return { a, b };
}

const heldBy = async (page: Page, id: number) =>
  ((await gameState(page))!.enemies.find((o: any) => o.id === id)?.heldBy ?? []) as number[];

for (const device of PHONE_DEVICES) {
  test.describe(device.name, () => {
    test('two fingers grab two raiders at once with the second hand of tier 7, without zoom or scroll', async ({ browser }) => {
      const { context, page, errors } = await openGame(browser, device);
      const { a, b } = await setUp(page, 7);
      const t = await touches(page);
      const f1 = await fingerOn(page, a, 1);
      const f2 = await fingerOn(page, b, 2);
      await t.send('touchStart', [f1]);
      await t.send('touchStart', [f1, f2]);
      await waitFor(async () => [await heldBy(page, a), await heldBy(page, b)], ([ha, hb]) => ha.length > 0 && hb.length > 0, 3000);
      // First finger: hand 0; second finger: player 0's second hand (1 alone).
      expect(await heldBy(page, a)).toEqual([0]);
      expect(await heldBy(page, b)).toEqual([1]);
      // Pinch both fingers together and apart: a browser would zoom here.
      for (let i = 1; i <= 8; i++) {
        await t.send('touchMove', [{ ...f1, x: f1.x - i * 12, y: f1.y - i * 6 }, { ...f2, x: f2.x + i * 12, y: f2.y - i * 6 }]);
      }
      for (let i = 8; i >= 0; i--) {
        await t.send('touchMove', [{ ...f1, x: f1.x - i * 12, y: f1.y + 10 }, { ...f2, x: f2.x + i * 12, y: f2.y + 10 }]);
      }
      expect(await heldBy(page, a)).toEqual([0]);
      expect(await heldBy(page, b)).toEqual([1]);
      const z = await pageZoom(page);
      expect(z.scale).toBe(1);
      expect([z.scrollX, z.scrollY, z.offX, z.offY]).toEqual([0, 0, 0, 0]);
      await t.send('touchEnd', [f1]);
      await t.send('touchEnd', []);
      await waitFor(async () => [await heldBy(page, a), await heldBy(page, b)], ([ha, hb]) => ha.length === 0 && hb.length === 0, 3000);
      // The viewport forbids pinch zoom, and the canvas takes no browser gestures.
      const meta = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '');
      expect(meta).toContain('user-scalable=no');
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('canvas')!).touchAction)).toBe('none');
      await page.screenshot({ path: `docs/screenshots/v0.3/multitouch-${device.name}.png` });
      expect(errors).toEqual([]);
      await context.close();
    });

    test('without a second hand a second finger does nothing', async ({ browser }) => {
      const { context, page, errors } = await openGame(browser, device);
      const { a, b } = await setUp(page, 1);
      const t = await touches(page);
      const f1 = await fingerOn(page, a, 1);
      const f2 = await fingerOn(page, b, 2);
      await t.send('touchStart', [f1]);
      await t.send('touchStart', [f1, f2]);
      await waitFor(() => heldBy(page, a), (h) => h.length > 0, 3000);
      await page.waitForTimeout(300);
      expect(await heldBy(page, a)).toEqual([0]);
      expect(await heldBy(page, b)).toEqual([]);
      const hands = await page.evaluate(() => (window as any).__fondue.session.sim.s.hands.length as number);
      expect(hands).toBe(1);
      await t.send('touchEnd', [f1]);
      await t.send('touchEnd', []);
      expect((await pageZoom(page)).scale).toBe(1);
      expect(errors).toEqual([]);
      await context.close();
    });
  });
}
