import { expect, test, type Browser, type Page } from '@playwright/test';
import { ENEMIES } from '../../src/config/enemies';
import { COOP } from '../../src/config/waves';
import {
  CI, GAME_WAIT, closePopups, collectErrors, equip, fling, gameState, pointer, screenOf, station, waitFor, waitForGame, waitGame, waitPhase, waitScreen,
} from './helpers';

/** Two players on two browser windows, linked the way the game links them on one machine (loopback). */

// Two or three game windows run at once; on GitHub's software-drawn machines that takes minutes.
test.describe.configure({ timeout: CI ? 720_000 : 300_000 });

/**
 * Every window gets a profile of its own in memory (`fresh=1`): host and guest share one browser
 * storage here, and each side's reward must land in its own profile.
 */
const BASE = '/?menu=1&fresh=1&net=loopback';

/** Endless opens after the eleventh campaign level: this profile has won all of them. */
async function openEndless(page: Page) {
  await page.evaluate(() => {
    const a = (window as any).__fondue;
    a.profile.edit((d: any) => {
      d.seen.tutorial = true;
      a.profile.world(a.world);
      d.worlds[a.world].levelsDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    });
  });
}

type Prep = (p: Page) => Promise<unknown>;

async function openRoom(host: Page, query: string, plan: 'endless' | 'campaign', before?: Prep) {
  await host.goto(`${BASE}${query}`);
  await waitForGame(host);
  if (plan === 'endless') await openEndless(host);
  if (before) await before(host);
  await station(host, 'coop');
  await host.fill('#name', 'Tim');
  await host.click('button[data-a="openRoom"]');
  await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
  await waitFor(() => host.locator('#status').innerText(), (t) => t.includes('Waiting'));
  if (plan === 'campaign') {
    await host.click('#planCampaign');
    await expect(host.locator('#coopLevel')).toHaveValue('1');
  } else {
    // A room opens on endless when the host's campaign has opened it.
    await expect(host.locator('#difficulty')).toBeVisible();
  }
  return host.locator('#roomCode').innerText();
}

async function joinRoom(guest: Page, code: string, query: string, before?: Prep) {
  await guest.goto(`${BASE}&join=${code}${query}`);
  await waitForGame(guest);
  if (before) await before(guest);
  await guest.fill('#name', 'Lenny');
  await guest.click('#doJoin');
}

interface CoopOpts { plan?: 'endless' | 'campaign'; hostBefore?: Prep; guestBefore?: Prep }

async function setupCoop(browser: Browser, query: string, opts: CoopOpts = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  const hostErrors = collectErrors(host);
  const guestErrors = collectErrors(guest);
  const code = await openRoom(host, query, opts.plan ?? 'endless', opts.hostBefore);
  await joinRoom(guest, code, query, opts.guestBefore);
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
const KILL_GOLD = Math.round(ENEMIES.grunt.gold * COOP.goldPerKill);

const headline = (p: Page) => p.locator('.panel h2').innerText().catch(() => '');
const toCss = (p: Page, x: number, y: number) => p.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [x, y]);
/** The wave this page shows. */
const waveOf = (p: Page) => p.evaluate(() => ((window as any).__fondue.session?.view()?.wave ?? 0) as number);
/** What the profile of this page holds. */
const wallet = (p: Page) => p.evaluate(() => ({ ...(window as any).__fondue.profile.data.wallet }) as { gold: number; cheese: number; crests: number });

