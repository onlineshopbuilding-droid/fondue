import { expect, test } from '@playwright/test';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { STORYBOOK } from '../../src/config/worlds/fondue/story';
import { DEVICES, openGame, setCastleTier, station } from './helpers';

/**
 * v0.4: the storybook left the hall. A small book in the corner of the campaign map opens it; it is
 * quiet but a full 44 px to tap and stays clear of Back. The map also shows the castle tier next to
 * the campaign progress and marks the levels whose win lets the next castle tier be built.
 */

const SHOTS = 'docs/screenshots/v0.4';

for (const d of DEVICES) {
  test(`${d.name}: the book on the campaign map opens the storybook; castle tier and its levels are on the map`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d);
    // Seven levels won and castle tier 2 built: two storybook pages are open beyond the first ones.
    await page.evaluate(() => {
      const a = (window as any).__fondue;
      for (let l = 1; l <= 7; l++) a.profile.markLevelDone(a.world, l);
      a.profile.flushSync();
    });
    await setCastleTier(page, 2);
    await station(page, 'campaign');

    // Castle tier with name and number next to the progress.
    await expect(page.locator('#campaignCastle')).toContainText('Castle tier 2');
    await expect(page.locator('#campaignCastle')).toContainText('Iron-Bound Gate');

    // Every level that makes a castle tier buildable carries the mark, from the configuration.
    for (let tier = 2; tier <= CASTLE_TIER_LEVEL.length; tier++) {
      const level = CASTLE_TIER_LEVEL[tier - 1];
      await expect(page.locator(`.cm-st[data-level="${level}"] .cm-castle`)).toHaveAttribute('data-tier', String(tier));
    }
    await expect(page.locator('.cm-castle')).toHaveCount(CASTLE_TIER_LEVEL.length - 1);
    const next = CASTLE_TIER_LEVEL[2];
    await page.click(`.cm-st[data-level="${next}"]`, { force: true });
    await expect(page.locator('#cardCastle')).toContainText(`Castle tier 3 can be built`);
    await page.click('#closeCard');

    // The book: in the head, at least 44 px, not on top of Back.
    const book = page.locator('#openStorybook');
    const b = (await book.boundingBox())!;
    const back = (await page.locator('.cm-head-back button').boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.x >= back.x + back.width || b.x + b.width <= back.x).toBe(true);
    expect(b.x + b.width).toBeLessThanOrEqual(d.width);
    await page.screenshot({ path: `${SHOTS}/campaign-map-${d.name}.png` });

    await book.click();
    const win = page.locator('.storybook-veil .storybook');
    await expect(win).toBeVisible();
    const open = STORYBOOK.filter((p) => p.unlockLevel <= 7);
    await expect(win.locator('.sb-title')).toHaveText(open[open.length - 1].title);
    await expect(win.locator('.sb-count')).toHaveText(`Page ${open.length} of ${open.length}`);
    await win.locator('[data-sb="prev"]').click();
    await expect(win.locator('.sb-title')).toHaveText(open[open.length - 2].title);
    await page.screenshot({ path: `${SHOTS}/storybook-${d.name}.png` });
    await win.locator('[data-sb="close"]').click();
    await expect(page.locator('.storybook-veil')).toHaveCount(0);
    // The map is still there and usable.
    await expect(page.locator('#campaignMap')).toBeVisible();

    expect(errors).toEqual([]);
    await context.close();
  });
}
