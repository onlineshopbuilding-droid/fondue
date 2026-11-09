import { expect, test, type Browser, type Page } from '@playwright/test';
import { drag, gameState, waitFor, waitForGame } from './helpers';

async function setupCoop(browser: Browser, query: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors: string[] = [];
  for (const p of [host, guest]) p.on('pageerror', (e) => errors.push(String(e)));

  await host.goto(`/?net=loopback${query}`);
  await waitForGame(host);
  await host.click('button[data-a="play"]');
  await host.fill('#name', 'Tim');
  await host.click('button[data-a="openRoom"]');
  await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
  const code = await host.locator('#roomCode').innerText();
  await waitFor(() => host.locator('#status').innerText(), (t) => t.includes('Waiting'));

  await guest.goto(`/?net=loopback&join=${code}${query}`);
  await waitForGame(guest);
  await guest.fill('#name', 'Lenny');
  await guest.click('button[data-a="doJoin"]');
  await expect(host.locator('#status')).toContainText('Lenny joined', { timeout: 10000 });
  await expect(guest.locator('#status')).toContainText('Waiting for the host', { timeout: 10000 });
  await expect(host.locator('#startCoop')).toBeEnabled();
  await host.click('#startCoop');
  await waitFor(() => gameState(guest), (s) => s?.phase === 'banner' || s?.phase === 'battle', 15000);
  return { host, guest, code, errors, context };
}

const skipDay = (host: Page) => host.evaluate(() => { (window as any).__fondue.session.sim.s.dayT = 49.9; });

async function grabAndFling(page: Page, target: any) {
  await drag(page, [target.x - 10, target.y - 44], [target.x - 60, 110], 10, 8);
}

const headline = (p: Page) => p.locator('.panel h2').innerText().catch(() => '');

