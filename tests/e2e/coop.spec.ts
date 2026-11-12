import { expect, test, type Browser, type Page } from '@playwright/test';
import { ENEMIES } from '../../src/config/enemies';
import { STARS } from '../../src/config/stars';
import { COOP } from '../../src/config/waves';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import {
  CI, GAME_WAIT, closePopups, collectErrors, endDay, equip, gameState, pointer, station, waitFor, waitForGame, waitGame, waitPhase, waitScreen,
} from './helpers';

/** Two players on two browser windows, linked the way the game links them on one machine (loopback). */

// Two or three game windows run at once; on GitHub's software-drawn machines that takes minutes.
test.describe.configure({ timeout: CI ? 720_000 : 300_000 });

async function openRoom(host: Page, query: string, plan: 'endless' | 'campaign') {
  await host.goto(`/?menu=1&net=loopback${query}`);
  await waitForGame(host);
  await station(host, 'coop');
  await host.fill('#name', 'Tim');
  await host.click('button[data-a="openRoom"]');
  await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
  await waitFor(() => host.locator('#status').innerText(), (t) => t.includes('Waiting'));
  if (plan === 'campaign') {
    await host.click('#planCampaign');
    await expect(host.locator('#coopLevel')).toHaveValue('1');
  }
  return host.locator('#roomCode').innerText();
}

async function joinRoom(guest: Page, code: string, query: string) {
  await guest.goto(`/?menu=1&net=loopback&join=${code}${query}`);
  await waitForGame(guest);
  await guest.fill('#name', 'Lenny');
  await guest.click('#doJoin');
}

async function setupCoop(browser: Browser, query: string, plan: 'endless' | 'campaign' = 'endless') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  const hostErrors = collectErrors(host);
  const guestErrors = collectErrors(guest);
  const code = await openRoom(host, query, plan);
  await joinRoom(guest, code, query);
  await expect(host.locator('#status')).toContainText('Lenny joined', { timeout: 10000 });
  await expect(guest.locator('#status')).toContainText('Waiting for the host', { timeout: 10000 });
  // Each side lists itself first, then the other player.
  await expect(host.locator('#roomMembers [data-seat="0"]')).toContainText('Tim (you)');
  await expect(host.locator('#roomMembers [data-seat="1"]')).toContainText('Lenny');
  await expect(guest.locator('#roomMembers [data-seat="0"]')).toContainText('Lenny (you)');
  await expect(guest.locator('#roomMembers [data-seat="1"]')).toContainText('Tim');
  await expect(host.locator('#startCoop')).toBeEnabled();
  await host.click('#startCoop');
  await waitFor(() => gameState(guest), (s) => s?.phase === 'banner' || s?.phase === 'battle', GAME_WAIT);
  return { host, guest, code, context, errors: () => [...hostErrors, ...guestErrors] };
}

/** What one Pothelm pays in a co-op endless game. */
const KILL_GOLD = Math.round(ENEMIES.grunt.gold * COOP.goldFactor);

const headline = (p: Page) => p.locator('.panel h2').innerText().catch(() => '');
const toCss = (p: Page, x: number, y: number) => p.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [x, y]);

