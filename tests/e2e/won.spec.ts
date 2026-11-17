import { expect, test, type Page } from '@playwright/test';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { CASTLE_READY_LINES } from '../../src/config/worlds/fondue/story';
import { DEVICES, endLevel, gameState, openGame, station, waitForGame, waitPhase, waitScreen } from './helpers';

/**
 * The win screen fits every format without scrolling (G2): the King's lines, the five cheese, the
 * gold kept, the unlocks and the story are all in sight, and Continue is always on screen.
 * Level 1 (the King explains cheese and gold) and the level that lets castle tier 2 be built say the
 * most. Since v0.4 no slot is introduced here: that win shows the castle banner, the King's line and a
 * button straight into the Keep Shop (slots are introduced in the shop after the castle tier is built).
 */

const SHOTS = 'docs/screenshots/v0.4';
/** The level whose win lets castle tier 2 be built, from the configuration. */
const TIER2_LEVEL = CASTLE_TIER_LEVEL[1];

/** The battle's tip toasts of the level start still float when a test wins at once; a player never sees them here. */
const toastsGone = (page: Page) => page.waitForFunction(() => (document.querySelector('.toast-area')?.children.length ?? 0) === 0, null, { timeout: 20_000 });

/** How far each scrolling box of the win screen would scroll, and where Continue sits. */
const layout = (page: Page) => page.evaluate(() => {
  const panel = document.querySelector('.panel.won') as HTMLElement;
  const body = panel.querySelector('.won-body') as HTMLElement;
  const overlay = panel.parentElement as HTMLElement;
  const cont = (document.querySelector('#continue') as HTMLElement).getBoundingClientRect();
  const over = (el: HTMLElement) => el.scrollHeight - el.clientHeight;
  return {
    panel: over(panel), body: over(body), overlay: over(overlay),
    page: document.documentElement.scrollHeight - window.innerHeight,
    contTop: cont.top, contBottom: cont.bottom, contHeight: cont.height, height: window.innerHeight,
  };
});

async function winLevel(page: Page, level: number) {
  await station(page, 'campaign');
  await page.click(`.cm-st[data-level="${level}"]`);
  await page.click('#playLevel');
  await waitPhase(page, ['banner', 'battle']);
  expect((await gameState(page))!.level).toBe(level);
  await endLevel(page);
  await waitScreen(page, 'won');
}

async function expectFits(page: Page) {
  // The panel pops in with a short scale animation; measure it at its real size.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  const l = await layout(page);
  expect(l.panel, 'panel scrolls').toBeLessThanOrEqual(1);
  expect(l.body, 'win screen content scrolls').toBeLessThanOrEqual(1);
  expect(l.overlay, 'overlay scrolls').toBeLessThanOrEqual(1);
  expect(l.page, 'page scrolls').toBeLessThanOrEqual(1);
  expect(l.contTop).toBeGreaterThanOrEqual(0);
  expect(l.contBottom).toBeLessThanOrEqual(l.height);
  expect(l.contHeight).toBeGreaterThanOrEqual(44);
}

for (const d of DEVICES) {
  test(`${d.name}: the win screens of level 1 and of the castle tier 2 level fit without scrolling`, async ({ browser }) => {
    test.setTimeout(process.env.CI ? 420_000 : 180_000);
    const { context, page, errors } = await openGame(browser, d);

    await winLevel(page, 1);
    await expect(page.locator('#cheeseList li')).toHaveCount(5);
    // The way back on the left, the one main action on the right.
    await expect(page.locator('.won .nav-back #backToHall')).toHaveText('Back');
    await expect(page.locator('.won .nav-forward #continue')).toHaveText('To the Keep Shop');
    await expectFits(page);
    await toastsGone(page);
    await page.screenshot({ path: `${SHOTS}/won-level1-${d.name}.png` });

    // Back to the hall (the first win may lead into the shop), then the level that lets castle tier 2
    // be built: the castle banner, the King's line, no slot introduction, and a button into the shop.
    await page.evaluate((upTo) => { const a = (window as any).__fondue; for (let l = 1; l < upTo; l++) a.profile.markLevelDone(a.world, l); a.profile.flushSync(); }, TIER2_LEVEL);
    await page.reload();
    await waitForGame(page);
    await winLevel(page, TIER2_LEVEL);
    await expect(page.locator('#wonCastle')).toContainText('Castle tier 2 can be built');
    await expect(page.locator('#kingSays')).toContainText(CASTLE_READY_LINES[2]);
    await expect(page.locator('#kingSays')).not.toContainText('slot.');
    await expect(page.locator('#continue')).toBeVisible();
    await expect(page.locator('.won .nav-forward #toShop')).toHaveText('To the Keep Shop');
    await expect(page.locator('.won .nav-back #continue')).toHaveText('Back');
    await expectFits(page);
    await toastsGone(page);
    await page.screenshot({ path: `${SHOTS}/won-castle-tier2-${d.name}.png` });
    await page.click('#toShop');
    await waitScreen(page, 'armoury');

    expect(errors).toEqual([]);
    await context.close();
  });
}
