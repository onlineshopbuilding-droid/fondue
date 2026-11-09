import { expect, test } from '@playwright/test';
import { gameState, waitFor, waitForGame } from './helpers';

test.use({ hasTouch: true });

test('touch can grab and fling', async ({ page }) => {
  await page.goto('/?seed=21');
  await waitForGame(page);
  await page.tap('button[data-a="play"]');
  await page.tap('button[data-a="solo"]');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await page.evaluate(`window.__fondue.session.sim.s.spawnQueue = []; window.__fondue.session.sim.s.enemies = []; window.__fondue.session.sim.spawnEnemy('grunt', 700)`);
  await page.waitForTimeout(80);
  const e = (await gameState(page))!.enemies[0];
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, x?: number, y?: number) => cdp.send('Input.dispatchTouchEvent', {
    type: type as 'touchStart', touchPoints: x === undefined ? [] : [{ x, y: y! }],
  });
  await touch('touchStart', e.x, e.y - 44);
  await page.waitForTimeout(40);
  await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 2000);
  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', e.x, e.y - 44 - i * 45);
    await page.waitForTimeout(8);
  }
  await touch('touchEnd');
  await waitFor(() => gameState(page), (v) => v!.gold === 10, 6000);
  expect((await gameState(page))!.gold).toBe(10);
});