for (const [label, query] of [['no added latency', ''], ['simulated latency', '&lat=45&jit=20&loss=0.02']] as const) {
  test(`co-op endless with two browsers, ${label}`, async ({ browser }) => {
    const { host, guest, errors, context } = await setupCoop(browser, query);

    // Both hands exist and each is visible on the other side.
    await waitPhase(host, 'battle');
    await closePopups(host);
    await closePopups(guest);
    await guest.mouse.move(700, 300);
    await waitFor(() => gameState(host), (s) => Math.abs(s!.hands[1].x - 700) < 5 && Math.abs(s!.hands[1].y - 300) < 5, GAME_WAIT);
    await host.mouse.move(420, 200);
    await waitFor(() => gameState(guest), (s) => Math.abs(s!.hands[0].x - 420) < 5, GAME_WAIT);
    await host.screenshot({ path: 'docs/screenshots/coop-host.png' });
    await guest.screenshot({ path: 'docs/screenshots/coop-guest.png' });

    // Host tuning applies to both.
    await host.evaluate(() => { const sim = (window as any).__fondue.session.sim; sim.setTuning({ ...sim.tuning, shake: 1.7 }); });
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().tuning.shake), (v) => v === 1.7, GAME_WAIT);

    // Each player kills one raider; the money is shared. The targets are placed on purpose: how a
    // crowd spreads depends on the speed of the machine. The wave clock stands still meanwhile: with
    // the queue emptied, the wave's pause (and the empty field after a kill) would otherwise start
    // the next wave and its raiders mid-throw, and how much game time passes between two steps of
    // this test depends on the machine.
    const place = (x: number) => host.evaluate((px) => {
      const sim = (window as any).__fondue.session.sim;
      sim.setTuning({ ...sim.tuning, walkSpeed: 0.05 });
      sim.freezeWaves();
      sim.s.enemies = [];
      return sim.spawnEnemy('grunt', px).id as number;
    }, x);
    const first = await place(760);
    const a = (await waitFor(() => gameState(host), (v) => v!.enemies.some((e: any) => e.id === first), GAME_WAIT))!.enemies[0];
    // The events of a throw carry their own time stamps, so the flick is as quick on a slow machine;
    // its flight and fall take game time, which runs slower than real time where frames are slow.
    const goldBefore = (await gameState(host))!.gold;
    const hp = await pointer(host, false);
    await hp.down(a.x - 10, a.y - 44);
    await waitGame(host, () => gameState(host), (v) => v!.enemies.some((e: any) => e.id === first && e.st === 'held'), 3);
    await hp.glide(a.x - 10, a.y - 44, a.x - 60, 100, 10, 8);
    await hp.up();
    await waitGame(host, () => gameState(host), (v) => v!.gold >= goldBefore + KILL_GOLD, 8);

    const placed = await place(800);
    // The guest's picture lags behind the host, so it must have caught up before it aims.
    const s = await waitFor(() => gameState(guest), (v) => v!.enemies.length === 1 && v!.enemies[0].id === placed && v!.enemies[0].st === 'walk', 25000);
    const before = (await gameState(host))!.gold;
    const target = s!.enemies[0];
    // The guest sees its grab at once, without waiting for the host.
    const gp = await pointer(guest, false);
    await gp.down(target.x - 10, target.y - 44);
    // "At once" means within two pictures of the guest's own screen, however long a picture takes on this machine.
    const instant = await guest.evaluate(async (id) => {
      for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
      return (window as any).__fondue.session.view().enemies.find((e: any) => e.id === id)?.heldBy;
    }, target.id);
    expect(instant).toEqual([1]);
    // Up and a little to the left in ten quick steps, stamped like a real hand (see the host's throw).
    const pg = await toCss(guest, target.x - 10, target.y - 44);
    const top = await toCss(guest, target.x - 10, target.y - 44 - 400);
    const k = (top.y - pg.y) / -400;
    await gp.glide(target.x - 10, target.y - 44, target.x - 10 - 50 / k, target.y - 44 - 400 / k, 10, 8);
    await gp.up();
    await waitGame(host, () => gameState(host), (v) => v!.gold >= before + KILL_GOLD, 8);
    const now = await gameState(host);
    await waitFor(() => gameState(guest), (v) => v!.gold >= now!.gold, GAME_WAIT);

    // Shared pause.
    await guest.keyboard.press('p');
    await waitFor(() => headline(host), (t) => t === 'Paused', GAME_WAIT);
    await expect(host.locator('.panel')).toContainText('Lenny');
    await host.click('button[data-a="resume"]');
    await guest.waitForSelector('.overlay', { state: 'detached', timeout: GAME_WAIT });

    // Waves follow one another without a market or a Ready step in between: once the last raider of
    // a wave is gone, the next wave comes by itself, on both screens.
    const wave = await waveOf(host);
    await host.evaluate(() => { const st = (window as any).__fondue.session.sim.s; st.wavesFrozen = false; st.spawnQueue = []; st.spawned = 0; st.enemies = []; });
    await waitGame(host, () => waveOf(host), (w) => w === wave + 1, 6);
    await waitFor(() => waveOf(guest), (w) => w === wave + 1, GAME_WAIT);
    expect((await gameState(host))!.phase).toBe('battle');
    for (const p of [host, guest]) {
      expect(await p.locator('#ready, #toShop, #readyStatus').count()).toBe(0);
      expect(await screenOf(p)).toBe('none');
    }
    expect(errors()).toEqual([]);
    await context.close();
  });

  test(`co-op endless: a guest who drops out pauses the game and rejoins, ${label}`, async ({ browser }) => {
    const { host, errors, context, guest } = await setupCoop(browser, query);
    await waitPhase(host, 'battle');
    // The guest's tab closes in the middle of the fight.
    await guest.close();
    // A closed tab cannot say goodbye over BroadcastChannel; signal it the way a dropped link would.
    await host.evaluate(() => (window as any).__fondue.lobbyLink.onClose());
    await waitFor(() => headline(host), (t) => t === 'Connection lost', GAME_WAIT);
    expect(await host.evaluate(() => (window as any).__fondue.session.view().paused)).toBe(true);
    const code = await host.evaluate(() => (window as any).__fondue.code);
    const back = await context.newPage();
    const backErrors = collectErrors(back);
    // Rejoining right away, while the rest of the art still loads in the background, as a player would.
    await joinRoom(back, code, query);
    await waitFor(() => gameState(back), (v) => v?.mode === 'endless' && (v.phase === 'battle' || v.phase === 'banner'), GAME_WAIT);
    // The rejoined guest is in the same wave of the same run.
    await waitFor(async () => [await waveOf(back), await waveOf(host)], ([b, h]) => b >= 1 && b === h, GAME_WAIT);
    await waitFor(() => host.evaluate(() => !(window as any).__fondue.session.view().paused), (b) => b, GAME_WAIT);
    expect([...errors(), ...backErrors]).toEqual([]);
    await context.close();
  });
}

