import { expect, test, type Page } from '@playwright/test';
import { DEVICES, endLevel, gameState, openGame, station, waitForGame, waitPhase, waitScreen } from './helpers';

/**
 * The win screen fits every format without scrolling (G2): the King's lines, the five cheese, the
 * gold kept, the unlocks and the story are all in sight, and Continue is always on screen.
 * Level 1 (the King explains cheese and gold) and level 2 (the Slow slot opens) say the most.
 */

const SHOTS = 'docs/screenshots/v0.3';

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
  test(`${d.name}: the win screens of level 1 and level 2 fit without scrolling`, async ({ browser }) => {
    test.setTimeout(process.env.CI ? 420_000 : 180_000);
    const { context, page, errors } = await openGame(browser, d);

    await winLevel(page, 1);
    await expect(page.locator('#cheeseList li')).toHaveCount(5);
    await expectFits(page);
    await toastsGone(page);
    await page.screenshot({ path: `${SHOTS}/won-level1-${d.name}.png` });

    // Back to the hall (the first win may lead into the shop), then level 2 opens the Slow slot.
    await page.evaluate(() => { const a = (window as any).__fondue; a.profile.markLevelDone(a.world, 1); a.profile.flushSync(); });
    await page.reload();
    await waitForGame(page);
    await winLevel(page, 2);
    await expect(page.locator('#kingSays')).toContainText('This is your Slow slot.');
    await expect(page.locator('#unlocks li').first()).toBeVisible();
    await expect(page.locator('#continue')).toBeVisible();
    await expectFits(page);
    await toastsGone(page);
    await page.screenshot({ path: `${SHOTS}/won-${d.name}.png` });

    expect(errors).toEqual([]);
    await context.close();
  });
}
