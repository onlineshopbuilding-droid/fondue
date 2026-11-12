import { expect, test, type Page } from '@playwright/test';
import { station, waitForGame, waitPhase } from '../e2e/helpers';

/**
 * Checks of the published site. Without LIVE_URL they run against the game; with LIVE_URL ending
 * in /classic/ they run against the kept old version, which has its old menu.
 */
const CLASSIC = (process.env.LIVE_URL ?? '').includes('/classic/');

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
};

test.describe('the game', () => {
  test.skip(CLASSIC, 'the old version has its own checks below');

  test('a first start leads into the tutorial with the King', async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto('./?seed=5');
    await waitForGame(page);
    await page.waitForFunction(() => (window as any).__fondue.session?.meta?.()?.rules.mode === 'tutorial', null, { timeout: 60_000 });
    await page.waitForFunction(() => ((window as any).__fondue.scene.tutorialStage() as string) !== '', null, { timeout: 60_000 });
    expect(errors).toEqual([]);
  });

  test('the hall inside the keep opens and an endless day starts', async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto('./?menu=1&seed=5');
    await waitForGame(page);
    await station(page, 'play');
    // The new game: endless and the campaign are both on offer.
    await expect(page.locator('#startEndless')).toBeVisible();
    await page.click('#startEndless');
    await waitPhase(page, 'battle');
    await page.waitForFunction(() => (window as any).__fondue.session.view()?.enemies.length > 0, null, { timeout: 60_000 });
    expect(errors).toEqual([]);
  });

  test('a real co-op connection over the public PeerJS service works', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'one browser is enough for the network path');
    const a = await browser.newContext();
    const b = await browser.newContext();
    const host = await a.newPage();
    const guest = await b.newPage();
    await host.goto('./?menu=1');
    await waitForGame(host);
    await station(host, 'coop');
    await host.fill('#name', 'Tim');
    await host.click('button[data-a="openRoom"]');
    await expect(host.locator('#status')).toContainText('Waiting', { timeout: 30_000 });
    const code = await host.locator('#roomCode').innerText();
    await guest.goto(`./?menu=1&join=${code}`);
    await waitForGame(guest);
    await guest.fill('#name', 'Lenny');
    await guest.click('#doJoin');
    await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 30_000 });
    await host.click('#startCoop');
    await guest.waitForFunction(() => ['banner', 'battle'].includes((window as any).__fondue.session?.view?.()?.phase), null, { timeout: 60_000 });
    await guest.mouse.move(640, 300);
    await host.waitForFunction(() => (window as any).__fondue.session.view().hands[1].x > 0, null, { timeout: 20_000 });
    await a.close();
    await b.close();
  });

  test('the developer overview is published next to the game', async ({ page }) => {
    await page.goto('./dev/');
    await expect(page).toHaveTitle(/Entwickler-Übersicht/);
    await expect(page.locator('body')).toContainText('D-01');
  });
});

test.describe('the kept old version', () => {
  test.skip(!CLASSIC, 'only with LIVE_URL pointing at /classic/');

  test('published game loads and a day starts', async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto('./?seed=5');
    await page.waitForSelector('.overlay .panel', { timeout: 60_000 });
    await expect(page.locator('.version')).toContainText('build');
    await page.click('button[data-a="play"]');
    await page.click('button[data-a="solo"]');
    await page.waitForFunction(() => (window as any).__fondue.session.view()?.phase === 'battle', null, { timeout: 30_000 });
    await page.waitForFunction(() => (window as any).__fondue.session.view()?.enemies.length > 0, null, { timeout: 30_000 });
    expect(errors).toEqual([]);
  });

  test('a real co-op connection over the public PeerJS service works', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'one browser is enough for the network path');
    const a = await browser.newContext();
    const b = await browser.newContext();
    const host = await a.newPage();
    const guest = await b.newPage();
    await host.goto('./');
    await host.waitForSelector('.overlay .panel', { timeout: 60_000 });
    await host.click('button[data-a="play"]');
    await host.fill('#name', 'Tim');
    await host.click('button[data-a="openRoom"]');
    await expect(host.locator('#status')).toContainText('Waiting', { timeout: 30_000 });
    const code = await host.locator('#roomCode').innerText();
    await guest.goto(`./?join=${code}`);
    await guest.waitForSelector('#code', { timeout: 60_000 });
    await guest.fill('#name', 'Lenny');
    await guest.click('button[data-a="doJoin"]');
    await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 30_000 });
    await host.click('#startCoop');
    await guest.waitForFunction(() => (window as any).__fondue.session?.view?.()?.phase === 'battle', null, { timeout: 30_000 });
    await guest.mouse.move(640, 300);
    await host.waitForFunction(() => Math.abs((window as any).__fondue.session.view().hands[1].x - 640) < 5, null, { timeout: 10_000 });
    await a.close();
    await b.close();
  });
});