for (const [label, query] of [['no added latency', ''], ['simulated latency', '&lat=45&jit=20&loss=0.02']] as const) {
  test(`co-op with two browsers, ${label}`, async ({ browser }) => {
    const { host, guest, errors, context } = await setupCoop(browser, query);

    // Both hands exist and each is visible on the other side.
    await waitFor(() => gameState(host), (s) => s?.phase === 'battle', 15000);
    await guest.mouse.move(700, 300);
    await waitFor(() => gameState(host), (s) => Math.abs(s!.hands[1].x - 700) < 5 && Math.abs(s!.hands[1].y - 300) < 5, 5000);
    await host.mouse.move(420, 200);
    await waitFor(() => gameState(guest), (s) => Math.abs(s!.hands[0].x - 420) < 5, 5000);
    await host.screenshot({ path: 'docs/screenshots/coop-host.png' });
    await guest.screenshot({ path: 'docs/screenshots/coop-guest.png' });

    // Host tuning applies to both.
    await host.evaluate(() => {
      const app = (window as any).__fondue;
      app.session.sim.setTuning({ ...app.session.sim.tuning, shake: 1.7 });
    });
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().tuning.shake), (v) => v === 1.7, 5000);

    // Each player kills one enemy; money is shared.
    const onScreen = (s: any) => s.enemies.filter((e: any) => e.x < 1100 && e.x > 300 && e.st === 'walk');
    let s = await waitFor(() => gameState(host), (v) => onScreen(v).length >= 2, 25000);
    await grabAndFling(host, onScreen(s)[0]);
    await waitFor(() => gameState(host), (v) => v!.gold >= 10, 6000);

    s = await waitFor(() => gameState(guest), (v) => onScreen(v).length >= 1, 25000);
    const before = (await gameState(host))!.gold;
    const target = onScreen(s).sort((a: any, b: any) => b.x - a.x)[0];
    // The guest sees its grab immediately, without waiting for the host.
    await guest.mouse.move(target.x - 10, target.y - 44);
    await guest.mouse.down();
    await guest.waitForTimeout(20);
    const instant = await guest.evaluate((id) => (window as any).__fondue.session.view().enemies.find((e: any) => e.id === id)?.heldBy, target.id);
    expect(instant).toEqual([1]);
    for (let i = 1; i <= 10; i++) {
      await guest.mouse.move(target.x - 10 - i * 5, target.y - 44 - i * 40);
      await guest.waitForTimeout(8);
    }
    await guest.mouse.up();
    await waitFor(() => gameState(host), (v) => v!.gold >= before + 10, 8000);
    const a = await gameState(host);
    await waitFor(() => gameState(guest), (v) => v!.gold >= a!.gold, 3000);

    // Shared pause.
    await guest.keyboard.press('p');
    await waitFor(() => headline(host), (t) => t === 'Paused', 5000);
    await expect(host.locator('.panel')).toContainText('Lenny');
    await host.click('button[data-a="resume"]');
    await guest.waitForSelector('.overlay', { state: 'detached', timeout: 5000 });

    // Shared market with Ready; a purchase is announced on both sides.
    await skipDay(host);
    await waitFor(() => gameState(host), (v) => v?.phase === 'intermission', 15000);
    await host.evaluate(() => { (window as any).__fondue.session.sim.s.gold = 2000; });
    await guest.waitForSelector('#toShop', { timeout: 8000 });
    await host.waitForSelector('#toShop', { timeout: 8000 });
    await host.click('#toShop');
    await guest.click('#toShop');
    await guest.locator('.tab', { hasText: 'Offerings' }).click();
    await guest.click('button[data-buy="cauldron"]');
    await expect(host.locator('.toast').filter({ hasText: 'Lenny bought Great Cauldron' })).toBeVisible({ timeout: 5000 });
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().owned.includes('cauldron')), (b) => b, 5000);
    await host.screenshot({ path: 'docs/screenshots/shop.png' });

    await host.click('#ready');
    await waitFor(() => gameState(host), (v) => v?.phase === 'intermission', 2000);
    expect((await gameState(host))!.day).toBe(1);
    await guest.click('#ready');
    await waitFor(() => gameState(host), (v) => v?.day === 2, 6000);
    await waitFor(() => gameState(guest), (v) => v?.day === 2, 6000);

    // Disconnect: the game pauses, then the guest rejoins.
    await waitFor(() => gameState(host), (v) => v?.phase === 'battle', 10000);
    await guest.close();
    // A closed tab cannot say goodbye over BroadcastChannel; signal it the way a dropped link would.
    await host.evaluate(() => (window as any).__fondue.lobbyLink.onClose());
    await waitFor(() => headline(host), (t) => t === 'Connection lost', 5000);
    expect(await host.evaluate(() => (window as any).__fondue.session.view().paused)).toBe(true);
    const code = await host.evaluate(() => (window as any).__fondue.code);
    const back = await context.newPage();
    await back.goto(`/?net=loopback&join=${code}${query}`);
    await waitForGame(back);
    await back.fill('#name', 'Lenny');
    await back.click('button[data-a="doJoin"]');
    await waitFor(() => gameState(back), (v) => v?.day === 2, 10000);
    await waitFor(() => host.evaluate(() => !(window as any).__fondue.session.view().paused), (b) => b, 5000);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('version mismatch is refused with a clear message', async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const guest = await context.newPage();
  await host.goto('/?net=loopback');
  await waitForGame(host);
  await host.click('button[data-a="play"]');
  await host.click('button[data-a="openRoom"]');
  await waitFor(() => host.locator('#status').innerText(), (t) => t.includes('Waiting'));
  const code = await host.locator('#roomCode').innerText();
  await guest.goto(`/?net=loopback&fakever=old&join=${code}`);
  await waitForGame(guest);
  await guest.click('button[data-a="doJoin"]');
  await expect(guest.locator('#status')).toContainText('version', { timeout: 8000 });
  await context.close();
});

test('invite link opens join with the code filled in', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/?net=loopback&join=ab2cd');
  await waitForGame(page);
  await expect(page.locator('#code')).toHaveValue('AB2CD');
  await context.close();
});
