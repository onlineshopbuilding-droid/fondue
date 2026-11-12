import { expect, test, type Page } from '@playwright/test';
import { WORLD } from '../../src/config/field';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import { GUIDE } from '../../src/render/tutorialGuide';
import {
  IPHONE, LAPTOP, breakGate, endDay, gameState, openGame, pointer, spawn, station, tapMarket, tapStation, waitFor, waitForGame,
  waitForLobby, waitPhase, waitScreen, GAME_WAIT,
} from './helpers';

/** The player's way: first start, tutorial, campaign map, levels won and lost, resuming, the profile. */

const stage = (page: Page) => page.evaluate(() => (window as any).__fondue.scene.tutorialStage() as string);
const profile = (page: Page) => page.evaluate(() => {
  const a = (window as any).__fondue;
  return { stars: a.profile.data.stars as number, done: a.profile.highestLevelDone(a.world) as number, tutorialDone: a.profile.data.tutorialDone as boolean };
});
const LEVEL1 = levelOf(DEFAULT_WORLD, 1)!;
const LEVEL2 = levelOf(DEFAULT_WORLD, 2)!;

/** Wins every remaining day of the running level: each day ends at once, Next Day in between. */
async function winLevel(page: Page) {
  for (;;) {
    const s = await waitPhase(page, ['battle', 'intermission', 'runWon']);
    if (s!.phase === 'runWon') break;
    if (s!.phase === 'battle') { await endDay(page); await waitPhase(page, ['intermission', 'runWon']); continue; }
    await page.click('#ready');
    await waitPhase(page, ['banner', 'battle']);
  }
  await waitScreen(page, 'won');
}

