import { expect, test, type Page } from '@playwright/test';
import { GAME_VERSION } from '../../src/config/game';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import { ENEMY_POPUPS } from '../../src/config/worlds/fondue/story';
import { HELP_SLIDES } from '../../src/ui/content';
import {
  DEVICES, breakGate, clearField, drag, endDay, gameState, spawn, startSolo, station, tapStation, waitFor, waitForGame, waitForLobby,
  openGame, screenOf, waitGame, waitPhase, waitScreen, GAME_WAIT,
} from './helpers';

/** Menus, the course of a day and the developer tools, on the laptop with the mouse. */

const sim = (s: string) => `window.__fondue.session.sim.s.${s}`;
const headline = (page: Page) => page.locator('.panel h2');

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
  const pages: [string, string][] = [['options', 'Options'], ['scores', 'Scores'], ['credits', 'Credits'], ['armoury', 'Armoury'], ['coop', 'Co-op'], ['play', 'Endless']];
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
  for (const a of ['campaign', 'play', 'coop', 'armoury', 'options', 'scores', 'help', 'credits']) await expect(page.locator(`button[data-a="${a}"]`)).toBeVisible();
  expect(await page.evaluate(() => (window as any).__fondue.lobby.visible)).toBe(false);
  await page.click('button[data-a="play"]');
  await page.click('#startEndless');
  await waitPhase(page, 'battle');
});

test('endless: a day, its results, the market at the keep, the next day, and the new weapon fires', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=11');
  expect((await gameState(page))!.dayT).toBeLessThan(5);
  await page.evaluate(`${sim('gold')} = 5000; ${sim('offerings')} = 40;`);
  await endDay(page);
  await waitPhase(page, 'intermission');
  await page.waitForSelector('#toShop');
  await expect(headline(page)).toHaveText('Day 1 results');
  await page.screenshot({ path: 'docs/screenshots/results.png' });
  await page.click('#toShop');
  await waitScreen(page, 'shop');
  await expect(page.locator('#marketHint')).toBeVisible();
  await page.evaluate(() => (window as any).__fondue.scene.tapMarketSpot('slot:0'));
  await expect(page.locator('#marketWindow')).toHaveAttribute('data-slot', '0');
  await page.click('button[data-buy="weapon:0:wheel"]');
  await waitFor(() => page.evaluate(() => (window as any).__fondue.session.meta().loadout.slotWeapon[0]), (w) => w === 'wheel', 5000);
  await page.screenshot({ path: 'docs/screenshots/market.png' });
  await page.click('#ready');
  await waitFor(() => gameState(page), (s) => s?.day === 2 && s.phase === 'banner', GAME_WAIT);
  await waitPhase(page, 'battle');

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
});

test('endless: the gate falls, the run ends with its score, scores and back, then play again', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=12');
  await page.evaluate(`${sim('gateHp')} = 1; window.__fondue.session.sim.spawnEnemy('grunt', 220);`);
  await waitPhase(page, 'defeat');
  await page.screenshot({ path: 'docs/screenshots/defeat.png' });
  await page.waitForSelector('#restart', { timeout: GAME_WAIT });
  await expect(headline(page)).toHaveText('The gate has fallen');
  await expect(page.locator('#finalScore')).toHaveText(/^\d+$/);
  await page.screenshot({ path: 'docs/screenshots/gameover.png' });
  await page.click('button[data-a="scores2"]');
  await expect(page.locator('table.scores tbody tr')).toHaveCount(1);
  await expect(page.locator('table.scores tbody')).toContainText('Player');
  await page.click('button[data-a="backGameOver"]');
  await expect(page.locator('#restart')).toBeVisible();
  await page.click('#restart');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle' && s.day === 1 && s.gateHp === s.gateMax, GAME_WAIT);
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
  const json = await page.locator('#tuning textarea').inputValue();
  expect(JSON.parse(json).gravity).toBe(2000);
  await page.click('#tuning button[data-preset="Arcade"]');
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().tuning.knockOthers)).toBe(true);
  await page.locator('#tuning textarea').fill(JSON.stringify({ gravity: 3100 }));
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

test('developer menu: jump to a level and day; a developer win pays no cheese and unlocks nothing', async ({ page }) => {
  await page.goto('/?menu=1');
  await waitForGame(page);
  await station(page, 'options');
  await page.click('#devMenuButton');
  await expect(page.locator('#tuning')).toBeVisible();
  await page.click('#devStars');
  expect(await page.evaluate(() => (window as any).__fondue.profile.data.wallet.cheese)).toBe(50);
  // The last day of level 3: winning it wins the level.
  const lastDay = levelOf(DEFAULT_WORLD, 3)!.days.length;
  expect(lastDay).toBeGreaterThan(1);
  await page.fill('#devLevel', '3');
  await page.fill('#devDay', String(lastDay));
  await page.click('#devJump');
  const s = await waitPhase(page, ['banner', 'battle']);
  expect(s!.mode).toBe('campaign');
  expect(s!.level).toBe(3);
  expect(s!.day).toBe(lastDay);
  expect(await page.evaluate(() => (window as any).__fondue.session.meta().devRun)).toBe(true);
  await waitPhase(page, 'battle');
  await endDay(page);
  // The end of the day plays in game time.
  await waitGame(page, () => screenOf(page), (sc) => sc === 'won', 20);
  await expect(page.locator('.panel')).toContainText('Developer run: no cheese.');
  await expect(page.locator('#unlocks')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__fondue.profile.data.wallet.cheese)).toBe(50);
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
  await waitFor(() => gameState(page), (s) => s?.day === 10, GAME_WAIT);
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
