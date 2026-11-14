import { expect, test, type Page } from '@playwright/test';
import {
  IPHONE, PHONE_DEVICES, breakGate, clearField, collectErrors, gameState, nextWave, openGame, pointer, spawn, startEndless,
  tapStation, unlockEndless, waitFor, waitForGame, waitForLobby, waitGame, waitPhase, waitScreen, GAME_WAIT,
} from './helpers';

/**
 * Every release has to work on phones: iPhone 16 and OnePlus 8T in landscape, by finger
 * (other sizes with ALL_SCREENS=1). Screenshots land in mobile-screenshots/ for looking at.
 */

const MIN_TOUCH_PX = 44;

/** The screen fits the window, nothing scrolls sideways, and every control is big enough for a finger. */
const fit = (page: Page, root: string) => page.evaluate(([minTouch, sel]) => {
  const overlay = document.querySelector('.overlay') as HTMLElement | null;
  const box = document.querySelector(sel) as HTMLElement | null;
  const r = box?.getBoundingClientRect();
  const small = [...document.querySelectorAll('.overlay button, .overlay select, .overlay input[type="text"], .overlay textarea')]
    .filter((b) => !(b as HTMLElement).closest('[hidden]'))
    .map((b) => ({ text: (b as HTMLElement).innerText || (b as HTMLElement).id || (b as HTMLElement).dataset.level || '', r: b.getBoundingClientRect(), station: (b as HTMLElement).classList.contains('cm-st') }))
    .filter((b) => b.r.width > 0 && (b.r.height < (minTouch as number) - 0.5 || b.r.width < (minTouch as number) - 0.5))
    // Map stations far off to the side are scrolled to, not tapped from here.
    .filter((b) => !b.station || (b.r.right > 0 && b.r.left < innerWidth))
    .map((b) => `${b.text} ${Math.round(b.r.width)}x${Math.round(b.r.height)}`);
  return {
    pageOverflowX: document.documentElement.scrollWidth - innerWidth,
    inside: !!r && r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
    overlayScroll: overlay ? overlay.scrollHeight - overlay.clientHeight : 0,
    boxScroll: box ? box.scrollHeight - box.clientHeight : 0,
    small,
  };
}, [MIN_TOUCH_PX, root] as const);

async function check(page: Page, device: string, screen: string, mustFitWithoutScrolling: boolean, root = '.overlay .panel') {
  await page.screenshot({ path: `mobile-screenshots/${device}-${screen}.png` });
  const f = await fit(page, root);
  const where = `${device} ${screen}: ${JSON.stringify(f)}`;
  expect(f.pageOverflowX, where).toBeLessThanOrEqual(0);
  expect(f.inside, where).toBe(true);
  expect(f.overlayScroll, where).toBeLessThanOrEqual(1);
  expect(f.small, where).toEqual([]);
  if (mustFitWithoutScrolling) expect(f.boxScroll, where).toBeLessThanOrEqual(1);
}

const tapCss = (page: Page, at: { x: number; y: number }) => page.touchscreen.tap(at.x, at.y);