for (const [label, query] of [['no added latency', ''], ['simulated latency', '&lat=45&jit=20&loss=0.02']] as const) {
  test(`co-op endless with two browsers, ${label}`, async ({ browser }) => {
    const { host, guest, errors, context } = await setupCoop(browser, query);

    // Both hands exist and each is visible on the other side.
    await waitPhase(host, 'battle');
    await closePopups(host);
    await closePopups(guest);
    await guest.mouse.move(700, 300);
    await waitFor(() => gameState(host), (s) => Math.abs(s!.hands[1].x - 700) < 5 && Math.abs(s!.hands[1].y - 300) < 5, 5000);
    await host.mouse.move(420, 200);
    await waitFor(() => gameState(guest), (s) => Math.abs(s!.hands[0].x - 420) < 5, 5000);
    await host.screenshot({ path: 'docs/screenshots/coop-host.png' });
    await guest.screenshot({ path: 'docs/screenshots/coop-guest.png' });

    // Host tuning applies to both.
    await host.evaluate(() => { const sim = (window as any).__fondue.session.sim; sim.setTuning({ ...sim.tuning, shake: 1.7 }); });
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().tuning.shake), (v) => v === 1.7, 5000);

    // Each player kills one raider; the money is shared. The targets are placed on purpose: how a
    // crowd spreads depends on the speed of the machine.
    const place = (x: number) => host.evaluate((px) => {
      const sim = (window as any).__fondue.session.sim;
      sim.setTuning({ ...sim.tuning, walkSpeed: 0.05 });
      sim.s.spawnQueue = [];
      sim.s.enemies = [];
      return sim.spawnEnemy('grunt', px).id as number;
    }, x);
    const first = await place(760);
    const a = (await waitFor(() => gameState(host), (v) => v!.enemies.some((e: any) => e.id === first), 5000))!.enemies[0];
    // The events of a throw carry their own time stamps, so the flick is as quick on a slow machine;
    // its flight and fall take game time, which runs slower than real time where frames are slow.
    const hp = await pointer(host, false);
    await hp.down(a.x - 10, a.y - 44);
    await waitGame(host, () => gameState(host), (v) => v!.enemies.some((e: any) => e.id === first && e.st === 'held'), 3);
    await hp.glide(a.x - 10, a.y - 44, a.x - 60, 100, 10, 8);
    await hp.up();
    await waitGame(host, () => gameState(host), (v) => v!.gold >= KILL_GOLD, 8);

    const placed = await place(800);
    // The guest's picture lags behind the host, so it must have caught up before it aims.
    const s = await waitFor(() => gameState(guest), (v) => v!.enemies.length === 1 && v!.enemies[0].id === placed && v!.enemies[0].st === 'walk', 25000);
    const before = (await gameState(host))!.gold;
    const target = s!.enemies[0];
    // The guest sees its grab at once, without waiting for the host.
    const gp = await pointer(guest, false);
    await gp.down(target.x - 10, target.y - 44);
    await guest.waitForTimeout(20);
    const instant = await guest.evaluate((id) => (window as any).__fondue.session.view().enemies.find((e: any) => e.id === id)?.heldBy, target.id);
    expect(instant).toEqual([1]);
    // Up and a little to the left in ten quick steps, stamped like a real hand (see the host's throw).
    const pg = await toCss(guest, target.x - 10, target.y - 44);
    const top = await toCss(guest, target.x - 10, target.y - 44 - 400);
    const k = (top.y - pg.y) / -400;
    await gp.glide(target.x - 10, target.y - 44, target.x - 10 - 50 / k, target.y - 44 - 400 / k, 10, 8);
    await gp.up();
    await waitGame(host, () => gameState(host), (v) => v!.gold >= before + KILL_GOLD, 8);
    const now = await gameState(host);
    await waitFor(() => gameState(guest), (v) => v!.gold >= now!.gold, 5000);

    // Shared pause.
    await guest.keyboard.press('p');
    await waitFor(() => headline(host), (t) => t === 'Paused', 5000);
    await expect(host.locator('.panel')).toContainText('Lenny');
    await host.click('button[data-a="resume"]');
    await guest.waitForSelector('.overlay', { state: 'detached', timeout: 5000 });

    // The market at the keep with Ready on both sides; a purchase is announced to the other player.
    await endDay(host);
    await waitPhase(host, 'intermission');
    await host.evaluate(() => { (window as any).__fondue.session.sim.s.gold = 2000; });
    await guest.waitForSelector('#toShop', { timeout: GAME_WAIT });
    await host.waitForSelector('#toShop', { timeout: GAME_WAIT });
    await host.click('#toShop');
    await guest.click('#toShop');
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.view().gold as number), (g) => g === 2000, 5000);
    await guest.evaluate(() => (window as any).__fondue.scene.tapMarketSpot('station:cauldron'));
    await guest.click('#marketWindow button[data-buy="station:cauldron"]');
    // The purchase travels to the host, is booked on a tick of its game clock and comes back with the
    // next state, so both waits count the host's game time: it runs slower than real time where frames are slow.
    await expect(host.locator('.toast').filter({ hasText: 'Lenny bought Great Cauldron' })).toBeVisible({ timeout: GAME_WAIT });
    await waitGame(host, () => guest.evaluate(() => (window as any).__fondue.session.meta().loadout.stations.cauldron), (b) => b === true, 5);
    await host.screenshot({ path: 'docs/screenshots/shop.png' });

    await host.click('#ready');
    await expect(host.locator('#readyStatus')).toContainText('Waiting for Lenny');
    expect((await gameState(host))!.day).toBe(1);
    await guest.click('#ready');
    await waitFor(() => gameState(host), (v) => v?.day === 2, GAME_WAIT);
    await waitFor(() => gameState(guest), (v) => v?.day === 2, GAME_WAIT);
    expect(errors()).toEqual([]);
    await context.close();
  });

  test(`co-op endless: a guest who drops out pauses the game and rejoins, ${label}`, async ({ browser }) => {
    const { host, guest, errors, context } = await setupCoop(browser, query);
    await waitPhase(host, 'battle');
    // The guest's tab closes in the middle of the fight.
    await guest.close();
    // A closed tab cannot say goodbye over BroadcastChannel; signal it the way a dropped link would.
    await host.evaluate(() => (window as any).__fondue.lobbyLink.onClose());
    await waitFor(() => headline(host), (t) => t === 'Connection lost', 5000);
    expect(await host.evaluate(() => (window as any).__fondue.session.view().paused)).toBe(true);
    const code = await host.evaluate(() => (window as any).__fondue.code);
    const back = await context.newPage();
    const backErrors = collectErrors(back);
    // Rejoining right away, while the rest of the art still loads in the background, as a player would.
    await joinRoom(back, code, query);
    await waitFor(() => gameState(back), (v) => v?.day === 1 && v.mode === 'endless', GAME_WAIT);
    await waitFor(() => host.evaluate(() => !(window as any).__fondue.session.view().paused), (b) => b, 5000);
    expect([...errors(), ...backErrors]).toEqual([]);
    await context.close();
  });
}

