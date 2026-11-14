import { expect, test, type Page } from '@playwright/test';
import { GAME_VERSION } from '../../src/config/game';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import { ENEMY_POPUPS } from '../../src/config/worlds/fondue/story';
import { HELP_SLIDES } from '../../src/ui/content';
import {
  DEVICES, breakGate, clearField, drag, endLevel, gameState, nextWave, spawn, startSolo, station, tapStation, unlockEndless, waitFor,
  waitForGame, waitForLobby, openGame, screenOf, waitGame, waitPhase, waitScreen, GAME_WAIT,
} from './helpers';

/** Menus, the course of a run in waves and the developer tools, on the laptop with the mouse. */

const sim = (s: string) => `window.__fondue.session.sim.s.${s}`;
const headline = (page: Page) => page.locator('.panel h2');
/** The start of the line that says why endless is still locked (src/ui/screens/main.ts, ENDLESS_LOCKED; that file cannot load outside the app). */
const ENDLESS_LOCKED = /^Endless opens with your fifth slot/;
const wallet = (page: Page) => page.evaluate(() => ({ ...(window as any).__fondue.profile.data.wallet }) as { cheese: number; gold: number; crests: number });
/** Nothing of the old in-run market may show up: no results screen, no market, no buy buttons. */
const BUY_UI = '#toShop, #ready, #market, #marketWindow, #marketHint, [data-buy]';

/** Kills one raider with a real flick for its gold (the field is cleared first; tuning stays, so the run still counts). */
async function killOne(page: Page) {
  await clearField(page, null);
  await spawn(page, 'grunt', 760);
  const e = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
  const at = await page.evaluate(([x, y]) => (window as any).__fondue.scene.worldToCss(x, y), [e.x, e.y - 44]);
  await drag(page, [at.x, at.y], [at.x - 30, 90], 9, 8);
  await waitFor(() => gameState(page), (v) => v!.gold >= 10, 8000);
}

test('lobby: every station opens its page and Back returns to the hall', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?menu=1');
  await waitForGame(page);
  await waitForLobby(page);
  const ids = (await page.evaluate(() => (window as any).__fondue.lobby.spots().map((s: any) => s.id))) as string[];
  // Nothing to continue on a fresh profile, so the door has no sign; everything else is there.
  expect(ids.sort()).toEqual(['armoury', 'campaign', 'coop', 'credits', 'help', 'options', 'play', 'scores', 'storybook'].sort());
  await page.screenshot({ path: 'mobile-screenshots/lobby.png' });
  // Endless is still locked on a fresh profile: the pot only makes the King say why.
  await tapStation(page, 'play', false);
  await waitFor(() => page.evaluate(() => (window as any).__fondue.lobby.lastLine as string), (l) => ENDLESS_LOCKED.test(l), 5000);
  expect(await screenOf(page)).toBe('main');
  await unlockEndless(page);
  const pages: [string, string][] = [['options', 'Options'], ['scores', 'Scores'], ['credits', 'Credits'], ['armoury', 'Keep Shop'], ['coop', 'Co-op'], ['play', 'Endless']];
  for (const [id, title] of pages) {
    await tapStation(page, id, false);
    await expect(headline(page)).toHaveText(title);
    await page.click('button[data-a="main"]');
    await waitScreen(page, 'main');
  }
  await tapStation(page, 'help', false);
  const seen = new Set<string>();
  for (let i = 0; i < HELP_SLIDES.length; i++) {
    seen.add(await headline(page).innerText());
    await page.click('button[data-a="helpNext"]');
  }
  expect(seen.size).toBe(HELP_SLIDES.length);
  await page.click('button[data-a="main"]');
  await tapStation(page, 'campaign', false);
  await expect(page.locator('#campaignMap')).toBeVisible();
  await page.click('button[data-a="main"]');
  await tapStation(page, 'storybook', false);
  await waitFor(() => page.evaluate(() => (window as any).__fondue.lobby.storybookOpen as boolean), (b) => b, 5000);
  await page.evaluate(() => (window as any).__fondue.lobby.closeStorybook());
  expect(errors).toEqual([]);
});