test('co-op campaign: host and guest win level 1 together; both get the round\'s gold, only the host the cheese', async ({ browser }) => {
  const { host, guest, errors, context } = await setupCoop(browser, '', { plan: 'campaign' });
  for (const p of [host, guest]) {
    const s = await waitFor(() => gameState(p), (v) => v?.mode === 'campaign', GAME_WAIT);
    expect(s!.level).toBe(1);
  }
  const before = { host: await wallet(host), guest: await wallet(guest) };
  await waitPhase(host, 'battle');
  await closePopups(host);
  // The host throws one raider to its death: the kill earns gold for the round. A real throw and no
  // tuning (a changed tuning marks the run as a developer run, which pays nothing); the raider stands
  // stunned, as after a stunning weapon, so the fast raiders of v0.3 cannot walk out of the grab.
  await host.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.freezeWaves();
    sim.s.enemies = [];
    const e = sim.spawnEnemy('grunt', 900);
    e.st = 'stun';
    e.t = 60;
  });
  const e = (await waitFor(() => gameState(host), (v) => v!.enemies.length === 1 && v!.enemies[0].st === 'stun', GAME_WAIT))!.enemies[0];
  const runGold = (await gameState(host))!.gold;
  await fling(host, false, e);
  await waitGame(host, () => gameState(host), (v) => v!.gold > runGold && v!.enemies.length === 0, 10);
  // The level ends by itself once its last wave is out and nobody is left: no Ready step in between.
  await host.evaluate(() => {
    const st = (window as any).__fondue.session.sim.s;
    st.wavesFrozen = false;
    st.wave = st.meta.rules.lastWave;
    st.spawnQueue = [];
    st.spawned = 0;
    st.enemies = [];
  });
  await waitScreen(host, 'won');
  await waitScreen(guest, 'won');
  const earned = await host.evaluate(() => (window as any).__fondue.session.meta().result.stats.goldEarned as number);
  expect(earned).toBeGreaterThan(0);
  // Both players are paid the whole gold of the round, each into their own profile (E-066).
  const after = { host: await wallet(host), guest: await wallet(guest) };
  expect(after.host.gold - before.host.gold).toBe(earned);
  expect(after.guest.gold - before.guest.gold).toBe(earned);
  // Cheese goes to the host only: the win cheese of level 1, plus gate and challenge cheese where earned.
  const cheese = await host.evaluate(() => (window as any).__fondue.reward.cheese as number);
  expect(cheese).toBeGreaterThanOrEqual(1);
  await expect(host.locator('#wonCheese')).toContainText(`+${cheese}`);
  await expect(guest.locator('#wonCheese')).toContainText('+0');
  await expect(guest.locator('.panel')).toContainText('The host decides');
  const progress = (p: Page) => p.evaluate(() => { const a = (window as any).__fondue; return [a.profile.highestLevelDone(a.world), a.profile.data.wallet.cheese]; });
  expect(await progress(host)).toEqual([1, before.host.cheese + cheese]);
  // The helper keeps no level progress and no cheese of their own.
  expect(await progress(guest)).toEqual([0, before.guest.cheese]);
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