test('co-op campaign: host and guest win level 1 together, each gets a reward', async ({ browser }) => {
  const { host, guest, errors, context } = await setupCoop(browser, '', 'campaign');
  for (const p of [host, guest]) {
    const s = await waitFor(() => gameState(p), (v) => v?.mode === 'campaign', GAME_WAIT);
    expect(s!.level).toBe(1);
  }
  await waitPhase(host, 'battle');
  await endDay(host);
  await waitPhase(host, 'intermission');
  await guest.waitForSelector('#ready', { timeout: GAME_WAIT });
  await host.click('#ready');
  await guest.click('#ready');
  await waitFor(() => gameState(guest), (v) => v?.day === 2, GAME_WAIT);
  await waitPhase(host, 'battle');
  await endDay(host);
  await waitScreen(host, 'won');
  await waitScreen(guest, 'won');
  const level = levelOf(DEFAULT_WORLD, 1)!;
  await expect(host.locator('#wonStars')).toContainText(String(level.stars));
  await expect(guest.locator('#wonStars')).toContainText(String(Math.ceil(level.stars * STARS.guestShare)));
  await expect(guest.locator('.panel')).toContainText('The host decides');
  const progress = (p: Page) => p.evaluate(() => { const a = (window as any).__fondue; return [a.profile.highestLevelDone(a.world), a.profile.data.stars]; });
  expect(await progress(host)).toEqual([1, level.stars]);
  // The helper keeps no level progress of their own, only the stars.
  expect(await progress(guest)).toEqual([0, Math.ceil(level.stars * STARS.guestShare)]);
  // Continue brings both back into the room, with the next level planned.
  await host.click('#continue');
  await waitScreen(host, 'host');
  await expect(host.locator('#coopLevel')).toHaveValue('2');
  await expect(host.locator('#status')).toContainText('Lenny is in the room');
  await expect(host.locator('#startCoop')).toBeEnabled();
  await waitScreen(guest, 'join');
  expect(errors()).toEqual([]);
  await context.close();
});

test('co-op on different window shapes: one shared field, and the guest fires the host keep\'s weapon by tapping it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 852, height: 393 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  await guest.setViewportSize({ width: 1280, height: 720 });
  const errors = [...collectErrors(host)];
  const guestErrors = collectErrors(guest);
  const code = await openRoom(host, '&seed=41', 'endless');
  await joinRoom(guest, code, '');
  await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 10000 });
  await host.click('#startCoop');
  await waitPhase(host, 'battle');
  const hostMeta = await host.evaluate(() => (window as any).__fondue.session.meta());
  expect(hostMeta.fieldW).toBeGreaterThan(1280);
  const gv = await waitFor(() => guest.evaluate(() => (window as any).__fondue.scene.view), (v: any) => v.fieldW === hostMeta.fieldW, GAME_WAIT);
  expect(gv.offsetX).toBe(0);
  expect(gv.height).toBeGreaterThan(720);
  await guest.screenshot({ path: 'mobile-screenshots/coop-guest-laptop-of-wide-host.png' });
  await host.screenshot({ path: 'mobile-screenshots/coop-host-wide.png' });

  await equip(host, { 0: 'wheel' });
  await host.evaluate(() => (window as any).__fondue.session.sim.spawnEnemy('grunt', 700));
  await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().loadout.slotWeapon[0]), (w) => w === 'wheel', 5000);
  const at = await guest.evaluate(() => (window as any).__fondue.scene.slotCss(0));
  await guest.mouse.click(at.x, at.y);
  await waitFor(() => host.evaluate(() => (window as any).__fondue.session.view().cooldowns[0] as number), (c) => c > 0, 5000);
  expect([...errors, ...guestErrors]).toEqual([]);
  await context.close();
});

test('a guest of another version is refused with a clear message', async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await openRoom(host, '', 'endless');
  await guest.goto(`/?menu=1&net=loopback&fakever=old&join=${code}`);
  await waitForGame(guest);
  await guest.click('#doJoin');
  await expect(guest.locator('#status')).toContainText('version', { timeout: 8000 });
  await context.close();
});

test('an invite link opens Join with the code filled in, Back on the left and Join on the right', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/?net=loopback&join=ab2cd');
  await waitForGame(page);
  await waitScreen(page, 'join');
  await expect(page.locator('#code')).toHaveValue('AB2CD');
  const back = (await page.locator('button[data-a="quit"]').boundingBox())!;
  const join = (await page.locator('#doJoin').boundingBox())!;
  expect(back.x).toBeLessThan(join.x);
  // A friend's link goes straight to the room: no tutorial in between.
  expect(await page.evaluate(() => (window as any).__fondue.session)).toBeNull();
  await context.close();
});