for (const d of DEVICES) {
  test(`${d.name}: the version shows small in the lobby, clear of every station, and in the Options`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d);
    await waitForLobby(page);
    const label = page.locator('#versionLabel');
    await expect(label).toBeVisible();
    await expect(label).toHaveText(new RegExp(`^v${GAME_VERSION.replaceAll('.', '\\.')} · build [0-9a-z]+$`));
    const box = (await label.boundingBox())!;
    // Beside the chip, in the top row, where no station or its sign sits.
    const chip = (await page.locator('#progress').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(chip.x + chip.width);
    expect(box.y + box.height).toBeLessThanOrEqual(chip.y + chip.height);
    const spots = (await page.evaluate(() => (window as any).__fondue.lobby.spots())) as { id: string; x: number; y: number; r: number }[];
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      // Distance from the station's centre to the nearest point of the label.
      const dx = Math.max(box.x - s.x, 0, s.x - (box.x + box.width));
      const dy = Math.max(box.y - s.y, 0, s.y - (box.y + box.height));
      expect(Math.hypot(dx, dy), `the version label stays clear of ${s.id}`).toBeGreaterThan(s.r);
    }
    await page.screenshot({ path: `mobile-screenshots/lobby-version-${d.name}.png` });
    await tapStation(page, 'options', d.touch);
    await expect(headline(page)).toHaveText('Options');
    await expect(page.locator('#versionLabel')).toContainText(`v${GAME_VERSION} · build`);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('the plain menu (?menu=html) has a button for every station and shows the build', async ({ page }) => {
  await page.goto('/?menu=html');
  await waitForGame(page);
  await expect(page.locator('.version')).toContainText(`v${GAME_VERSION} · build`);
  for (const a of ['campaign', 'coop', 'armoury', 'options', 'scores', 'help', 'credits']) await expect(page.locator(`button[data-a="${a}"]`)).toBeVisible();
  expect(await page.evaluate(() => (window as any).__fondue.lobby.visible)).toBe(false);
  // Endless is locked on a fresh profile and says why; with the progress it opens.
  await expect(page.locator('.menu-main button', { hasText: 'Endless' })).toBeDisabled();
  expect(await page.locator('.menu-main button', { hasText: 'Endless' }).getAttribute('title')).toMatch(ENDLESS_LOCKED);
  await unlockEndless(page);
  await page.reload();
  await waitForGame(page);
  await page.click('button[data-a="play"]');
  await page.click('#startEndless');
  await waitPhase(page, 'battle');
});

test('endless: waves follow each other with no screen and nothing to buy; the worn weapon fires; the gold of the run is kept', async ({ page }) => {
  await page.goto('/?menu=1&seed=11');
  await waitForGame(page);
  await waitForLobby(page);
  await unlockEndless(page);
  await page.evaluate(() => { const p = (window as any).__fondue.profile; p.edit((d: any) => { d.keep.weapons.wheel = { tier: 1 }; }); p.flushSync(); });
  expect((await wallet(page)).gold).toBe(0);
  // The weapon is worn before the run, on the endless page: tap the slot, then the weapon.
  await station(page, 'play');
  await page.click('#lo-0');
  await page.click('.lo-pick[data-id="wheel"]');
  await expect(page.locator('#lo-0 img')).toHaveCount(1);
  await page.click('#startEndless');
  await waitPhase(page, 'battle');
  const first = (await gameState(page))!;
  expect([first.mode, first.wave]).toEqual(['endless', 1]);
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().loadout.slotWeapon[0])).toBe('wheel');

  // The weapon fires by its number key and by a click on it.
  const cd = () => page.evaluate(() => (window as any).__fondue.session.view().cooldowns[0] as number);
  await spawn(page, 'grunt', 700);
  await page.keyboard.press('1');
  await waitFor(cd, (c) => c > 0, 3000);
  await page.evaluate(`${sim('cooldowns')}[0] = 0`);
  const pos = await page.evaluate(() => (window as any).__fondue.scene.slotCss(0));
  await page.mouse.click(pos.x, pos.y);
  await waitFor(cd, (c) => c > 0, 3000);
  await page.screenshot({ path: 'docs/screenshots/wheel.png' });

  // A raider flung to its death pays gold, and the HUD shows the gold of the run.
  await killOne(page);
  const gold = (await gameState(page))!.gold;
  await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.hud.gold.text as string), (t) => t === String(gold), 5000);

  // The wave is cleared: the next one follows on the battlefield, without any screen in between.
  await nextWave(page);
  await waitGame(page, async () => {
    const st = await gameState(page);
    const shown = await page.evaluate((sel) => ({ overlay: document.querySelectorAll('.overlay').length, buy: document.querySelectorAll(sel).length }), BUY_UI);
    expect(st!.screen, 'no screen between waves').toBe('none');
    expect(shown, 'no window and no market between waves').toEqual({ overlay: 0, buy: 0 });
    expect(['banner', 'battle']).toContain(st!.phase);
    return st;
  }, (st) => !!st && st.wave === 2, 20);
  expect(await page.evaluate(() => typeof (window as any).__fondue.scene.tapMarketSpot)).toBe('undefined');
  await page.screenshot({ path: 'docs/screenshots/battle.png' });

  // The run ends when the gate falls; the gold earned is in the profile.
  const earned = await page.evaluate(() => (window as any).__fondue.session.sim.s.stats.goldEarned as number);
  expect(earned).toBeGreaterThanOrEqual(10);
  await breakGate(page);
  await waitScreen(page, 'gameover');
  await expect(page.locator('#finalWave')).toHaveText('2');
  await expect(page.locator('#runGold')).toHaveText(String(earned));
  expect((await wallet(page)).gold).toBe(earned);
  await page.click('button[data-a="quit"]');
  await waitForLobby(page);
  await expect(page.locator('#lobbyGold')).toHaveText(earned.toLocaleString('en-US'));
});

