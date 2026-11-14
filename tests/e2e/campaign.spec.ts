import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import { GUIDE } from '../../src/render/tutorialGuide';
import {
  IPHONE, LAPTOP, breakGate, gameState, openGame, pointer, station, tapStation, waitFor, waitForGame,
  waitForLobby, waitPhase, waitScreen, GAME_WAIT,
} from './helpers';

/**
 * The player's way in v0.3: first start, tutorial, the campaign map with its level card, levels won and
 * lost (a level is one fight in waves, no market), cheese, gold that stays, resuming at the start of a
 * wave, and the profile code.
 */

const stage = (page: Page) => page.evaluate(() => (window as any).__fondue.scene.tutorialStage() as string);
const profile = (page: Page) => page.evaluate(() => {
  const a = (window as any).__fondue;
  const d = a.profile.data;
  return { cheese: d.wallet.cheese as number, gold: d.wallet.gold as number, done: a.profile.highestLevelDone(a.world) as number, tutorialDone: d.seen.tutorial as boolean };
});
const LEVEL1 = levelOf(DEFAULT_WORLD, 1)!;

/** Ends the running level as won: the last wave is reached and nobody is left on the road. */
async function winRun(page: Page) {
  await page.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    const s = sim.s;
    const last = (s.meta.rules?.lastWave ?? s.meta.wave?.lastWave ?? s.wave) as number;
    s.wave = Math.max(s.wave, last);
    s.spawnQueue = [];
    s.spawned = 0;
    s.enemies = [];
    s.waveDone = false;
    s.wavesFrozen = false;
  });
}

test('first start on a phone: the tutorial teaches the throw, level 1 follows and is won with cheese and gold', async ({ browser }) => {
  test.setTimeout(process.env.CI ? 600_000 : 240_000);
  // No ?menu: a new player lands in the prelude, not in a menu.
  const { context, page, errors } = await openGame(browser, IPHONE, '?seed=3');
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session?.meta()?.rules.mode), (m) => m === 'tutorial', GAME_WAIT);
  expect(await page.evaluate(() => (window as any).__fondue.lobby.visible)).toBe(false);
  await waitFor(() => stage(page), (s) => s === 'intro', GAME_WAIT);

  // The King speaks, then the picture freezes on one raider and a hand shows the gesture.
  await waitFor(() => stage(page), (s) => s === 'show', GAME_WAIT * 2);
  expect(await page.evaluate(() => (window as any).__fondue.session.view().hold)).toBe(true);
  const fieldW = await page.evaluate(() => (window as any).__fondue.session.sim.fieldW as number);
  const s = (await gameState(page))!;
  const target = s.enemies
    .filter((e: any) => (e.st === 'walk' || e.st === 'attack') && e.x >= GUIDE.targetMinX && e.x <= fieldW - GUIDE.targetInsetRight)
    .sort((a: any, b: any) => a.x - b.x)[0];
  expect(target, 'a raider to show the gesture on').toBeTruthy();
  const p = await pointer(page, true);
  await p.down(target.x - 4, target.y - 44);
  await waitFor(() => stage(page), (st) => st === 'try', 5000);
  await p.glide(target.x - 4, target.y - 44, target.x - 30, 80, 8, 12);
  await p.up();
  await waitFor(() => stage(page), (st) => st === 'praise', 8000);

  // The rest of the prelude plays out, and level 1 follows at once with the Rolling Wheel on the keep.
  await waitFor(() => stage(page), (st) => st !== 'praise', GAME_WAIT);
  await winRun(page);
  const l1 = await waitFor(() => gameState(page), (v) => v?.mode === 'campaign', GAME_WAIT);
  expect(l1!.level).toBe(1);
  expect((await profile(page)).tutorialDone).toBe(true);
  expect(await page.evaluate(() => (window as any).__fondue.profile.data.keep.loadout[0])).toBe('wheel');

  // There is no market in a level: it is won when its last wave is beaten.
  await waitPhase(page, ['banner', 'battle']);
  await winRun(page);
  await waitScreen(page, 'won');
  await expect(page.locator('#wonLevel')).toHaveText(LEVEL1.name);
  await expect(page.locator('#wonStars')).toContainText('+');
  await page.screenshot({ path: 'mobile-screenshots/level1-won.png' });
  const after = await profile(page);
  expect(after.done).toBe(1);
  expect(after.cheese).toBeGreaterThanOrEqual(1);
  await page.tap('#continue');

  // Back in the hall: the map has level 2 open and level 3 still locked; level 1 shows its cheese.
  await tapStation(page, 'campaign', true);
  await expect(page.locator('.cm-st[data-level="1"]')).toHaveClass(/done/);
  await expect(page.locator('.cm-st[data-level="1"] .cm-got')).toContainText(String(after.cheese));
  await expect(page.locator('.cm-st[data-level="2"]')).toHaveAttribute('data-a', 'level');
  await expect(page.locator('.cm-st[data-level="3"]')).toHaveAttribute('data-a', 'lockedLevel');
  expect(errors).toEqual([]);
  await context.close();
});

