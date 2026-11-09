import { expect, test } from '@playwright/test';

/** Run with TUNNEL_URL=https://....trycloudflare.com to check plan B over a real tunnel. */
test('co-op over a real cloudflared tunnel', async ({ browser, browserName }) => {
  const url = process.env.TUNNEL_URL;
  test.skip(!url || browserName !== 'chromium', 'needs TUNNEL_URL');
  const q = `relay=${encodeURIComponent(url!)}`;
  const a = await browser.newContext();
  const b = await browser.newContext();
  const host = await a.newPage();
  const guest = await b.newPage();
  await host.goto(`./?${q}`);
  await host.waitForSelector('.overlay .panel', { timeout: 60_000 });
  await host.click('button[data-a="play"]');
  await host.fill('#name', 'Tim');
  await host.click('button[data-a="openRoom"]');
  await expect(host.locator('#status')).toContainText('Waiting', { timeout: 30_000 });
  const code = await host.locator('#roomCode').innerText();
  await guest.goto(`./?${q}&join=${code}`);
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
