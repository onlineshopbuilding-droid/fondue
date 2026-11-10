import { expect, test, type Browser, type Page } from '@playwright/test';
import { gameState, waitFor, waitForGame } from './helpers';

/**
 * Every release has to work on phones. Sizes are the extremes of what is on the market: if the
 * smallest, the widest and the squarest screen work, the ones in between do too.
 * Screenshots land in mobile-screenshots/ for looking at.
 */
const ALL_DEVICES = [
  { name: 'small-android', width: 640, height: 360 },
  { name: 'small-with-browser-bars', width: 640, height: 320 },
  { name: 'iphone-se', width: 667, height: 375 },
  { name: 'iphone-16', width: 852, height: 393 },
  { name: 'iphone-16-safari', width: 852, height: 340 },
  { name: 'iphone-pro-max', width: 932, height: 430 },
  { name: 'wide-android', width: 960, height: 400 },
  { name: 'ipad', width: 1024, height: 768 },
];

/** The screens checked on every change: iPhone 16 and a current Android. The rest run with ALL_SCREENS=1. */
const EVERYDAY = ['iphone-16', 'wide-android'];
const DEVICES = process.env.ALL_SCREENS ? ALL_DEVICES : ALL_DEVICES.filter((d) => EVERYDAY.includes(d.name));
const GRAB_DEVICES = process.env.ALL_SCREENS ? [ALL_DEVICES[0], ALL_DEVICES[3], ALL_DEVICES[7]] : DEVICES;

const MIN_TOUCH_PX = 44;

async function phone(browser: Browser, width: number, height: number, url = '/?seed=7&net=loopback') {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await waitForGame(page);
  return { context, page, errors };
}

const fit = (page: Page) => page.evaluate((minTouch) => {
  const overlay = document.querySelector('.overlay') as HTMLElement | null;
  const panel = document.querySelector('.overlay .panel') as HTMLElement | null;
  const r = panel?.getBoundingClientRect();
  const small = [...document.querySelectorAll('.overlay button, .overlay .tab, .overlay select, .overlay input[type="text"]')]
    .map((b) => ({ text: (b as HTMLElement).innerText || (b as HTMLElement).id, r: b.getBoundingClientRect() }))
    .filter((b) => b.r.width > 0 && (b.r.height < minTouch - 0.5 || b.r.width < minTouch - 0.5))
    .map((b) => `${b.text} ${Math.round(b.r.width)}x${Math.round(b.r.height)}`);
  return {
    pageOverflowX: document.documentElement.scrollWidth - innerWidth,
    inside: !!r && r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
    overlayScroll: overlay ? overlay.scrollHeight - overlay.clientHeight : 0,
    panelScroll: panel ? panel.scrollHeight - panel.clientHeight : 0,
    small,
  };
}, MIN_TOUCH_PX);

async function check(page: Page, device: string, screen: string, mustFitWithoutScrolling: boolean) {
  await page.waitForTimeout(240);
  await page.screenshot({ path: `mobile-screenshots/${device}-${screen}.png` });
  const f = await fit(page);
  const where = `${device} ${screen}: ${JSON.stringify(f)}`;
  expect(f.pageOverflowX, where).toBeLessThanOrEqual(0);
  expect(f.inside, where).toBe(true);
  expect(f.overlayScroll, where).toBeLessThanOrEqual(1);
  expect(f.small, where).toEqual([]);
  if (mustFitWithoutScrolling) expect(f.panelScroll, where).toBeLessThanOrEqual(1);
}

const cssOfWorld = (page: Page, x: number, y: number) => page.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [x, y]);
const cssOfScreen = (page: Page, x: number, y: number) => page.evaluate(([a, b]) => (window as any).__fondue.scene.screenToCss(a, b), [x, y]);

async function tapHudSlot(page: Page, slot: string) {
  const p = await page.evaluate((s) => (window as any).__fondue.scene.slotPosition(s), slot);
  const c = await cssOfScreen(page, p.x, p.y);
  await page.touchscreen.tap(c.x, c.y);
}

