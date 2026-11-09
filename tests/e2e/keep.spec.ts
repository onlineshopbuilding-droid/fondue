import { expect, test, type Browser, type Page } from '@playwright/test';
import { WORLD, perchX } from '../../src/config/world';
import { pointerFor } from '../../src/sim/aim';
import { gameState, waitFor, waitForGame } from './helpers';

/** Everything about the keep, by mouse and by finger, on the shapes of screen that matter. */
const EVERYDAY_SIZES = [
  { name: 'laptop', width: 1280, height: 720, touch: false },
  { name: 'wide-phone', width: 852, height: 393, touch: true },
  { name: 'android', width: 960, height: 400, touch: true },
];
/** Checked on every change: laptop, iPhone 16, Android. The others run with ALL_SCREENS=1. */
const SIZES = process.env.ALL_SCREENS
  ? [...EVERYDAY_SIZES, { name: 'small-phone', width: 640, height: 360, touch: true }, { name: 'tablet', width: 1024, height: 768, touch: true }]
  : EVERYDAY_SIZES;

async function open(browser: Browser, size: (typeof SIZES)[number], query = '?seed=31') {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`/${query}`);
  await waitForGame(page);
  return { context, page, errors };
}

const sim = `window.__fondue.session.sim`;

async function startClear(page: Page, owned: string[] = [], horn = 'null') {
  await page.click('button[data-a="play"]');
  await page.click('button[data-a="solo"]');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle', 20000);
  await page.evaluate(`${sim}.s.spawnQueue = []; ${sim}.s.enemies = []; ${sim}.s.meta.owned.push(...${JSON.stringify(owned)}); ${sim}.s.meta.hornEquipped = ${horn}; ${sim}.s.meta.rev++; ${sim}.setTuning({ ...${sim}.tuning, walkSpeed: 0.02 });`);
  await page.waitForTimeout(100);
}

const css = (page: Page, x: number, y: number) => page.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [x, y]);

/** One finger or the mouse, in world coordinates. */
async function pointer(page: Page, size: (typeof SIZES)[number]) {
  const cdp = size.touch ? await page.context().newCDPSession(page) : null;
  const down = async (x: number, y: number) => {
    const c = await css(page, x, y);
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    else { await page.mouse.move(c.x, c.y); await page.mouse.down(); }
  };
  const move = async (x: number, y: number) => {
    const c = await css(page, x, y);
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x, y: c.y }] });
    else await page.mouse.move(c.x, c.y);
  };
  const up = async () => {
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
  };
  const glide = async (ax: number, ay: number, bx: number, by: number, steps = 10) => {
    for (let i = 1; i <= steps; i++) {
      await move(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps);
      await page.waitForTimeout(12);
    }
  };
  return { down, move, up, glide };
}

const handMode = (page: Page) => page.evaluate(() => (window as any).__fondue.session.view().hands[0].mode as string);
const cooldown = (page: Page, slot: string) => page.evaluate((s) => (window as any).__fondue.session.view().cooldowns[s] as number, slot);

