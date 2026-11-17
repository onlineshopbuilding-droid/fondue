import { expect, test, type Page } from '@playwright/test';
import { CASTLE_TIERS } from '../../src/config/keep';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { CASTLE_BUILD } from '../../src/config/tutorial';
import { CASTLE_BUILT_LINES, SLOT_INTROS } from '../../src/config/worlds/fondue/story';
import { DEVICES, openGame, waitForLobby, waitScreen, type Device } from './helpers';

/**
 * Building a castle tier in the Keep Shop (v0.4, A4, A5, A1) on the three devices: the castle is the
 * shop's main goal with its tier and name; a locked tier says in one sentence what is missing (a won
 * level, or gold); buying tier 2 lets the keep rise for a moment, then King Fridolin speaks, the new
 * Slow slot is marked and introduced. Screenshots land in docs/screenshots/v0.4/.
 */

const SHOTS = 'docs/screenshots/v0.4';
// The dev server reloads the page whenever a source file changes; with parallel work in the checkout
// that can hit a run midway ("execution context was destroyed"). A retry starts the test over cleanly.
test.describe.configure({ retries: 2 });
const SLOW = 1;

/** A profile with these campaign levels won and this much gold; tutorial and first-upgrade guide done. */
async function grant(page: Page, levels: number, gold: number) {
  await page.evaluate(([n, g]) => {
    const a = (window as any).__fondue;
    for (let l = 1; l <= n; l++) a.profile.markLevelDone(a.world, l);
    a.profile.edit((d: any) => {
      d.wallet.gold = g;
      d.seen.tutorial = true;
      if (!d.seen.tips.includes('firstUpgrade')) d.seen.tips.push('firstUpgrade');
    });
    a.profile.flushSync();
  }, [levels, gold] as const);
  await page.reload();
  await waitForLobby(page);
}

/** Opens the Keep Shop on a spot (the lobby's stations are tested in the lobby specs). */
async function openShop(page: Page, spot = 'slot0') {
  await page.evaluate((s) => (window as any).__fondue.show('armoury', s), spot);
  await waitScreen(page, 'armoury');
}

const tap = (page: Page, d: Device, sel: string) => (d.touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const keep = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((window as any).__fondue.profile.data.keep)));

