import { expect, test } from '@playwright/test';
import { fling, gameState, station, unlockEndless, waitForGame, waitForLobby, waitGame, waitPhase } from './helpers';

test('single player loads into the lobby, starts endless and a throw kills', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?menu=1&seed=7');
  await waitForGame(page);
  // Endless opens after the campaign's eleventh level.
  await waitForLobby(page);
  await unlockEndless(page);
  await station(page, 'play');
  await page.screenshot({ path: 'docs/screenshots/menu.png' });
  await page.click('#startEndless');
  await waitPhase(page, 'banner');
  await page.screenshot({ path: 'docs/screenshots/day-start.png' });
  // Limits in game time: where frames are drawn slowly the raiders walk slowly too.
  const st = await waitGame(page, () => gameState(page), (s) => (s?.enemies.filter((e: any) => e.x < 1100 && e.x > 300 && e.st === 'walk').length ?? 0) > 0, 30);
  const e = st!.enemies.find((q: any) => q.x < 1100 && q.x > 300 && q.st === 'walk')!;
  // A grab on the body and a quick flick up; the events carry their own time stamps, so the flick
  // is as quick on a slow machine as on a fast one.
  await fling(page, false, e);
  await page.screenshot({ path: 'docs/screenshots/throw.png' });
  await waitGame(page, () => gameState(page), (s) => (s?.gold ?? 0) >= 10, 8);
  await waitGame(page, () => gameState(page), (s) => (s?.enemies.length ?? 0) >= 3, 30);
  await page.screenshot({ path: 'docs/screenshots/battle.png' });
  expect(errors).toEqual([]);
});