test('campaign level: no market in the level; the won screen lists the cheese and the gold kept', async ({ page }) => {
  await page.goto('/?menu=1&seed=17');
  await waitForGame(page);
  await station(page, 'campaign');
  await page.click('.cm-st[data-level="1"]');
  await page.click('#playLevel');
  await waitPhase(page, 'battle');
  const s = (await gameState(page))!;
  expect([s.mode, s.level, s.wave]).toEqual(['campaign', 1, 1]);
  await killOne(page);
  expect(await page.locator(BUY_UI).count()).toBe(0);
  const earned = await page.evaluate(() => (window as any).__fondue.session.sim.s.stats.goldEarned as number);
  await endLevel(page);
  await waitGame(page, () => screenOf(page), (sc) => sc === 'won', 20);
  await expect(headline(page)).toHaveText('Level 1 won!');
  await expect(page.locator('#wonLevel')).toHaveText(levelOf(DEFAULT_WORLD, 1)!.name);
  await expect(page.locator('#cheeseList li')).toHaveCount(5);
  await expect(page.locator('#cheeseList li.cheese-new').first()).toBeVisible();
  await expect(page.locator('#runGold')).toHaveText(String(earned));
  const w = await wallet(page);
  expect(w.gold).toBe(earned);
  expect(w.cheese).toBe(await page.locator('#cheeseList li.cheese-new').count());
  await page.screenshot({ path: 'mobile-screenshots/level-won.png' });
  await page.click('#continue');
});

test('endless: the gate falls, the run ends with its score, scores and back, then play again', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=12');
  await page.evaluate(`${sim('gateHp')} = 1; window.__fondue.session.sim.spawnEnemy('grunt', 220);`);
  await waitPhase(page, 'defeat');
  await page.screenshot({ path: 'docs/screenshots/defeat.png' });
  await page.waitForSelector('#restart', { timeout: GAME_WAIT });
  await expect(headline(page)).toHaveText('The gate has fallen');
  await expect(page.locator('#finalWave')).toHaveText('1');
  await expect(page.locator('#finalScore')).toHaveText(/^\d+$/);
  await page.screenshot({ path: 'docs/screenshots/gameover.png' });
  await page.click('button[data-a="scores2"]');
  await expect(page.locator('table.scores tbody tr')).toHaveCount(1);
  await expect(page.locator('table.scores tbody')).toContainText('Player');
  await page.click('button[data-a="backGameOver"]');
  await expect(page.locator('#restart')).toBeVisible();
  await page.click('#restart');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle' && s.wave === 1 && s.gateHp === s.gateMax, GAME_WAIT);
  await breakGate(page);
  await page.waitForSelector('#restart', { timeout: GAME_WAIT });
  await page.click('button[data-a="quit"]');
  await waitForLobby(page);
  await station(page, 'scores');
  await expect(page.locator('table.scores tbody tr')).toHaveCount(2);
});