for (const d of DEVICES) {
  test(`${d.name}: castle tier 2 is built: the keep rises, the King speaks and the Slow slot is introduced`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    const price = CASTLE_TIERS[1]!.gold;
    await grant(page, CASTLE_TIER_LEVEL[1]!, price + 100);
    await openShop(page);

    // The castle is the main goal on top of the panel: tier and name, the next tier and its build button.
    const goal = page.locator('#castleGoal');
    await expect(goal).toContainText(`Castle tier 1 · ${CASTLE_TIERS[0]!.name}`);
    await expect(goal).toContainText(CASTLE_TIERS[1]!.name);
    await expect(goal).toHaveClass(/ready/);
    const build = page.locator('#castleGoalBuy');
    await expect(build).toBeEnabled();
    const box = (await build.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('#spot-slot1')).toHaveClass(/locked/);
    await page.screenshot({ path: `${SHOTS}/shop-castle-${d.name}.png` });

    // Build it: the keep rises (the King waits), and the shop does not hang. For the photo only, the
    // test stretches the rise's own timer (the page's timer of CASTLE_BUILD.ms) and freezes its CSS
    // animation at a lively moment, so a slow test machine does not miss it; the game is unchanged.
    await page.evaluate(([ms, stretched]) => {
      const w = window as any;
      const orig = w.setTimeout.bind(w);
      w.setTimeout = (fn: any, delay?: number, ...rest: any[]) => orig(fn, delay === ms ? stretched : delay, ...rest);
    }, [CASTLE_BUILD.ms, CASTLE_BUILD.ms + 5000] as const);
    await tap(page, d, '#castleGoalBuy');
    const rising = await page.evaluate(() => ({
      rise: document.querySelector('#castleBuild')?.textContent ?? null,
      king: !!document.querySelector('#castleNews'),
    }));
    expect(rising.rise, 'the keep rises').toContain(CASTLE_TIERS[1]!.name);
    expect(rising.king, 'the King waits for the rise').toBe(false);
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        const el = (a.effect as KeyframeEffect | null)?.target ?? null;
        if (el && el.closest('#shopKeep')) { a.pause(); a.currentTime = 450; }
      }
    });
    await page.screenshot({ path: `${SHOTS}/castle-upgrade-${d.name}.png` });
    await page.evaluate(() => { for (const a of document.getAnimations()) if (a.playState === 'paused') a.play(); });
    expect((await keep(page)).castleTier).toBe(2);

    // On its own after a moment: the King's line, then the Slow slot's introduction; the slot is marked.
    await expect(page.locator('#castleBuild')).toHaveCount(0, { timeout: CASTLE_BUILD.ms + 10_000 });
    // The King's picture is there beside his words (decoded during the rise, no empty space).
    await expect.poll(() => page.evaluate(() => {
      const img = document.querySelector('#castleNews img') as HTMLImageElement | null;
      return !!img && img.complete && img.naturalWidth > 0;
    })).toBe(true);
    const news = page.locator('#castleNews');
    await expect(news).toContainText(CASTLE_BUILT_LINES[2]!);
    await expect(news).toContainText(SLOT_INTROS[SLOW]!);
    const lines = await news.locator('.king-bubble > div').allInnerTexts();
    expect(lines).toEqual([CASTLE_BUILT_LINES[2], SLOT_INTROS[SLOW]]);
    await expect(page.locator(`#spot-slot${SLOW}`)).toHaveClass(/fresh/);
    await expect(page.locator(`#spot-slot${SLOW}`)).not.toHaveClass(/locked/);
    expect(await page.evaluate(() => (window as any).__fondue.profile.data.seen.slotIntros as number[])).toContain(SLOW);
    await expect(page.locator('#walletGold')).toHaveText('100');
    await page.screenshot({ path: `${SHOTS}/castle-upgrade-king-${d.name}.png` });

    // The introduction comes once: back in the shop later, the King says nothing more about it.
    await tap(page, d, '#shop [data-a="main"]');
    await openShop(page);
    await expect(page.locator('#castleNews')).toHaveCount(0);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${d.name}: a locked castle tier says what is missing; a tap skips the rise`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    const price = CASTLE_TIERS[1]!.gold;
    // One level short of tier 2: the won level is missing.
    await grant(page, CASTLE_TIER_LEVEL[1]! - 1, price * 2);
    await openShop(page, 'castle');
    await expect(page.locator('#shopSide')).toContainText(`Win level ${CASTLE_TIER_LEVEL[1]} to build this`);
    await expect(page.locator('#shopSide button[data-a="buy"]')).toBeDisabled();
    await tap(page, d, '#spot-slot1');
    await expect(page.locator('#shopSide')).toContainText(`opens with castle tier 2 (${CASTLE_TIERS[1]!.name})`);
    await expect(page.locator('#castleGoalWhy')).toHaveText(`Win level ${CASTLE_TIER_LEVEL[1]} to build this.`);

    // The level is won but gold is short: how much more, and how far along.
    await page.evaluate(([l, g]) => {
      const a = (window as any).__fondue;
      a.profile.markLevelDone(a.world, l);
      a.profile.edit((dd: any) => { dd.wallet.gold = g; });
      a.profile.flushSync();
    }, [CASTLE_TIER_LEVEL[1]!, price - 150] as const);
    await openShop(page, 'slot0');
    await expect(page.locator('#castleGoalWhy')).toHaveText('You need 150 more gold.');
    await expect(page.locator('#castleGoalBar')).toContainText(`Gold ${(price - 150).toLocaleString('en-US')} / ${price.toLocaleString('en-US')}`);
    await tap(page, d, '#spot-castle');
    await expect(page.locator('#shopSide .sh-why')).toHaveText('You need 150 more gold.');

    // With the gold there, a tap on the rising keep goes straight on to the King.
    await page.evaluate((g) => {
      const a = (window as any).__fondue;
      a.profile.edit((dd: any) => { dd.wallet.gold = g; });
      a.profile.flushSync();
    }, price);
    await openShop(page, 'castle');
    // Buy and tap the rising keep in one go: a slow test machine must not let the rise end on its own first.
    const skipped = await page.evaluate(() => {
      (document.querySelector('#shopSide button[data-a="buy"]') as HTMLElement).click();
      const rise = document.querySelector('#castleBuild') as HTMLElement | null;
      if (!rise) return 'no rise';
      rise.click();
      return document.querySelector('#castleBuild') ? 'still rising' : 'skipped';
    });
    expect(skipped).toBe('skipped');
    await expect(page.locator('#castleNews')).toContainText(SLOT_INTROS[SLOW]!);
    // The next tier needs its own won level.
    await expect(page.locator('#shopSide')).toContainText(`Win level ${CASTLE_TIER_LEVEL[2]} to build this`);
    expect(errors).toEqual([]);
    await context.close();
  });
}