test('co-op plays with the host\'s keep and the guest\'s own hand', async ({ browser }) => {
  const { host, guest, errors, context } = await setupCoop(browser, '', {
    hostBefore: (p) => p.evaluate(() => (window as any).__fondue.profile.edit((d: any) => { d.keep.castleTier = 3; d.keep.handTier = 1; })),
    guestBefore: (p) => p.evaluate(() => (window as any).__fondue.profile.edit((d: any) => { d.keep.castleTier = 1; d.keep.handTier = 3; })),
  });
  await waitPhase(host, 'battle');
  const hostKeep = await host.evaluate(() => (window as any).__fondue.profile.data.keep.castleTier as number);
  const guestHand = await guest.evaluate(() => (window as any).__fondue.profile.data.keep.handTier as number);
  expect(hostKeep).toBe(3);
  expect(guestHand).toBe(3);
  for (const p of [host, guest]) {
    const l = await waitFor(() => p.evaluate(() => (window as any).__fondue.session.meta()?.loadout), (v: any) => !!v, GAME_WAIT);
    // The gate is the host's castle (castle tier 3 is gate tier 2); seat 1 holds the guest's own hand tier.
    expect(l.gateTier).toBe(hostKeep - 1);
    expect(l.handTier).toEqual([1, guestHand]);
  }
  const gate = await host.evaluate(() => (window as any).__fondue.session.view().gateMax as number);
  await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.view().gateMax as number), (g) => g === gate, GAME_WAIT);
  expect(errors()).toEqual([]);
  await context.close();
});

test('co-op on different window shapes: one shared field, and the guest fires the host keep\'s weapon by tapping it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 852, height: 393 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  await guest.setViewportSize({ width: 1280, height: 720 });
  const errors = collectErrors(host);
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
  await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.meta().loadout.slotWeapon[0]), (w) => w === 'wheel', GAME_WAIT);
  const at = await guest.evaluate(() => (window as any).__fondue.scene.slotCss(0));
  await guest.mouse.click(at.x, at.y);
  await waitFor(() => host.evaluate(() => (window as any).__fondue.session.view().cooldowns[0] as number), (c) => c > 0, GAME_WAIT);
  expect([...errors, ...guestErrors]).toEqual([]);
  await context.close();
});