test('first start on a phone: the tutorial teaches the throw, level 1 follows, its market and pot, and it is won', async ({ browser }) => {
  test.setTimeout(process.env.CI ? 600_000 : 240_000);
  // No ?menu: a new player lands in the prelude, not in a menu.
  const { context, page, errors } = await openGame(browser, IPHONE, '?seed=3');
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session?.meta()?.rules.mode), (m) => m === 'tutorial', GAME_WAIT);
  expect(await page.evaluate(() => (window as any).__fondue.lobby.visible)).toBe(false);
  await waitFor(() => stage(page), (s) => s === 'intro', GAME_WAIT);
  await page.screenshot({ path: 'mobile-screenshots/tutorial-intro.png' });

  // The King speaks, then the picture freezes on one raider and a hand shows the gesture.
  await waitFor(() => stage(page), (s) => s === 'show', GAME_WAIT * 2);
  expect(await page.evaluate(() => (window as any).__fondue.session.view().hold)).toBe(true);
  await page.screenshot({ path: 'mobile-screenshots/tutorial-show.png' });
  const fieldW = await page.evaluate(() => (window as any).__fondue.session.sim.fieldW as number);
  const s = (await gameState(page))!;
  const target = s.enemies
    .filter((e: any) => (e.st === 'walk' || e.st === 'attack') && e.x >= GUIDE.targetMinX && e.x <= fieldW - GUIDE.targetInsetRight)
    .sort((a: any, b: any) => a.x - b.x)[0];
  expect(target, 'a raider to show the gesture on').toBeTruthy();
  const p = await pointer(page, true);
  await p.down(target.x - 4, target.y - 44);
  await waitFor(() => stage(page), (st) => st === 'try', 5000);
  // The grab lets the world run again; a quick flick upwards is the throw.
  await p.glide(target.x - 4, target.y - 44, target.x - 30, 80, 8, 12);
  await p.up();
  await waitFor(() => stage(page), (st) => st === 'praise', 8000);
  await page.screenshot({ path: 'mobile-screenshots/tutorial-praise.png' });

  // The rest of the prelude plays out; the gate cannot fall, and level 1 follows at once.
  await waitFor(() => stage(page), (st) => st !== 'praise', GAME_WAIT);
  await endDay(page);
  const l1 = await waitFor(() => gameState(page), (v) => v?.mode === 'campaign', GAME_WAIT);
  expect(l1!.level).toBe(1);
  expect((await profile(page)).tutorialDone).toBe(true);

  // Day 1 of level 1, then its market: only the cauldron is for sale, and the first slot is still locked.
  await waitPhase(page, 'battle');
  await endDay(page);
  await waitPhase(page, 'intermission');
  await page.tap('#toShop');
  await waitScreen(page, 'shop');
  await expect(page.locator('#marketHint.level')).toBeVisible();
  await tapMarket(page, 'slot:0', true);
  await expect(page.locator('#marketWindow')).toHaveAttribute('data-slot', '0');
  await expect(page.locator('#marketWindow')).toContainText('Win level 1 to build here');
  await page.tap('button[data-a="closeWin"]');
  await tapMarket(page, 'gate', true);
  await expect(page.locator('#marketWindow button[data-buy="gate"]')).toBeDisabled();
  await expect(page.locator('#marketWindow')).toContainText('Not sold in this level');
  await page.tap('button[data-a="closeWin"]');
  await page.evaluate(() => { (window as any).__fondue.session.sim.s.gold = 300; });
  await tapMarket(page, 'station:cauldron', true);
  await page.tap('#marketWindow button[data-buy="station:cauldron"]');
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session.meta().loadout.stations.cauldron as boolean), (b) => b, 5000);
  await page.screenshot({ path: 'mobile-screenshots/level1-market.png' });
  await page.tap('#ready');

  // Day 2: the King points at the pot, and a raider carried there melts.
  await waitPhase(page, 'battle');
  await waitFor(() => stage(page), (st) => st === 'pot', GAME_WAIT);
  await page.screenshot({ path: 'mobile-screenshots/level1-pot-hint.png' });
  await page.evaluate(() => { const s = (window as any).__fondue.session.sim.s; s.spawnQueue = []; s.enemies = []; });
  await spawn(page, 'grunt', 640);
  const g = (await waitFor(() => gameState(page), (v) => v!.enemies.length === 1, 3000))!.enemies[0];
  const hand = await pointer(page, true);
  await hand.down(g.x, g.y - 44);
  await waitFor(() => gameState(page), (v) => v!.enemies[0]?.st === 'held', 3000);
  await hand.glide(g.x, g.y - 44, WORLD.cauldron.x, WORLD.cauldron.rimY - 30, 16, 25);
  await hand.up(160);
  await waitFor(() => gameState(page), (v) => v!.offerings >= 1, GAME_WAIT);

  // The last day ends: the level is won, with its stars and what it unlocks.
  await endDay(page);
  await waitScreen(page, 'won');
  await expect(page.locator('#wonLevel')).toHaveText(LEVEL1.name);
  await expect(page.locator('#wonStars')).toContainText(String(LEVEL1.stars));
  await expect(page.locator('#unlocks')).toContainText('Wall Foot');
  await expect(page.locator('#unlocks')).toContainText('Rolling Wheel');
  await page.screenshot({ path: 'mobile-screenshots/level1-won.png' });
  expect(await profile(page)).toEqual({ stars: LEVEL1.stars, done: 1, tutorialDone: true });
  await page.tap('#continue');

  // Back in the hall: the map has level 2 open and level 3 still locked.
  await tapStation(page, 'campaign', true);
  await expect(page.locator('.cm-st[data-level="1"]')).toHaveClass(/done/);
  await expect(page.locator('.cm-st[data-level="2"]')).toHaveAttribute('data-a', 'level');
  await expect(page.locator('.cm-st[data-level="3"]')).toHaveAttribute('data-a', 'lockedLevel');
  expect(errors).toEqual([]);
  await context.close();
});

test('campaign map: a level card, a lost level, try again, and back to the map', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, LAPTOP);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="5"]');
  await expect(page.locator('#lockNote')).toContainText('Win level 4 first');
  await expect(page.locator('#playLevel')).toHaveCount(0);
  await page.click('#closeCard');
  await page.click('.cm-st[data-level="1"]');
  await expect(page.locator('#cardName')).toHaveText(LEVEL1.name);
  await page.screenshot({ path: 'mobile-screenshots/campaign-map.png' });
  await page.click('#playLevel');
  const first = await waitPhase(page, 'battle');
  expect([first!.mode, first!.level]).toEqual(['campaign', 1]);
  const runId = await page.evaluate(() => (window as any).__fondue.session.meta().rules.runId);
  await breakGate(page);
  await waitScreen(page, 'gameover');
  await expect(page.locator('.panel h2')).toHaveText('Level 1 failed');
  await page.click('#restart');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle' && s.day === 1 && s.gateHp === s.gateMax, GAME_WAIT);
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().rules.runId)).not.toBe(runId);
  expect((await gameState(page))!.level).toBe(1);
  await breakGate(page);
  await waitScreen(page, 'gameover');
  await page.click('#backAfterRun');
  await waitScreen(page, 'campaign');
  expect((await profile(page)).done).toBe(0);
  expect(errors).toEqual([]);
  await context.close();
});

