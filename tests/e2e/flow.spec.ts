import { expect, test } from '@playwright/test';
import { drag, gameState, startSolo, waitFor, waitForGame } from './helpers';

const sim = (s: string) => `window.__fondue.session.sim.s.${s}`;

test('menu screens all open and return', async ({ page }) => {
  await page.goto('/');
  await waitForGame(page);
  await expect(page.locator('.version')).toContainText('build');
  for (const [btn, title] of [['scores', 'Scores'], ['options', 'Options'], ['credits', 'Credits']] as const) {
    await page.click(`button[data-a="${btn}"]`);
    await expect(page.locator('.panel h2')).toHaveText(title);
    await page.click('button[data-a="main"]');
  }
  await page.click('button[data-a="help"]');
  const seen = new Set<string>();
  for (let i = 0; i < 8; i++) {
    seen.add(await page.locator('.panel h2').innerText());
    await page.click('button[data-a="helpNext"]');
  }
  expect(seen.size).toBe(8);
});

test('day, results, market, next day', async ({ page }) => {
  await startSolo(page, '?seed=11');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  const startT = await page.evaluate(() => (window as any).__fondue.session.view().dayT);
  expect(startT).toBeLessThan(3);
  await page.evaluate(`${sim('dayT')} = 49.5; ${sim('gold')} = 5000; ${sim('offerings')} = 40; ${sim('enemies')} = []; ${sim('spawnQueue')} = [];`);
  await waitFor(() => gameState(page), (s) => s?.phase === 'victory', 8000);
  await page.waitForSelector('#toShop', { timeout: 10000 });
  await page.screenshot({ path: 'docs/screenshots/results.png' });
  await page.click('#toShop');
  await expect(page.locator('.panel h2')).toHaveText('The Market');
  await expect(page.locator('.tab')).toHaveCount(7);
  await expect(page.locator('.item[data-item="gate0"] .tag')).toHaveText('Equipped');
  await page.click('button[data-buy="gate1"]');
  await expect(page.locator('.item[data-item="gate1"] .tag')).toHaveText('Equipped');
  await page.locator('.tab', { hasText: 'Wheels' }).click();
  await page.click('button[data-buy="wheel1"]');
  await page.screenshot({ path: 'docs/screenshots/market.png' });
  await page.click('#ready');
  await waitFor(() => gameState(page), (s) => s?.day === 2 && s.phase === 'banner', 6000);
  expect((await gameState(page))!.gateMax).toBe(1400);
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');

  // Weapon by key and by clicking its icon.
  const cd = () => page.evaluate(() => (window as any).__fondue.session.view().cooldowns.wheel);
  await page.keyboard.press('1');
  await waitFor(cd, (c) => c > 0, 2000);
  await page.evaluate(`${sim('cooldowns')}.wheel = 0`);
  const pos = await page.evaluate(() => (window as any).__fondue.scene.slotPosition('wheel'));
  await page.mouse.click(pos.x, pos.y);
  await waitFor(cd, (c) => c > 0, 2000);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/wheel.png' });
});

test('defeat ends the run and writes a score', async ({ page }) => {
  await startSolo(page, '?seed=12');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await page.evaluate(`${sim('gateHp')} = 1; window.__fondue.session.sim.spawnEnemy('grunt', 220);`);
  await waitFor(() => gameState(page), (s) => s?.phase === 'defeat', 8000);
  await page.screenshot({ path: 'docs/screenshots/defeat.png' });
  await page.waitForSelector('#restart', { timeout: 10000 });
  await page.screenshot({ path: 'docs/screenshots/gameover.png' });
  await page.click('button[data-a="scores2"]');
  await expect(page.locator('table.scores tbody tr')).toHaveCount(1);
  await expect(page.locator('table.scores tbody')).toContainText('Player');
});

