import { test } from '@playwright/test';
import { closePopups, css, drag, equip, gameState, startSolo, waitFor } from '../e2e/helpers';

test.use({
  headless: false,
  launchOptions: { args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] },
  video: { mode: 'on', size: { width: 1280, height: 720 } },
});

const ALL = ['grunt', 'bomber', 'goatRider', 'pogo', 'hexer', 'slinger', 'siegeCart', 'balloonist', 'shade', 'crowcaller', 'yeti'];

test('gallery of every enemy, then weapons', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=41');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await closePopups(page);
  await page.evaluate((all) => {
    const sim = (window as any).__fondue.session.sim;
    sim.s.spawnQueue = [];
    sim.s.gateHp = 1e9; sim.s.gateMax = 1e9;
    sim.s.meta.tuning.walkSpeed = 0.02;
    all.forEach((t: string, i: number) => { const e = sim.spawnEnemy(t, 260 + i * 92); if (t === 'hexer') e.shieldOn = true; });
  }, ALL);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/gallery.png' });
  // All five slots of the keep filled, one weapon of each kind of slot.
  await equip(page, { 0: 'wheel', 1: 'stomper', 2: 'frost', 3: 'comet', 4: 'bolter' });
  await page.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.s.meta.tuning.walkSpeed = 1;
    sim.s.gateMax = 2800; sim.s.gateHp = 900;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/weapons-owned.png' });
});

test('flick for frame-by-frame review', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=42');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await closePopups(page);
  await page.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.s.spawnQueue = [];
    sim.s.enemies = [];
    sim.spawnEnemy('grunt', 800); sim.spawnEnemy('grunt', 880); sim.spawnEnemy('goatRider', 960);
  });
  await page.waitForTimeout(150);
  for (let i = 0; i < 3; i++) {
    const s = (await gameState(page))!;
    const e = s.enemies[0];
    // The mouse works in CSS pixels of the page; the raider stands in world units.
    const from = await css(page, e.x, e.y - 44);
    const to = await css(page, e.x - 50, 90 + i * 30);
    await drag(page, [from.x, from.y], [to.x, to.y], 9, 8);
    await waitFor(() => gameState(page), (v) => !v!.enemies.some((q: any) => q.id === e.id), 5000);
    await page.waitForTimeout(350);
  }
});