test('a guest of another version is refused with a clear message', async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await openRoom(host, '', 'endless');
  await guest.goto(`${BASE}&fakever=old&join=${code}`);
  await waitForGame(guest);
  await guest.click('#doJoin');
  // Both sides are told, with both versions, and what to do.
  await expect(guest.locator('#status')).toContainText('The host runs v', { timeout: 8000 });
  await expect(guest.locator('#status')).toContainText('you run old');
  await expect(guest.locator('#status')).toContainText('Both of you need to reload');
  await expect(host.locator('#status')).toContainText('could not join', { timeout: 8000 });
  await expect(host.locator('#status')).toContainText('Your friend runs old at the same address');
  await context.close();
});

test('a guest who opened another address of the game is told to open the host address', async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const guest = await context.newPage();
  const code = await openRoom(host, '', 'endless');
  // /index.html is the same server but another address, as /fondue/classic/ is for the live game.
  await guest.goto(`/index.html?menu=1&fresh=1&net=loopback&fakever=4-v0.2-abc1234&join=${code}`);
  await waitForGame(guest);
  await guest.click('#doJoin');
  await expect(guest.locator('#status')).toContainText('you run v0.2 (build abc1234)', { timeout: 8000 });
  await expect(guest.locator('#status')).toContainText('Both of you need to open');
  await expect(host.locator('#status')).toContainText('Your friend runs v0.2 (build abc1234) at another address');
  await expect(host.locator('#status')).toContainText('/index.html');
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

test('co-op endless pays the guest the round\'s gold into the guest\'s own profile', async ({ browser }) => {
  const { host, guest, errors, context } = await setupCoop(browser, '');
  const before = { host: await wallet(host), guest: await wallet(guest) };
  await waitPhase(host, 'battle');
  await closePopups(host);
  await host.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.freezeWaves();
    sim.s.enemies = [];
    const e = sim.spawnEnemy('grunt', 900);
    e.st = 'stun';
    e.t = 60;
  });
  const e = (await waitFor(() => gameState(host), (v) => v!.enemies.length === 1 && v!.enemies[0].st === 'stun', GAME_WAIT))!.enemies[0];
  const runGold = (await gameState(host))!.gold;
  await fling(host, false, e);
  await waitGame(host, () => gameState(host), (v) => v!.gold > runGold && v!.enemies.length === 0, 10);
  // The gate falls: the endless run is over.
  await host.evaluate(() => { (window as any).__fondue.session.sim.s.gateHp = 0; });
  await waitScreen(host, 'gameover');
  await waitScreen(guest, 'gameover');
  const earned = await host.evaluate(() => (window as any).__fondue.session.meta().result.stats.goldEarned as number);
  expect(earned).toBeGreaterThan(0);
  const after = { host: await wallet(host), guest: await wallet(guest) };
  expect(after.host.gold - before.host.gold).toBe(earned);
  expect(after.guest.gold - before.guest.gold).toBe(earned);
  expect(after.guest.cheese).toBe(before.guest.cheese);
  expect(errors()).toEqual([]);
  await context.close();
});

test('a host without the fifth slot cannot open an endless room', async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto(BASE);
  await waitForGame(host);
  await host.evaluate(() => (window as any).__fondue.profile.edit((d: any) => { d.seen.tutorial = true; }));
  await station(host, 'coop');
  await host.fill('#name', 'Tim');
  await host.click('button[data-a="openRoom"]');
  await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
  await expect(host.locator('#planCampaign')).toBeVisible();
  expect(await host.locator('#planEndless').count()).toBe(0);
  // Not even by a stray change of the plan (difficulty field, an old link): the room stays on the campaign.
  const mode = await host.evaluate(() => { const c = (window as any).__fondue.coop; c.setPlan({ mode: 'endless', difficulty: 'hard' }); return c.plan.mode as string; });
  expect(mode).toBe('campaign');
  await context.close();
});