for (const d of DEVICES) {
  test(`${d.name}: every screen fits and is usable by touch`, async ({ browser }) => {
    const { context, page, errors } = await phone(browser, d.width, d.height);
    const open = async (button: string) => { await page.click(`button[data-a="${button}"]`); };

    await check(page, d.name, 'menu', true);
    for (const s of ['options', 'help', 'scores', 'credits']) {
      await open(s);
      await check(page, d.name, s, s === 'options' || s === 'help');
      await open('main');
    }
    await open('play');
    await check(page, d.name, 'play', true);
    await open('gotoJoin');
    await check(page, d.name, 'join', true);
    await open('quit');
    await open('play');
    await open('openRoom');
    await expect(page.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
    await check(page, d.name, 'host', false);
    await open('quit');

    await open('play');
    await open('solo');
    await page.waitForSelector('.toast.tip');
    await waitFor(() => gameState(page), (s) => s?.phase === 'battle', 20000);

    // The picture fills the screen and the tips leave the battlefield free.
    const layout = await page.evaluate(() => {
      const c = document.querySelector('canvas')!.getBoundingClientRect();
      const toasts = [...document.querySelectorAll('.toast')].map((t) => t.getBoundingClientRect());
      const scene = (window as any).__fondue.scene;
      return {
        canvas: [c.left, c.top, c.right, c.bottom], win: [innerWidth, innerHeight],
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

    await page.evaluate(() => {
      const sim = (window as any).__fondue.session.sim;
      sim.s.meta.owned.push('wheel1', 'stomper1', 'comet1', 'mortar', 'bolter1');
      sim.s.meta.hornEquipped = 'mortar';
      sim.s.meta.rev++;
      sim.s.dayT = 3;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `mobile-screenshots/${d.name}-battle.png` });

    // A weapon works by tapping its icon.
    await tapHudSlot(page, 'wheel');
    await waitFor(() => page.evaluate(() => (window as any).__fondue.session.sim.s.cooldowns.wheel > 0), (b) => b, 3000);

    // The pause button works by touch.
    const pause = await page.evaluate(() => (window as any).__fondue.scene.pauseCss());
    await page.touchscreen.tap(pause.x, pause.y);
    await page.waitForSelector('button[data-a="resume"]');
    await check(page, d.name, 'pause', true);
    await open('resume');
    await page.waitForSelector('.overlay', { state: 'detached' });

    await page.evaluate(() => { const s = (window as any).__fondue.session.sim.s; s.gold = 60000; s.offerings = 300; s.enemies = []; s.spawnQueue = []; s.dayT = 49.9; });
    await waitFor(() => gameState(page), (s) => s?.phase === 'intermission', 15000);
    await page.waitForSelector('#toShop');
    await check(page, d.name, 'results', true);
    await page.click('#toShop');
    await check(page, d.name, 'shop', false);
    const shop = await page.evaluate(() => {
      const ready = document.querySelector('#ready')!.getBoundingClientRect();
      const items = document.querySelector('.items')!.getBoundingClientRect();
      const tabs = document.querySelector('.tabs') as HTMLElement;
      return { readyBottom: ready.bottom, readyTop: ready.top, itemsHeight: items.height, tabRows: new Set([...tabs.children].map((t) => Math.round(t.getBoundingClientRect().top))).size };
    });
    expect(shop.readyBottom, `${d.name} ${JSON.stringify(shop)}`).toBeLessThanOrEqual(d.height);
    expect(shop.itemsHeight, `${d.name} ${JSON.stringify(shop)}`).toBeGreaterThanOrEqual(80);

    // Buying keeps the player's place in a scrolled list.
    await page.locator('.tab', { hasText: 'Wheels' }).click();
    await page.evaluate(() => { document.querySelector('.items')!.scrollTop = 40; });
    const before = await page.evaluate(() => document.querySelector('.items')!.scrollTop);
    // Late kills can still pay out, so only a rise matters here: it is what redraws the market.
    const goldBefore = await page.evaluate(() => { const s = (window as any).__fondue.session.sim.s; s.gold += 1; return s.gold - 1; });
    await waitFor(() => page.evaluate(() => Number((document.querySelector('#gold') as HTMLElement).innerText)), (g) => g > goldBefore, 3000);
    expect(await page.evaluate(() => document.querySelector('.items')!.scrollTop)).toBe(before);
    await page.screenshot({ path: `mobile-screenshots/${d.name}-shop-wheels.png` });

    await page.click('#ready');
    await waitFor(() => gameState(page), (s) => s?.day === 2, 8000);
    await page.evaluate(() => { (window as any).__fondue.session.sim.s.gateHp = 0; });
    // The fall of the gate plays in game time, which runs slower than the clock on GitHub's machines.
    await page.waitForSelector('button[data-a="restart"]', { timeout: process.env.CI ? 45000 : 15000 });
    await check(page, d.name, 'gameover', false);

    expect(errors).toEqual([]);
    await context.close();
  });
}

for (const d of GRAB_DEVICES) {
  test(`${d.name}: a finger can grab and fling, with the picture filling the screen`, async ({ browser }) => {
    const { context, page } = await phone(browser, d.width, d.height, '/?seed=21');
    await page.tap('button[data-a="play"]');
    await page.tap('button[data-a="solo"]');
    await waitFor(() => gameState(page), (s) => s?.phase === 'battle', 20000);
    await page.evaluate(`window.__fondue.session.sim.s.spawnQueue = []; window.__fondue.session.sim.s.enemies = []; window.__fondue.session.sim.spawnEnemy('grunt', 700)`);
    await page.waitForTimeout(80);
    const e = (await gameState(page))!.enemies[0];
    const cdp = await context.newCDPSession(page);
    const start = await cssOfWorld(page, e.x, e.y - 44);
    const touch = (type: string, x?: number, y?: number) => cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: x === undefined ? [] : [{ x, y: y! }] });
    await touch('touchStart', start.x, start.y);
    await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 2000);
    const unit = await page.evaluate(() => (window as any).__fondue.scene.view.cssPerUnit);
    for (let i = 1; i <= 10; i++) {
      await touch('touchMove', start.x, Math.max(2, start.y - i * 45 * unit));
      await page.waitForTimeout(8);
    }
    await touch('touchEnd');
    await waitFor(() => gameState(page), (v) => v!.gold >= 10, 6000);
    await context.close();
  });
}

test('upright phones are asked to rotate, desktops are not', async ({ browser }) => {
  const { context, page } = await phone(browser, 393, 852);
  await page.screenshot({ path: 'mobile-screenshots/portrait-menu.png' });
  await expect(page.locator('#rotate')).toBeVisible();
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 500, height: 800 } });
  const p2 = await desktop.newPage();
  await p2.goto('/?seed=7');
  await waitForGame(p2);
  await expect(p2.locator('#rotate')).toBeHidden();
  await desktop.close();
});

test('turning the phone mid-fight pauses a solo game and the layout follows', async ({ browser }) => {
  const { context, page } = await phone(browser, 852, 393, '/?seed=7');
  await page.click('button[data-a="play"]');
  await page.click('button[data-a="solo"]');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle', 20000);
  const wide = await page.evaluate(() => (window as any).__fondue.scene.view.width);
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.locator('#rotate')).toBeVisible();
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session.view().paused), (b) => b === true, 3000);
  await page.setViewportSize({ width: 667, height: 375 });
  await expect(page.locator('#rotate')).toBeHidden();
  await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.view.width), (w) => w < wide, 3000);
  await page.waitForSelector('button[data-a="resume"]');
  await context.close();
});
