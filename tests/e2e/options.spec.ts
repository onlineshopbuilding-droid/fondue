import { expect, test, type Page } from '@playwright/test';
import { GAME_VERSION } from '../../src/config/game';
import { VERSIONS, versionUrl } from '../../src/config/versions';
import { DEVICES, openGame, station } from './helpers';

/**
 * v0.4 B6, V1, V3: the Options open from the cog with the tabs Settings, Scores, Help, Credits and
 * Versions in this order; every tab shows its content, "v0.4" is on show, the Back button stays at the
 * same place on every tab, tap targets are at least 44 CSS px and no tab, link or button text is cut
 * off on the laptop, the iPhone 16 and the OnePlus 8T (both in landscape).
 */

const TABS: [string, string][] = [['settings', 'Settings'], ['scores', 'Scores'], ['help', 'Help'], ['credits', 'Credits'], ['versions', 'Versions']];

/** Every given element is at least 44 px in both directions, inside the window and its text not clipped. */
async function checkTargets(page: Page, selector: string) {
  const boxes = await page.locator(selector).evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    return { text: (el.textContent ?? '').trim().replace(/\s+/g, ' '), w: r.width, h: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom,
      clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 };
  }));
  const vw = page.viewportSize()!.width;
  const vh = page.viewportSize()!.height;
  expect(boxes.length, selector).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.h, `${b.text} is tall enough`).toBeGreaterThanOrEqual(44);
    expect(b.w, `${b.text} is wide enough`).toBeGreaterThanOrEqual(44);
    expect(b.clipped, `${b.text} shows its whole text`).toBe(false);
    expect(b.x, `${b.text} inside the window`).toBeGreaterThanOrEqual(0);
    expect(b.y, `${b.text} inside the window`).toBeGreaterThanOrEqual(0);
    expect(b.right, `${b.text} inside the window`).toBeLessThanOrEqual(vw);
    expect(b.bottom, `${b.text} inside the window`).toBeLessThanOrEqual(vh);
  }
}

const press = async (page: Page, selector: string, touch: boolean) => {
  if (touch) await page.locator(selector).tap();
  else await page.locator(selector).click();
};

for (const d of DEVICES) {
  test(`${d.name}: Options have the tabs Settings, Scores, Help, Credits, Versions with their content`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d);
    await station(page, 'options');
    await expect(page.locator('.panel.options h2')).toHaveText('Options');
    await expect(page.locator('#optVersion')).toHaveText(`v${GAME_VERSION}`);
    await expect(page.locator('#optVersion')).toBeVisible();
    expect(GAME_VERSION).toBe('0.4');

    // The tabs, in this order, Settings open first.
    const tabs = page.locator('.opt-tabs [data-a="optTab"]');
    expect(await tabs.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.tab))).toEqual(TABS.map(([id]) => id));
    await expect(tabs).toHaveText(TABS.map(([, label]) => label));
    await expect(page.locator('#optTab-settings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#devMenuButton')).toBeVisible();
    await checkTargets(page, '.opt-tabs [data-a="optTab"], .panel.options > .navrow button');
    const back = page.locator('.panel.options > .navrow .nav-back button');
    await expect(back).toHaveText('Back');
    const backAt = (await back.boundingBox())!;

    for (const [id] of TABS) {
      await press(page, `#optTab-${id}`, d.touch);
      await expect(page.locator(`#optTab-${id}`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`#optBody-${id}`)).toBeVisible();
      // The bottom line does not move between tabs.
      const at = (await back.boundingBox())!;
      expect(Math.abs(at.x - backAt.x) + Math.abs(at.y - backAt.y), `Back stays put on ${id}`).toBeLessThanOrEqual(1);
      await checkTargets(page, '.opt-tabs [data-a="optTab"], .panel.options > .navrow button');
      switch (id) {
        case 'settings': await expect(page.locator('#versionLabel').last()).toContainText(`v${GAME_VERSION} · build`); break;
        case 'scores': await expect(page.locator('#optBody-scores table.scores')).toBeVisible(); break;
        case 'help': {
          const dots = page.locator('#optBody-help .dots');
          await expect(dots).toHaveText(/^1 \/ \d+$/);
          await press(page, '#optHelpNext', d.touch);
          await expect(dots).toHaveText(/^2 \/ \d+$/);
          await press(page, '#optHelpPrev', d.touch);
          await expect(dots).toHaveText(/^1 \/ \d+$/);
          await checkTargets(page, '#optHelpPrev, #optHelpNext');
          break;
        }
        case 'credits': expect((await page.locator('#optBody-credits').innerText()).trim().length).toBeGreaterThan(20); break;
        case 'versions': {
          const rows = page.locator('#versionList li');
          await expect(rows).toHaveCount(VERSIONS.length);
          await expect(page.locator('#versionsNote')).toContainText('own save');
          const links = await page.locator('#versionList a').evaluateAll((els) => els.map((e) => ({ href: (e as HTMLAnchorElement).href, text: (e.textContent ?? '').replace(/\s+/g, ' ').trim() })));
          expect(links.map((l) => l.href)).toEqual(VERSIONS.map((v) => versionUrl(v)));
          expect(links[0].text).toContain(`v${GAME_VERSION}`);
          expect(links[0].text).toContain('this one');
          expect(links.map((l) => l.text.split(' ')[0])).toEqual(['v0.4', 'v0.3', 'v0.2', 'v0.1']);
          await checkTargets(page, '#versionList a');
          await page.screenshot({ path: `docs/screenshots/v0.4/options-versions-${d.name}.png` });
          break;
        }
      }
    }

    // Back leaves the Options; the next visit opens on Settings again.
    await press(page, '.panel.options > .navrow .nav-back button', d.touch);
    await expect(page.locator('.panel.options')).toHaveCount(0);
    await station(page, 'options');
    await expect(page.locator('#optTab-settings')).toHaveAttribute('aria-selected', 'true');
    expect(errors).toEqual([]);
    await context.close();
  });
}