for (const d of PHONE_DEVICES) {
  test(`${d.name}: the hall and every menu page fit and work by finger`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1&net=loopback');
    await waitForLobby(page);
    await page.screenshot({ path: `mobile-screenshots/${d.name}-lobby.png` });
    // Every station of the hall is on screen and big enough for a finger.
    for (const s of await page.evaluate(() => (window as any).__fondue.lobby.spots())) {
      expect(s.r * 2, `${s.id} ${JSON.stringify(s)}`).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
      expect(s.x - s.r / 2, s.id).toBeGreaterThanOrEqual(0);
      expect(s.x + s.r / 2, s.id).toBeLessThanOrEqual(d.width);
      expect(s.y, s.id).toBeLessThanOrEqual(d.height);
    }
    // Endless opens after the campaign's first levels; this profile has them, so its page can be checked too.
    await unlockEndless(page);
    const pages: [string, boolean][] = [['options', false], ['help', true], ['scores', false], ['credits', false], ['armoury', false], ['play', true], ['coop', true]];
    for (const [id, noScroll] of pages) {
      await tapStation(page, id, true);
      await waitScreen(page, id === 'play' ? 'play' : id);
      await check(page, d.name, id, noScroll);
      await page.tap('button[data-a="main"]');
      await waitForLobby(page);
    }
    await tapStation(page, 'coop', true);
    await page.tap('button[data-a="gotoJoin"]');
    await check(page, d.name, 'join', true);
    await page.tap('button[data-a="quit"]');
    await waitForLobby(page);
    await tapStation(page, 'coop', true);
    await page.tap('button[data-a="openRoom"]');
    await expect(page.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
    await check(page, d.name, 'host', false);
    await page.tap('button[data-a="quit"]');
    await waitForLobby(page);

    // The campaign map scrolls sideways; its card opens by finger and fits.
    await tapStation(page, 'campaign', true);
    await check(page, d.name, 'campaign', true, '#campaignMap');
    await page.tap('.cm-st[data-level="1"]');
    await expect(page.locator('#levelCard')).toBeVisible();
    await check(page, d.name, 'level-card', true, '#levelCard');
    await page.tap('#closeCard');
    await page.tap('button[data-a="main"]');
    await waitForLobby(page);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${d.name}: a run by finger: the battle fills the screen, pause, the next wave without a screen, game over`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1&seed=7');
    await waitForLobby(page);
    await unlockEndless(page);
    await tapStation(page, 'play', true);
    await page.tap('#startEndless');
    await page.waitForSelector('.toast.tip', { timeout: GAME_WAIT });
    await waitPhase(page, 'battle');

    // The picture fills the screen and the tips leave the battlefield free.
    const layout = await page.evaluate(() => {
      const c = document.querySelector('canvas')!.getBoundingClientRect();
      const toasts = [...document.querySelectorAll('.toast')].map((t) => t.getBoundingClientRect());
      const scene = (window as any).__fondue.scene;
      return {
        canvas: [c.left, c.top, c.right, c.bottom],
        tipBottom: Math.max(0, ...toasts.map((r) => r.bottom)), tipTop: Math.min(9999, ...toasts.map((r) => r.top)),
        hudBottom: scene.hudBottomCss(), slot: scene.slotDiameterCss(), pause: scene.pauseDiameterCss(),
      };
    });
    const where = `${d.name} battle: ${JSON.stringify(layout)}`;
    expect(layout.canvas[0], where).toBeLessThanOrEqual(1);
    expect(layout.canvas[1], where).toBeLessThanOrEqual(1);
    expect(layout.canvas[2], where).toBeGreaterThanOrEqual(d.width - 1);
    expect(layout.canvas[3], where).toBeGreaterThanOrEqual(d.height - 1);
    expect(layout.tipTop, where).toBeGreaterThanOrEqual(layout.hudBottom - 1);
    expect(layout.tipBottom, where).toBeLessThanOrEqual(d.height * 0.62);
    expect(layout.slot, where).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    expect(layout.pause, where).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    await page.screenshot({ path: `mobile-screenshots/${d.name}-battle.png` });

    // A finger grabs and flings.
    await clearField(page);
    await spawn(page, 'grunt', 700);
    const e = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
    const p = await pointer(page, true);
    await p.down(e.x, e.y - 44);
    await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 3000);
    await p.glide(e.x, e.y - 44, e.x, 60, 10, 8);
    await p.up();
    await waitFor(() => gameState(page), (v) => v!.gold >= 10, 8000);

    // The pause button works by touch.
    const pause = await page.evaluate(() => (window as any).__fondue.scene.pauseCss());
    await tapCss(page, pause);
    await page.waitForSelector('button[data-a="resume"]');
    await check(page, d.name, 'pause', true);
    await page.tap('button[data-a="resume"]');
    await page.waitForSelector('.overlay', { state: 'detached' });

    // The HUD shows the gold of the run.
    const gold = (await gameState(page))!.gold;
    await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.hud.gold.text as string), (t) => t === String(gold), 5000);

    // The wave is cleared: the next one follows on the battlefield, with no screen and nothing to buy in between.
    await nextWave(page);
    await waitGame(page, async () => {
      const st = await gameState(page);
      const shown = await page.evaluate(() => ({ overlay: document.querySelectorAll('.overlay').length, buy: document.querySelectorAll('#toShop, #ready, #market, #marketWindow, [data-buy]').length }));
      expect(st!.screen, `${d.name}: no screen between waves`).toBe('none');
      expect(shown, `${d.name}: no window and no market between waves`).toEqual({ overlay: 0, buy: 0 });
      return st;
    }, (st) => !!st && st.wave === 2, 20);
    await breakGate(page);
    // The fall of the gate plays in game time, which runs slower than the clock on GitHub's machines.
    await page.waitForSelector('#restart', { timeout: GAME_WAIT });
    await expect(page.locator('#finalWave')).toHaveText('2');
    await check(page, d.name, 'gameover', false);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('developer menu on a phone: from Options by finger, and it starts a game', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, IPHONE);
  await tapStation(page, 'options', true);
  await page.tap('#devMenuButton');
  await expect(page.locator('#tuning')).toBeVisible();
  await page.tap('#tuning button[data-startwave="10"]');
  await page.tap('#devQuickSolo');
  await waitFor(() => gameState(page), (s) => s?.wave === 10, GAME_WAIT);
  await expect(page.locator('#tuning')).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});

test('plain menu on a phone: a long press on the logo opens the developer menu, a quick tap does not', async ({ browser }) => {
  const { context, page } = await openGame(browser, IPHONE, '?menu=html');
  await page.tap('.logo');
  await page.waitForTimeout(900);
  await expect(page.locator('#tuning')).toHaveCount(0);
  const box = (await page.locator('.logo').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await page.waitForTimeout(900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#tuning')).toBeVisible();
  await context.close();
});

test('upright phones are asked to rotate, desktops are not; turning mid-fight pauses a solo game', async ({ browser }) => {
  const upright = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const p1 = await upright.newPage();
  await p1.goto('/?menu=1');
  await waitForGame(p1);
  await expect(p1.locator('#rotate')).toBeVisible();
  await p1.screenshot({ path: 'mobile-screenshots/portrait-menu.png' });
  await upright.close();

  const desktop = await browser.newContext({ viewport: { width: 500, height: 800 } });
  const p2 = await desktop.newPage();
  await p2.goto('/?menu=1');
  await waitForGame(p2);
  await expect(p2.locator('#rotate')).toBeHidden();
  await desktop.close();

  const { context, page } = await openGame(browser, IPHONE);
  const errors = collectErrors(page);
  await startEndless(page);
  const wide = await page.evaluate(() => (window as any).__fondue.scene.view.width);
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.locator('#rotate')).toBeVisible();
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session.view().paused), (b) => b === true, 5000);
  await page.setViewportSize({ width: 667, height: 375 });
  await expect(page.locator('#rotate')).toBeHidden();
  await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.view.width), (w) => w < wide, 5000);
  await page.waitForSelector('button[data-a="resume"]');
  expect(errors).toEqual([]);
  await context.close();
});