test('tuning panel changes values, exports and imports, and the values stay', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=13');
  await page.keyboard.press('F1');
  await expect(page.locator('#tuning')).toBeVisible();
  await expect(page.locator('#tuning input[type=range]')).toHaveCount(12);
  await page.locator('#tuning input[data-key="gravity"]').fill('2000');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.gravity)).toBe(2000);
  await page.click('#tuning button[data-act="export"]');
  const json = await page.locator('#tuning textarea[data-json]').inputValue();
  expect(JSON.parse(json).gravity).toBe(2000);
  await page.click('#tuning button[data-preset="Arcade"]');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.knockOthers)).toBe(true);
  await page.locator('#tuning textarea[data-json]').fill(JSON.stringify({ gravity: 3100 }));
  await page.click('#tuning button[data-act="import"]');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.gravity)).toBe(3100);
  await page.reload();
  await waitForGame(page);
  await station(page, 'play');
  await page.click('#startEndless');
  await waitFor(() => gameState(page), (s) => s !== null);
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.gravity)).toBe(3100);
});

test('debug overlay and pause', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=14');
  await page.keyboard.press('F3');
  await expect(page.locator('#debug')).toContainText('FPS');
  await page.keyboard.press('p');
  await expect(headline(page)).toHaveText('Paused');
  await page.click('button[data-a="resume"]');
  await expect(page.locator('.overlay')).toHaveCount(0);
  await page.keyboard.press('p');
  await expect(headline(page)).toHaveText('Paused');
  await page.keyboard.press('p');
  await expect(page.locator('.overlay')).toHaveCount(0);
});

test('a right click never grabs a raider', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=16');
  await clearField(page);
  await spawn(page, 'grunt', 700);
  const e = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
  const at = await page.evaluate(([x, y]) => (window as any).__fondue.scene.worldToCss(x, y), [e.x, e.y - 40]);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(150);
  expect((await gameState(page))!.enemies[0].st).not.toBe('held');
  await page.mouse.up({ button: 'right' });
  // The left button grabs the very same raider.
  await page.mouse.down();
  await waitFor(() => gameState(page), (s) => s!.enemies[0].st === 'held', 3000);
  await page.mouse.up();
});

test('a realistic flick kills, a slow drop does not', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=15');
  await clearField(page);
  await spawn(page, 'grunt', 760);
  await spawn(page, 'grunt', 900);
  const [a, b] = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 2, 3000))!.enemies;
  const toCss = (x: number, y: number) => page.evaluate(([p, q]) => (window as any).__fondue.scene.worldToCss(p, q), [x, y]);
  // Slow, short drop: from just above the ground with no flick.
  const pa = await toCss(a.x, a.y - 40);
  await page.mouse.move(pa.x, pa.y);
  await page.mouse.down();
  await waitFor(() => gameState(page), (s) => s!.enemies.some((q: any) => q.st === 'held'), 3000);
  await page.waitForTimeout(300);
  await page.mouse.up();
  await waitFor(() => gameState(page), (s) => s!.enemies.find((q: any) => q.id === a.id)?.st !== 'air', 5000);
  expect((await gameState(page))!.gold).toBe(0);
  const live = (await gameState(page))!.enemies.find((q: any) => q.id === b.id)!;
  const pb = await toCss(live.x, live.y - 44);
  await drag(page, [pb.x, pb.y], [pb.x - 30, 90], 9, 8);
  await waitFor(() => gameState(page), (v) => v!.gold >= 10, 8000);
});

test('developer menu: jump to a level and wave; a developer win keeps nothing and unlocks nothing', async ({ page }) => {
  await page.goto('/?menu=1');
  await waitForGame(page);
  await station(page, 'options');
  await page.click('#devMenuButton');
  await expect(page.locator('#tuning')).toBeVisible();
  await page.click('#devStars');
  expect(await page.evaluate(() => (window as any).__fondue.profile.data.wallet.cheese)).toBe(50);
  // The last wave of level 3: winning it wins the level.
  const lastWave = levelOf(DEFAULT_WORLD, 3)!.waves.length;
  expect(lastWave).toBeGreaterThan(1);
  await page.fill('#devLevel', '3');
  // The developer menu still calls the field Day; it picks the wave.
  await page.fill('#devDay', String(lastWave));
  await page.click('#devJump');
  const s = await waitPhase(page, ['banner', 'battle']);
  expect(s!.mode).toBe('campaign');
  expect(s!.level).toBe(3);
  expect(s!.wave).toBe(lastWave);
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().devRun)).toBe(true);
  await waitPhase(page, 'battle');
  await page.evaluate(() => { (window as any).__fondue.session.sim.s.stats.goldEarned = 55; });
  await endLevel(page);
  // The end of the level plays in game time.
  await waitGame(page, () => screenOf(page), (sc) => sc === 'won', 20);
  await expect(page.locator('.panel')).toContainText('Developer run: nothing is kept.');
  await expect(page.locator('#unlocks')).toHaveCount(0);
  await expect(page.locator('#runGold')).toHaveText('0');
  expect(await wallet(page)).toEqual({ cheese: 50, gold: 0, crests: 0 });
  expect(await page.evaluate(() => (window as any).__fondue.profile.highestLevelDone((window as any).__fondue.world))).toBe(0);
  await page.click('#continue');
  await waitForLobby(page);
});

