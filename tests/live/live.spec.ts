import { expect, test } from '@playwright/test';

test('published game loads and a day starts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
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
