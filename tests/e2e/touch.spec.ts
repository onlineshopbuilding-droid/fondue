import { expect, test } from '@playwright/test';
import { clearField, gameState, pointer, spawn, startEndless, waitFor, waitForGame } from './helpers';

// A laptop with a touch screen: the same window takes mouse and finger.
test.use({ hasTouch: true });

test('a touch screen laptop: a finger grabs and flings, the mouse still works too', async ({ page }) => {
  await page.goto('/?menu=1&seed=21');
  await waitForGame(page);
  await startEndless(page);
  await clearField(page);
  await spawn(page, 'grunt', 700);
  const e = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
  const finger = await pointer(page, true);
  await finger.down(e.x, e.y - 44);
  await waitFor(() => gameState(page), (v) => v!.enemies[0].st === 'held', 3000);
  await finger.glide(e.x, e.y - 44, e.x, 60, 10, 8);
  await finger.up();
  await waitFor(() => gameState(page), (v) => v!.gold === 10, 8000);
  // On a touch the finger is the hand, so no hand is drawn; the mouse brings it back.
  expect(await page.evaluate(() => (window as any).__fondue.scene.ownHandVisible())).toBe(false);
  await page.mouse.move(640, 300);
  await page.mouse.move(660, 320);
  await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.ownHandVisible() as boolean), (b) => b, 3000);
});