test('a new raider is introduced by its window on the level it first comes; a tap closes it', async ({ page }) => {
  // The first level that brings a new raider with a window of its own, on a day it surely comes.
  const level = Array.from({ length: 100 }, (_, i) => levelOf(DEFAULT_WORLD, i + 1)!).find((l) => l.newEnemies.some((t) => ENEMY_POPUPS[t]))!;
  const type = level.newEnemies.find((t) => ENEMY_POPUPS[t])!;
  await page.goto('/?menu=1');
  await waitForGame(page);
  await station(page, 'options');
  await page.click('#devMenuButton');
  await page.fill('#devLevel', String(level.id));
  await page.fill('#devDay', '2');
  // Untapped, a window goes by itself after some seconds of real time. A slow machine can spend
  // that long between two steps of this test, so here the windows wait for their tap.
  await page.evaluate(() => { (window as any).__fondue.popup.showMs = 10 * 60_000; });
  await page.click('#devJump');
  await page.waitForSelector('#enemyPopup', { timeout: GAME_WAIT });
  // Raiders met for the first time come one window after the other.
  for (let i = 0; i < 8 && (await page.getAttribute('#enemyPopup', 'data-enemy')) !== type; i++) {
    await page.click('#enemyPopup');
    await page.waitForSelector('#enemyPopup', { timeout: 5000 });
  }
  await expect(page.locator('#enemyPopup')).toHaveAttribute('data-enemy', type);
  await expect(page.locator('#enemyPopup')).toContainText(ENEMY_POPUPS[type]!.title);
  await page.screenshot({ path: 'mobile-screenshots/enemy-popup.png' });
  await page.click('#enemyPopup');
  await expect(page.locator(`#enemyPopup[data-enemy="${type}"]`)).toHaveCount(0);
});

test('developer menu: quick endless start stays off the scores; profile tools unlock, replay and erase', async ({ page }) => {
  await page.goto('/?menu=1');
  await waitForGame(page);
  await waitForLobby(page);
  await page.keyboard.press('F1');
  await page.click('#tuning button[data-startday="10"]');
  await page.click('#devQuickSolo');
  await waitFor(() => gameState(page), (s) => s?.wave === 10, GAME_WAIT);
  const meta = await page.evaluate(() => (window as any).__fondue.session.meta());
  expect(meta.devRun).toBe(true);
  expect(meta.loadout.gateTier).toBeGreaterThanOrEqual(1);
  await breakGate(page);
  await page.waitForSelector('#restart', { timeout: GAME_WAIT });
  await expect(page.locator('#devRunNote')).toContainText('not added to the scores');
  await page.click('button[data-a="scores2"]');
  await expect(page.locator('table.scores tbody')).toContainText('No endless runs yet');
  await page.click('button[data-a="backGameOver"]');
  await page.click('button[data-a="quit"]');
  await waitForLobby(page);

  await page.keyboard.press('F1');
  await page.click('#devUnlockAll');
  const unlocked = await page.evaluate(() => { const p = (window as any).__fondue.profile; const a = (window as any).__fondue; return [p.hasWeapon('bolter'), p.highestLevelDone(a.world) >= 11, p.hasStation('perch')]; });
  expect(unlocked).toEqual([true, true, true]);
  await page.click('#devStars');
  await page.click('#devResetProfile');
  await page.click('#tuning button[data-act="resetConfirm"]');
  const after = await page.evaluate(() => { const p = (window as any).__fondue.profile; return [p.data.wallet.cheese, p.hasWeapon('bolter')]; });
  expect(after).toEqual([0, false]);
  await page.click('#devTutorial');
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session?.meta()?.rules.mode), (m) => m === 'tutorial', GAME_WAIT);
  await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.tutorialStage() as string), (st) => st !== '', GAME_WAIT);
});