test('campaign map: a level card, a lost level keeps its gold, try again, and back to the map', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, LAPTOP);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="5"]');
  await expect(page.locator('#lockNote')).toContainText('Win level 4 first');
  await expect(page.locator('#playLevel')).toHaveCount(0);
  await page.click('#closeCard');
  await page.click('.cm-st[data-level="1"]');
  await expect(page.locator('#cardName')).toHaveText(LEVEL1.name);
  await expect(page.locator('#cardStars')).toContainText('0/5 cheese');
  await page.screenshot({ path: 'mobile-screenshots/campaign-map.png' });
  await page.click('#playLevel');
  const first = await waitPhase(page, ['banner', 'battle']);
  expect([first!.mode, first!.level]).toEqual(['campaign', 1]);
  const runId = await page.evaluate(() => (window as any).__fondue.session.meta().rules.runId);
  await page.evaluate(() => { (window as any).__fondue.session.sim.s.stats.goldEarned = 77; });
  await breakGate(page);
  await waitScreen(page, 'gameover');
  await expect(page.locator('.panel h2')).toHaveText('Level 1 failed');
  // The gold of a lost level stays (E-066).
  await waitFor(() => profile(page), (pr) => pr.gold >= 77, 5000);
  await page.click('#restart');
  await waitFor(() => gameState(page), (st) => (st?.phase === 'battle' || st?.phase === 'banner') && st.gateHp === st.gateMax, GAME_WAIT);
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

test('a level won from the map pays cheese once, unlocks what it holds and opens the next level', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, LAPTOP);
  await page.evaluate(() => { const a = (window as any).__fondue; a.profile.markLevelDone(a.world, 1); a.profile.flushSync(); });
  await page.reload();
  await waitForGame(page);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="2"]');
  await page.click('#playLevel');
  await waitPhase(page, ['banner', 'battle']);
  expect((await gameState(page))!.level).toBe(2);
  await winRun(page);
  await waitScreen(page, 'won');
  const won = await profile(page);
  expect(won.cheese).toBeGreaterThanOrEqual(1);
  await page.click('#continue');
  await waitForLobby(page);
  await expect(page.locator('#stars')).toHaveText(String(won.cheese));
  await station(page, 'campaign');
  await expect(page.locator('.cm-st[data-level="2"]')).toHaveClass(/done/);
  await expect(page.locator('.cm-st[data-level="3"]')).toHaveAttribute('data-a', 'level');
  await page.click('.cm-st[data-level="2"]');
  await expect(page.locator('#cardStars')).toContainText('replays pay gold');
  await expect(page.locator('#playLevel')).toHaveText('Play again');
  // Winning again pays no cheese twice: only bits not set before count.
  const maskOf = () => page.evaluate(() => { const a = (window as any).__fondue; return (a.profile.data.worlds[a.world].cheese['2'] ?? 0) as number; });
  const bits = (m: number) => [0, 1, 2, 3, 4].filter((b) => m & (1 << b)).length;
  const before = await maskOf();
  expect(bits(before)).toBe(won.cheese);
  await page.click('#playLevel');
  await waitPhase(page, ['banner', 'battle']);
  await winRun(page);
  await waitScreen(page, 'won');
  const again = await profile(page);
  const after = await maskOf();
  expect(after & before).toBe(before);
  expect(again.cheese - won.cheese).toBe(bits(after) - bits(before));
  expect(errors).toEqual([]);
  await context.close();
});

test('an interrupted level continues at the start of its wave after the app was closed', async ({ browser }) => {
  const { context, page, errors } = await openGame(browser, LAPTOP);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="1"]');
  await page.click('#playLevel');
  await waitPhase(page, 'battle');
  // Into the second wave: the start of a wave is saved.
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session.sim.s.wave as number), (w) => w >= 1, GAME_WAIT);
  await page.evaluate(() => (window as any).__fondue.profile.flushSync());
  const pending = await page.evaluate(() => (window as any).__fondue.pendingRun());
  expect(pending, 'the level is saved at the start of its wave').toBeTruthy();
  await page.reload();
  await waitForGame(page);
  await waitForLobby(page);
  const spot = await page.evaluate(() => (window as any).__fondue.lobby.spots().find((s: any) => s.id === 'continueLevel'));
  expect(spot, 'the door offers to continue').toBeTruthy();
  await page.screenshot({ path: 'mobile-screenshots/lobby-continue.png' });
  await tapStation(page, 'continueLevel', false);
  const s = await waitPhase(page, ['banner', 'battle']);
  expect([s!.mode, s!.level]).toEqual(['campaign', 1]);
  expect(await page.evaluate(() => (window as any).__fondue.session.sim.s.wave as number)).toBe(pending.start.wave);
  expect(errors).toEqual([]);
  await context.close();
});

test('profile: the code from Options loads on another device; a broken code changes nothing', async ({ browser }) => {
  const a = await openGame(browser, LAPTOP);
  await a.page.evaluate(() => {
    const f = (window as any).__fondue;
    f.profile.edit((d: any) => { d.wallet.cheese = 37; d.wallet.gold = 1234; });
    f.profile.setName('Lenny');
    f.profile.markLevelDone(f.world, 1);
  });
  await station(a.page, 'options');
  const code = await a.page.locator('#profileCode').inputValue();
  expect(code.length).toBeGreaterThan(20);
  await a.context.close();

  const b = await openGame(browser, IPHONE);
  await tapStation(b.page, 'options', true);
  await b.page.locator('#profileImport').fill('this is no profile');
  await b.page.tap('button[data-a="importProfile"]');
  await expect(b.page.locator('#profileError')).toContainText('broken');
  expect((await profile(b.page)).cheese).toBe(0);
  await b.page.locator('#profileImport').fill(code);
  await b.page.tap('button[data-a="importProfile"]');
  await waitFor(() => profile(b.page), (p) => p.cheese === 37, 5000);
  expect((await profile(b.page)).gold).toBe(1234);
  expect((await profile(b.page)).done).toBe(1);
  await expect(b.page.locator('#name')).toHaveValue('Lenny');
  expect(await b.page.evaluate(() => (window as any).__fondue.profile.data.keep.loadout[0])).toBe('wheel');
  expect(b.errors).toEqual([]);
  await b.context.close();
});