test('a level won from the map pays its stars, unlocks what it holds and opens the next level', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, LAPTOP);
  // A profile that has won level 1 already; reloading lets the game hand out what that unlocks.
  await page.evaluate(() => { const a = (window as any).__fondue; a.profile.markLevelDone(a.world, 1); });
  await page.evaluate(() => (window as any).__fondue.profile.flush());
  await page.reload();
  await waitForGame(page);
  expect(await page.evaluate(() => (window as any).__fondue.profile.hasSlot(0))).toBe(true);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="2"]');
  await page.click('#playLevel');
  await waitPhase(page, ['banner', 'battle']);
  expect((await gameState(page))!.level).toBe(2);
  await winLevel(page);
  await expect(page.locator('#wonStars')).toContainText(String(LEVEL2.stars));
  await expect(page.locator('#unlocks')).toContainText('New gate');
  await page.click('#continue');
  await waitForLobby(page);
  await expect(page.locator('#stars')).toHaveText(String(LEVEL2.stars));
  await station(page, 'campaign');
  await expect(page.locator('.cm-st[data-level="2"]')).toHaveClass(/done/);
  await expect(page.locator('.cm-st[data-level="3"]')).toHaveAttribute('data-a', 'level');
  await page.click('.cm-st[data-level="2"]');
  await expect(page.locator('#cardStars')).toContainText('won');
  await expect(page.locator('#playLevel')).toHaveText('Play again');
  expect(errors).toEqual([]);
  await context.close();
});

test('an interrupted level continues at the start of its next day after the app was closed', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, LAPTOP);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="1"]');
  await page.click('#playLevel');
  await waitPhase(page, 'battle');
  await page.evaluate(() => { (window as any).__fondue.session.sim.s.gold = 123; });
  await endDay(page);
  await waitPhase(page, 'intermission');
  await page.evaluate(() => (window as any).__fondue.profile.flush());
  // The app is closed in the market and opened again.
  await page.reload();
  await waitForGame(page);
  await waitForLobby(page);
  const spot = await page.evaluate(() => (window as any).__fondue.lobby.spots().find((s: any) => s.id === 'continueLevel'));
  expect(spot, 'the door offers to continue').toBeTruthy();
  await page.screenshot({ path: 'mobile-screenshots/lobby-continue.png' });
  await tapStation(page, 'continueLevel', false);
  const s = await waitPhase(page, ['banner', 'battle']);
  expect([s!.mode, s!.level, s!.day, s!.gold]).toEqual(['campaign', 1, 2, 123]);
  expect(errors).toEqual([]);
  await context.close();
});

test('profile: the code from Options loads on another device; a broken code changes nothing', async ({ browser }) => {
  const a = await openGame(browser, LAPTOP);
  await a.page.evaluate(() => { const f = (window as any).__fondue; f.profile.addStars(37); f.profile.setName('Lenny'); f.profile.markLevelDone(f.world, 1); });
  await station(a.page, 'options');
  const code = await a.page.locator('#profileCode').inputValue();
  expect(code.length).toBeGreaterThan(20);
  await a.context.close();

  const b = await openGame(browser, IPHONE);
  await tapStation(b.page, 'options', true);
  await b.page.locator('#profileImport').fill('this is no profile');
  await b.page.tap('button[data-a="importProfile"]');
  await expect(b.page.locator('#profileError')).toContainText('broken');
  expect((await profile(b.page)).stars).toBe(0);
  await b.page.locator('#profileImport').fill(code);
  await b.page.tap('button[data-a="importProfile"]');
  await waitFor(() => profile(b.page), (p) => p.stars === 37, 5000);
  expect((await profile(b.page)).done).toBe(1);
  await expect(b.page.locator('#name')).toHaveValue('Lenny');
  expect(await b.page.evaluate(() => (window as any).__fondue.profile.hasSlot(0))).toBe(true);
  expect(b.errors).toEqual([]);
  await b.context.close();
});