for (const size of SIZES) {
  test(`${size.name}: the keep stands at the left edge and the road fills the rest`, async ({ browser }) => {
    const { context, page, errors } = await open(browser, size);
    await startClear(page, ['gate1', 'bolter1', 'wheel1', 'comet1', 'stomper1', 'mortar', 'cauldron', 'perch'], `'mortar'`);
    const v = await page.evaluate(() => (window as any).__fondue.scene.view);
    expect(v.offsetX).toBe(0);
    expect(v.width).toBeGreaterThanOrEqual(1280);
    const slotCss = await css(page, WORLD.slots.bolter.x, WORLD.slots.bolter.y);
    expect(slotCss.x).toBeGreaterThanOrEqual(0);
    expect(slotCss.y).toBeGreaterThanOrEqual(0);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `mobile-screenshots/keep-${size.name}.png` });
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${size.name}: pull a weapon on the keep to aim it, without grabbing the raider at the gate`, async ({ browser }) => {
    const { context, page, errors } = await open(browser, size);
    await startClear(page, ['bolter1']);
    await page.evaluate(`${sim}.spawnEnemy('grunt', ${WORLD.gateX + 24}); ${sim}.spawnEnemy('grunt', 620);`);
    await page.waitForTimeout(120);
    const p = await pointer(page, size);
    const { x, y } = WORLD.slots.bolter;
    await p.down(x, y);
    await waitFor(() => handMode(page), (m) => m === 'bolter', 2000);
    const fieldW = await page.evaluate(`${sim}.fieldW`) as number;
    const aim = pointerFor('bolter', null, 620, fieldW);
    await p.glide(x, y, aim.x, aim.y);
    const held = await gameState(page);
    expect(held!.enemies.every((e: any) => e.heldBy.length === 0), JSON.stringify(held!.enemies)).toBe(true);
    await page.screenshot({ path: `mobile-screenshots/aim-crossbow-${size.name}.png` });
    await p.up();
    await waitFor(() => cooldown(page, 'bolter'), (c) => c > 0, 3000);
    await waitFor(() => gameState(page), (s) => s!.gold >= 10, 5000);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${size.name}: a raider at the gate can be grabbed right next to the weapons`, async ({ browser }) => {
    const { context, page } = await open(browser, size);
    await startClear(page, ['mortar', 'wheel1'], `'mortar'`);
    await page.evaluate(`${sim}.spawnEnemy('grunt', ${WORLD.gateX + 26})`);
    await page.waitForTimeout(80);
    const e = (await gameState(page))!.enemies[0];
    const p = await pointer(page, size);
    await p.down(e.x + 4, e.y - 44);
    await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 2000);
    expect(await handMode(page)).toBe('none');
    await p.glide(e.x + 4, e.y - 44, e.x + 30, 90);
    await p.up();
    await waitFor(() => gameState(page), (v) => v!.gold >= 10, 6000);
    expect(await cooldown(page, 'horn')).toBe(0);
    await context.close();
  });

  test(`${size.name}: mortar pulled from the keep lands where the aim showed`, async ({ browser }) => {
    const { context, page, errors } = await open(browser, size);
    await startClear(page, ['mortar'], `'mortar'`);
    await page.evaluate(`${sim}.spawnEnemy('grunt', 760)`);
    await page.waitForTimeout(80);
    const fieldW = await page.evaluate(`${sim}.fieldW`) as number;
    const p = await pointer(page, size);
    const { x, y } = WORLD.slots.horn;
    const aim = pointerFor('horn', 'mortar', 700, fieldW);
    await p.down(x, y);
    await p.glide(x, y, aim.x, aim.y);
    await page.screenshot({ path: `mobile-screenshots/aim-mortar-${size.name}.png` });
    await p.up();
    await waitFor(() => cooldown(page, 'horn'), (c) => c > 0, 3000);
    await waitFor(() => gameState(page), (s) => s!.gold >= 10, 6000);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${size.name}: moving back to the weapon cancels the shot`, async ({ browser }) => {
    const { context, page } = await open(browser, size);
    await startClear(page, ['bolter1']);
    const p = await pointer(page, size);
    const { x, y } = WORLD.slots.bolter;
    await p.down(x, y);
    await p.glide(x, y, x + 300, y + 100);
    await p.glide(x + 300, y + 100, x + 4, y + 4);
    await p.up();
    await waitFor(() => handMode(page), (m) => m === 'none', 2000);
    expect(await cooldown(page, 'bolter')).toBe(0);
    await context.close();
  });

  test(`${size.name}: comet and wheel work with taps on the keep`, async ({ browser }) => {
    const { context, page, errors } = await open(browser, size);
    await startClear(page, ['comet1', 'wheel1']);
    await page.evaluate(`${sim}.spawnEnemy('grunt', 760)`);
    const p = await pointer(page, size);
    const c = WORLD.slots.comet;
    await p.down(c.x, c.y);
    await p.up();
    await waitFor(() => handMode(page), (m) => m === 'comet', 2000);
    expect(await cooldown(page, 'comet')).toBe(0);
    await page.screenshot({ path: `mobile-screenshots/armed-comet-${size.name}.png` });
    await p.down(740, 500);
    await p.up();
    await waitFor(() => cooldown(page, 'comet'), (v) => v > 0, 3000);
    await waitFor(() => gameState(page), (s) => s!.gold >= 10, 6000);
    const w = WORLD.slots.wheel;
    await p.down(w.x, w.y);
    await p.up();
    await waitFor(() => cooldown(page, 'wheel'), (v) => v > 0, 3000);
    expect(errors).toEqual([]);
    await context.close();
  });
}

for (const size of [SIZES[0], SIZES[1]]) {
  for (const variant of ['front', 'back'] as const) {
    test(`${size.name}: cauldron ${variant}: a raider melts, the pot is busy, then free`, async ({ browser }) => {
      const { context, page, errors } = await open(browser, size);
      await page.evaluate((v) => {
        const app = (window as any).__fondue;
        app.settings.flags = { ...app.settings.flags, cauldron: v };
      }, variant);
      await startClear(page, ['cauldron']);
      await page.evaluate(`${sim}.spawnEnemy('grunt', 620)`);
      await page.waitForTimeout(100);
      const e = (await gameState(page))!.enemies[0];
      const p = await pointer(page, size);
      await p.down(e.x, e.y - 44);
      await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 2000);
      const target = variant === 'front' ? { x: WORLD.cauldron.x, y: 340 } : { x: WORLD.cauldronBack.x, y: WORLD.cauldronBack.rimY + 40 };
      await p.glide(e.x, e.y - 44, target.x, target.y, 16);
      await page.waitForTimeout(120);
      await p.up();
      const cooking = await waitFor(() => gameState(page), (v) => v!.enemies[0]?.st === 'cooking', 3000, 30);
      expect(cooking!.offerings).toBe(0);
      expect(await page.evaluate(() => (window as any).__fondue.session.view().potBusy)).toBeGreaterThan(0);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `mobile-screenshots/cauldron-${variant}-${size.name}.png` });
      await waitFor(() => gameState(page), (v) => v!.offerings === 1, 4000);
      expect(await page.evaluate(() => (window as any).__fondue.session.view().potBusy)).toBe(0);
      expect(errors).toEqual([]);
      await context.close();
    });
  }

  test(`${size.name}: eagle hook at the top right takes one raider at a time`, async ({ browser }) => {
    const { context, page, errors } = await open(browser, size);
    await startClear(page, ['perch']);
    await page.evaluate(`${sim}.spawnEnemy('grunt', 800)`);
    await page.waitForTimeout(100);
    const fieldW = await page.evaluate(`${sim}.fieldW`) as number;
    const hook = perchX(fieldW);
    const hookCss = await css(page, hook, WORLD.perch.hookY);
    expect(hookCss.x).toBeGreaterThan(size.width * 0.75);
    expect(hookCss.y).toBeGreaterThan(await page.evaluate(() => (window as any).__fondue.scene.hudBottomCss()));
    const e = (await gameState(page))!.enemies[0];
    const p = await pointer(page, size);
    await p.down(e.x, e.y - 44);
    await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 2000);
    await p.glide(e.x, e.y - 44, hook, WORLD.perch.hookY, 16);
    await page.waitForTimeout(120);
    await p.up();
    await waitFor(() => gameState(page), (v) => v!.enemies[0]?.st === 'hooked', 3000, 30);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `mobile-screenshots/hook-hanging-${size.name}.png` });
    // The game clock falls behind real time at the low frame rates of a software renderer.
    // On a slow machine the screenshot above can take longer than the whole meal, so "gone" counts too.
    await waitFor(() => page.evaluate(`(${sim}.s.enemies[0]?.t ?? 0) < 0.5`), (b) => b === true, 15000, 20);
    await page.screenshot({ path: `mobile-screenshots/hook-eagle-${size.name}.png` });
    await waitFor(() => gameState(page), (v) => v!.offerings === 1, 15000);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('developer menu: switches and quick start by mouse; quick runs stay off the scores', async ({ browser }) => {
  const { context, page, errors } = await open(browser, SIZES[0]);
  await page.keyboard.press('F1');
  await expect(page.locator('#developer')).toBeVisible();
  await page.click('#developer button[data-flag="cauldron"][data-value="back"]');
  await page.click('#developer button[data-startday="20"]');
  await page.keyboard.press('F1');
  await page.click('button[data-a="play"]');
  await expect(page.locator('#quickNote')).toContainText('day 20');
  await page.click('button[data-a="solo"]');
  await waitFor(() => gameState(page), (s) => s?.day === 20, 15000);
  const meta = await page.evaluate(() => (window as any).__fondue.session.meta());
  expect(meta.flags.cauldron).toBe('back');
  expect(meta.quickStart).toBe(20);
  expect(meta.owned).toContain('gate2');
  await page.evaluate(`${sim}.s.gateHp = 0`);
  await page.waitForSelector('#restart', { timeout: 15000 });
  await expect(page.locator('.panel')).toContainText('not added to the scores');
  await page.click('button[data-a="scores2"]');
  await expect(page.locator('table.scores tbody')).toContainText('No runs yet');
  expect(errors).toEqual([]);
  await context.close();
});

test('developer menu on a phone: a long press on the logo opens it, and it starts a game', async ({ browser }) => {
  const { context, page, errors } = await open(browser, SIZES[1]);
  const box = (await page.locator('.logo').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await page.waitForTimeout(900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#developer')).toBeVisible();
  await page.tap('#developer button[data-startday="10"]');
  await page.tap('#developer button[data-act="quickSolo"]');
  await waitFor(() => gameState(page), (s) => s?.day === 10, 15000);
  await expect(page.locator('#tuning')).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});

test('a quick tap on the logo does not open the developer menu', async ({ browser }) => {
  const { context, page } = await open(browser, SIZES[1]);
  await page.tap('.logo');
  await page.waitForTimeout(800);
  await expect(page.locator('#tuning')).toHaveCount(0);
  await context.close();
});

test('co-op in one browser: different window shapes share one field and the host switches', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 852, height: 393 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  await guest.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  host.on('pageerror', (e) => errors.push(String(e)));
  guest.on('pageerror', (e) => errors.push(String(e)));
  await host.goto('/?net=loopback&seed=41');
  await waitForGame(host);
  await host.evaluate(() => {
    const app = (window as any).__fondue;
    app.settings.flags = { ...app.settings.flags, cauldron: 'back' };
    app.startDay = 10;
  });
  await host.click('button[data-a="play"]');
  await host.click('button[data-a="openRoom"]');
  await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
  const code = await host.locator('#roomCode').innerText();
  await guest.goto(`/?net=loopback&join=${code}`);
  await waitForGame(guest);
  await guest.fill('#name', 'Lenny');
  await guest.click('button[data-a="doJoin"]');
  await expect(guest.locator('#status')).toContainText('Waiting for the host', { timeout: 10000 });
  await expect(host.locator('#startCoop')).toBeEnabled();
  await host.click('#startCoop');
  await waitFor(() => gameState(guest), (s) => s?.day === 10, 15000);
  await waitFor(() => gameState(host), (s) => s?.phase === 'battle', 15000);

  const hostMeta = await host.evaluate(() => (window as any).__fondue.session.meta());
  const guestMeta = await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta()), (m: any) => m?.flags.cauldron === 'back', 5000);
  expect(hostMeta.fieldW).toBeGreaterThan(1280);
  expect(guestMeta.fieldW).toBe(hostMeta.fieldW);
  expect(guestMeta.quickStart).toBe(10);
  const hv = await host.evaluate(() => (window as any).__fondue.scene.view);
  const gv = await waitFor(() => guest.evaluate(() => (window as any).__fondue.scene.view), (v: any) => v.fieldW === hostMeta.fieldW, 5000);
  expect(hv.fieldW).toBe(gv.fieldW);
  expect(gv.offsetX).toBe(0);
  expect(gv.height).toBeGreaterThan(720);
  await guest.screenshot({ path: 'mobile-screenshots/coop-guest-laptop-of-wide-host.png' });
  await host.screenshot({ path: 'mobile-screenshots/coop-host-wide.png' });

  // The guest aims from the keep.
  await host.evaluate(`${sim}.s.spawnQueue = []; ${sim}.s.enemies = []; ${sim}.s.meta.owned.push('bolter1'); ${sim}.s.cooldowns.bolter = 0; ${sim}.s.meta.rev++; ${sim}.setTuning({ ...${sim}.tuning, walkSpeed: 0.02 }); ${sim}.spawnEnemy('grunt', 600);`);
  await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().owned.includes('bolter1')), (b) => b, 5000);
  const { x, y } = WORLD.slots.bolter;
  const start = await guest.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [x, y]);
  await guest.mouse.move(start.x, start.y);
  await guest.mouse.down();
  await waitFor(() => gameState(host), (s) => s!.hands[1].mode === 'bolter', 4000);
  const aim = pointerFor('bolter', null, 600, hostMeta.fieldW);
  const end = await guest.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [aim.x, aim.y]);
  for (let i = 1; i <= 10; i++) {
    await guest.mouse.move(start.x + ((end.x - start.x) * i) / 10, start.y + ((end.y - start.y) * i) / 10);
    await guest.waitForTimeout(12);
  }
  await guest.waitForTimeout(150);
  await guest.mouse.up();
  await waitFor(() => host.evaluate(() => (window as any).__fondue.session.view().cooldowns.bolter), (c) => c > 0, 4000);
  expect(errors).toEqual([]);
  await context.close();
});