test('tuning panel changes values, exports and imports', async ({ page }) => {
  await startSolo(page, '?seed=13');
  await page.keyboard.press('F1');
  await expect(page.locator('#tuning')).toBeVisible();
  await expect(page.locator('#tuning input[type=range]')).toHaveCount(12);
  await page.locator('#tuning input[data-key="gravity"]').fill('2000');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.gravity)).toBe(2000);
  await page.click('#tuning button[data-act="export"]');
  const json = await page.locator('#tuning textarea').inputValue();
  expect(JSON.parse(json).gravity).toBe(2000);
  await page.click('#tuning button[data-preset="Arcade"]');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.knockOthers)).toBe(true);
  await page.locator('#tuning textarea').fill(JSON.stringify({ gravity: 3100 }));
  await page.click('#tuning button[data-act="import"]');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.gravity)).toBe(3100);
  await page.reload();
  await waitForGame(page);
  await page.click('button[data-a="play"]');
  await page.click('button[data-a="solo"]');
  await waitFor(() => gameState(page), (s) => s !== null);
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.gravity)).toBe(3100);
});

test('debug overlay and pause', async ({ page }) => {
  await startSolo(page, '?seed=14');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await page.keyboard.press('F3');
  await expect(page.locator('#debug')).toContainText('FPS');
  await page.keyboard.press('p');
  await expect(page.locator('.panel h2')).toHaveText('Paused');
  await page.click('button[data-a="resume"]');
  await expect(page.locator('.panel')).toHaveCount(0);
  await page.keyboard.press('p');
  await expect(page.locator('.panel h2')).toHaveText('Paused');
  await page.keyboard.press('p');
  await expect(page.locator('.panel')).toHaveCount(0);
});

test('right click cancels a weapon and never grabs', async ({ page }) => {
  await startSolo(page, '?seed=16');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await page.evaluate(`window.__fondue.session.sim.s.meta.owned.push('stomper1'); window.__fondue.session.sim.s.spawnQueue = []; window.__fondue.session.sim.s.enemies = []; window.__fondue.session.sim.spawnEnemy('grunt', 700);`);
  await page.waitForTimeout(100);
  await page.keyboard.press('2');
  await waitFor(() => gameState(page), (s) => s!.hands[0].mode === 'stomper', 2000);
  await page.mouse.click(640, 400, { button: 'right' });
  await waitFor(() => gameState(page), (s) => s!.hands[0].mode === 'none', 2000);
  expect(await page.evaluate(() => (window as any).__fondue.session.view().cooldowns.stomper)).toBe(0);
  const e = (await gameState(page))!.enemies[0];
  await page.mouse.move(e.x, e.y - 40);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(80);
  expect((await gameState(page))!.enemies[0].st).not.toBe('held');
  await page.mouse.up({ button: 'right' });
});

test('from game over, scores returns to the game over screen', async ({ page }) => {
  await startSolo(page, '?seed=17');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await page.evaluate(`${sim('gateHp')} = 1; window.__fondue.session.sim.spawnEnemy('grunt', 220);`);
  await page.waitForSelector('#restart', { timeout: 15000 });
  await page.click('button[data-a="scores2"]');
  await page.click('button[data-a="backGameOver"]');
  await expect(page.locator('#restart')).toBeVisible();
});

test('a realistic flick kills, a slow drop does not', async ({ page }) => {
  await startSolo(page, '?seed=15');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await page.evaluate(`window.__fondue.session.sim.s.spawnQueue = []; window.__fondue.session.sim.s.enemies = []; window.__fondue.session.sim.spawnEnemy('grunt', 760); window.__fondue.session.sim.spawnEnemy('grunt', 900)`);
  await page.waitForTimeout(100);
  const s = (await gameState(page))!;
  const [a, b] = s.enemies;
  // Slow, short drop: from just above the ground with no flick.
  await page.mouse.move(a.x, a.y - 40);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(700);
  expect((await gameState(page))!.gold).toBe(0);
  const live = (await gameState(page))!.enemies.find((e: any) => e.id === b.id)!;
  await drag(page, [live.x, live.y - 44], [live.x - 40, 90], 9, 8);
  await waitFor(() => gameState(page), (v) => v!.gold === 10, 6000);
});
