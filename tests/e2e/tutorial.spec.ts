import { expect, test, type Page } from '@playwright/test';
import { ENEMIES, type EnemyType } from '../../src/config/enemies';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import { GUIDE } from '../../src/render/tutorialGuide';
import { DEVICES, GAME_WAIT, endLevel, gameState, openGame, pointer, station, waitFor, waitPhase, waitScreen, type Device } from './helpers';

/**
 * The first minutes of a new player (D4, C2, C4) on the three devices: the prelude teaches the throw
 * and the Rolling Wheel, level 1 follows, the King explains cheese and gold and leads into the shop,
 * where the first upgrade is bought; winning level 2 opens the Slow slot and the King introduces it.
 */

const SHOTS = 'docs/screenshots/v0.3';
const stage = (page: Page) => page.evaluate(() => (window as any).__fondue.scene.tutorialStage() as string);
const mode = (page: Page) => page.evaluate(() => (window as any).__fondue.session?.meta()?.rules.mode as string | undefined);

/** The gold a level pays when every raider in it is beaten by the player. */
function levelGold(level: number): number {
  let gold = 0;
  for (const w of levelOf(DEFAULT_WORLD, level)!.waves) for (const [t, n] of Object.entries(w.counts)) gold += ENEMIES[t as EnemyType].gold * (n ?? 0);
  return gold;
}

async function tapCss(page: Page, d: Device, at: { x: number; y: number }) {
  if (d.touch) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
}

/** Taps a button of the HTML screens with a finger or the mouse. */
async function press(page: Page, d: Device, selector: string) {
  const el = page.locator(selector);
  await expect(el).toBeVisible();
  if (d.touch) await el.tap();
  else await el.click();
}

for (const d of DEVICES) {
  test(`${d.name}: a fresh profile plays the prelude, level 1 and the first upgrade, then meets the Slow slot`, async ({ browser }) => {
    test.setTimeout(process.env.CI ? 600_000 : 240_000);
    // No ?menu: a new player lands in the prelude, not in a menu.
    const { context, page, errors } = await openGame(browser, d, '?seed=3');
    await waitFor(() => mode(page), (m) => m === 'tutorial', GAME_WAIT);

    // From the first second the Rolling Wheel stands in the damage slot (C4).
    const keep = await page.evaluate(() => (window as any).__fondue.session.meta().loadout.slotWeapon as (string | null)[]);
    expect(keep).toEqual(['wheel', null, null, null, null]);

    // The King speaks, the picture freezes on one raider, and the player grabs and flings it.
    await waitFor(() => stage(page), (s) => s === 'show', GAME_WAIT * 2);
    await page.screenshot({ path: `${SHOTS}/tutorial-gesture-${d.name}.png` });
    const fieldW = await page.evaluate(() => (window as any).__fondue.session.sim.fieldW as number);
    const target = (await gameState(page))!.enemies
      .filter((e: any) => (e.st === 'walk' || e.st === 'attack') && e.x >= GUIDE.targetMinX && e.x <= fieldW - GUIDE.targetInsetRight)
      .sort((a: any, b: any) => a.x - b.x)[0];
    expect(target, 'a raider to show the gesture on').toBeTruthy();
    const p = await pointer(page, d.touch);
    await p.down(target.x - 4, target.y - 44);
    await waitFor(() => stage(page), (st) => st === 'try', 5000);
    await p.glide(target.x - 4, target.y - 44, target.x - 30, 80, 8, 12);
    await p.up();
    await waitFor(() => stage(page), (st) => st === 'praise', 8000);

    // Then the King shows the wheel with a pointer, and a tap on it rolls it.
    await waitFor(() => stage(page), (st) => st === 'wheel', GAME_WAIT);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/tutorial-wheel-${d.name}.png` });
    const wheelAt = await page.evaluate(() => (window as any).__fondue.scene.slotCss(0) as { x: number; y: number });
    await tapCss(page, d, wheelAt);
    await waitFor(() => stage(page), (st) => st === 'wheelDone' || st === '', 8000);
    expect(await page.evaluate(() => (window as any).__fondue.session.sim.s.stats.weaponShots.wheel ?? 0)).toBeGreaterThanOrEqual(1);

    // The prelude ends, and level 1 follows at once; the wheel is now owned for good.
    await endLevel(page);
    await waitFor(() => mode(page), (m) => m === 'campaign', GAME_WAIT);
    const owned = await page.evaluate(() => { const d = (window as any).__fondue.profile.data; return { weapons: Object.keys(d.keep.weapons), loadout: d.keep.loadout, done: d.seen.tutorial }; });
    expect(owned).toEqual({ weapons: ['wheel'], loadout: ['wheel', null, null, null, null], done: true });
    await waitPhase(page, ['banner', 'battle']);
    expect((await gameState(page))!.level).toBe(1);

    // Level 1 is won with all its raiders beaten (their gold stands in for the fight).
    await page.evaluate((g) => { (window as any).__fondue.session.sim.s.stats.goldEarned = g; }, levelGold(1));
    await endLevel(page);
    await waitScreen(page, 'won');
    // The King explains cheese and gold and leads into the shop.
    await expect(page.locator('#kingSays')).toContainText('five cheese');
    await expect(page.locator('#kingSays')).toContainText('Gold');
    await expect(page.locator('#continue')).toHaveText('To the Keep Shop');
    // The short tips of the level start fade on their own (the level was won in a moment here).
    await expect(page.locator('.toast')).toHaveCount(0, { timeout: 10_000 });
    await page.screenshot({ path: `${SHOTS}/tutorial-won-${d.name}.png` });
    await press(page, d, '#continue');
    await waitScreen(page, 'armoury');

    // In the shop the damage slot is open, the King says what to do and the upgrade button glows.
    await expect(page.locator('#shopGuide')).toContainText('tier 2');
    await expect(page.locator('#spot-slot0')).toHaveAttribute('data-guide', '1');
    await expect(page.locator('#guideBuy')).toBeEnabled();
    await page.locator('#guideBuy').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/tutorial-shop-${d.name}.png` });
    await press(page, d, '#guideBuy');
    await expect(page.locator('#shopGuide')).toContainText('Splendid');
    expect(await page.evaluate(() => (window as any).__fondue.profile.weaponTier('wheel'))).toBe(2);
    expect(await page.evaluate(() => (window as any).__fondue.profile.data.seen.tips.includes('firstUpgrade'))).toBe(true);
    await page.screenshot({ path: `${SHOTS}/tutorial-upgraded-${d.name}.png` });

    // Level 2 won: the Slow slot opens, and the King introduces it on the win screen (C2).
    await press(page, d, '#shop [data-a="main"]');
    await station(page, 'campaign');
    await press(page, d, '.cm-st[data-level="2"]');
    await press(page, d, '#playLevel');
    await waitPhase(page, ['banner', 'battle']);
    expect((await gameState(page))!.level).toBe(2);
    await endLevel(page);
    await waitScreen(page, 'won');
    await expect(page.locator('#kingSays')).toContainText('This is your Slow slot.');
    await expect(page.locator('#continue')).toHaveText('Continue');
    expect(await page.evaluate(() => (window as any).__fondue.profile.data.seen.slotIntros as number[])).toEqual([1]);
    await page.screenshot({ path: `${SHOTS}/slot-intro-${d.name}.png` });
    expect(errors).toEqual([]);
    await context.close();
  });
}
