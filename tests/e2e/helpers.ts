import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { DT } from '../../src/config/field';

/**
 * Shared pieces of the browser tests. Every test waits on the state of the game (`window.__fondue`)
 * instead of fixed times: GitHub's machines draw in software and run the game clock slower than real time.
 */

export const CI = !!process.env.CI;
/** A generous limit for things that wait on game time (banners, the fall of the gate, a day's end). */
export const GAME_WAIT = CI ? 60_000 : 20_000;

export interface Device { name: string; width: number; height: number; touch: boolean }

/** The three devices every change is checked on (docs/AUFTRAG-GROSSES-UPDATE.md, section 16). */
export const LAPTOP: Device = { name: 'laptop', width: 1280, height: 720, touch: false };
export const IPHONE: Device = { name: 'iphone-16', width: 852, height: 393, touch: true };
export const ANDROID: Device = { name: 'oneplus-8t', width: 915, height: 412, touch: true };
export const PHONES: Device[] = [IPHONE, ANDROID];
/** Other screens, only with ALL_SCREENS=1. */
const EXTRA: Device[] = [
  { name: 'small-android', width: 640, height: 360, touch: true },
  { name: 'iphone-se', width: 667, height: 375, touch: true },
  { name: 'ipad', width: 1024, height: 768, touch: true },
];
export const DEVICES: Device[] = process.env.ALL_SCREENS ? [LAPTOP, IPHONE, ANDROID, ...EXTRA] : [LAPTOP, IPHONE, ANDROID];
export const PHONE_DEVICES: Device[] = process.env.ALL_SCREENS ? [IPHONE, ANDROID, ...EXTRA] : PHONES;

export interface Opened { context: BrowserContext; page: Page; errors: string[] }

/** A fresh browser window of a device, with the game loaded. `?menu=1` skips the first-start tutorial. */
export async function openGame(browser: Browser, device: Device, query = '?menu=1', opts: { allArt?: boolean; context?: BrowserContext } = {}): Promise<Opened> {
  const context = opts.context ?? await browser.newContext({
    viewport: { width: device.width, height: device.height }, hasTouch: device.touch, isMobile: device.touch, deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await page.goto(`/${query}`);
  await waitForGame(page, opts);
  return { context, page, errors };
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** The game is up: the scene runs, the art is there (unless `allArt: false`), and a first screen is chosen. */
export async function waitForGame(page: Page, opts: { allArt?: boolean } = {}) {
  // The menu is usable before the other landscapes and keep stages exist; they follow in the background
  // (about 15 s in software rendering). Tests start as a player would, without waiting for them.
  const allArt = opts.allArt ?? false;
  await page.waitForFunction((all) => {
    const a = (window as any).__fondue;
    return a?.scene?.sys?.isActive?.() === true && (!all || a.artReady === true) && typeof a.screen === 'string';
  }, allArt, { timeout: CI ? 180_000 : 60_000 });
}

/** The hall inside the keep is on screen, the camera move is over and its stations can be tapped. */
export async function waitForLobby(page: Page) {
  await page.waitForFunction(() => {
    const a = (window as any).__fondue;
    return a.screen === 'main' && a.lobby.visible && !a.lobby.moving && a.lobby.spots().length > 0;
  }, null, { timeout: GAME_WAIT });
}

/** Uses a station of the lobby (the main menu), the way its own tap does. */
export async function station(page: Page, id: string) {
  await waitForLobby(page);
  await page.evaluate((s) => (window as any).__fondue.lobby.tap(s), id);
}

/** Taps a station by its pixels, with a finger or the mouse. */
export async function tapStation(page: Page, id: string, touch: boolean) {
  await waitForLobby(page);
  const spot = await page.evaluate((s) => (window as any).__fondue.lobby.spots().find((p: any) => p.id === s), id);
  expect(spot, `station ${id} is on show`).toBeTruthy();
  if (touch) await page.touchscreen.tap(spot.x, spot.y);
  else await page.mouse.click(spot.x, spot.y);
}

export const gameState = (page: Page) => page.evaluate(() => {
  const app = (window as any).__fondue;
  const s = app.session;
  const v = s?.view();
  const m = s?.meta();
  return v ? {
    phase: v.phase as string, day: v.day as number, gold: v.gold as number, offerings: v.offerings as number,
    gateHp: v.gateHp as number, gateMax: v.gateMax as number, dayT: v.dayT as number, paused: v.paused as boolean,
    enemies: v.enemies.map((e: any) => ({ id: e.id, type: e.type, st: e.st, x: e.x, y: e.y, heldBy: e.heldBy, armed: e.armed })),
    // Kills of the run so far: the host counts them live, the total in Meta only grows at the end of a day.
    hands: v.hands, cooldowns: v.cooldowns as number[], potBusy: v.potBusy as number, kills: (s.sim?.s.stats.kills ?? m?.totalKills) as number,
    mode: m?.rules.mode as string, level: m?.rules.level as number | null,
    connection: s.connection(), ping: s.pingMs(), screen: app.screen as string,
  } : null;
});

export const screenOf = (page: Page) => page.evaluate(() => (window as any).__fondue.screen as string);

export async function waitFor<T>(fn: () => Promise<T>, pred: (v: T) => boolean, timeoutMs = 30000, pollMs = 100): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (pred(v)) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`waitFor timed out; last value: ${JSON.stringify(v)?.slice(0, 400)}`);
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

/** Seconds of game time the simulation on this page has run (it stands still while paused); null without one. */
export const gameClock = (page: Page) => page.evaluate((dt) => {
  const sim = (window as any).__fondue.session?.sim;
  return sim ? (sim.s.tick as number) * dt : null;
}, DT);

/**
 * Like `waitFor`, but the limit is game time: it runs out after `gameSeconds` of the simulation on
 * `clockPage` (the host in co-op). The game clock falls behind real time where frames are slow, as
 * on GitHub's software-drawn machines, so a limit in real time would cut a fight short there.
 * A limit in real time still applies, for a game that does not run on at all.
 */
export async function waitGame<T>(clockPage: Page, fn: () => Promise<T>, pred: (v: T) => boolean, gameSeconds: number, pollMs = 100): Promise<T> {
  const wallLimit = gameSeconds * 1000 * (CI ? 20 : 6) + 10_000;
  const start = Date.now();
  let base = await gameClock(clockPage);
  let ran = 0;
  for (;;) {
    const v = await fn();
    if (pred(v)) return v;
    const now = await gameClock(clockPage);
    // A new run starts its clock at zero again: count on from there.
    if (now !== null && base !== null && now < base) base = 0;
    if (now !== null && base !== null) { ran += now - base; base = now; } else base = now;
    if (ran > gameSeconds || Date.now() - start > wallLimit) {
      throw new Error(`waitGame timed out after ${ran.toFixed(1)} s of game time (${((Date.now() - start) / 1000).toFixed(1)} s real); last value: ${JSON.stringify(v)?.slice(0, 400)}`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

export const waitPhase = (page: Page, phases: string | string[], timeoutMs = GAME_WAIT) => {
  const want = Array.isArray(phases) ? phases : [phases];
  return waitFor(() => gameState(page), (s) => !!s && want.includes(s.phase), timeoutMs);
};

export const waitScreen = (page: Page, screen: string, timeoutMs = GAME_WAIT) => waitFor(() => screenOf(page), (s) => s === screen, timeoutMs);

/** Taps away the "New enemy" windows a fresh profile sees on its first day. */
export async function closePopups(page: Page) {
  for (let i = 0; i < 6 && (await page.locator('#enemyPopup').count()) > 0; i++) {
    await page.locator('#enemyPopup').click().catch(() => {});
  }
}

/** From the lobby to the first fight of an endless run alone. */
export async function startEndless(page: Page) {
  await station(page, 'play');
  await page.click('#startEndless');
  await waitPhase(page, 'battle');
}

/** Opens the game and starts endless alone; the shortcut most tests need. */
export async function startSolo(page: Page, query = '?menu=1') {
  await page.goto(`/${query}`);
  await waitForGame(page);
  await startEndless(page);
}

/** An empty road and slow raiders, so a test controls exactly who is on the field. */
export async function clearField(page: Page, walkSpeed = 0.02) {
  await page.evaluate((w) => {
    const sim = (window as any).__fondue.session.sim;
    sim.s.spawnQueue = [];
    sim.s.enemies = [];
    sim.s.projectiles = [];
    if (w !== null) sim.setTuning({ ...sim.tuning, walkSpeed: w });
  }, walkSpeed);
}

/** Lets the day of the host end now: nobody left on the road and the sun is down. */
export async function endDay(page: Page) {
  await page.evaluate(() => {
    const s = (window as any).__fondue.session.sim.s;
    s.spawnQueue = [];
    s.enemies = [];
    s.dayT = Math.max(s.dayT, s.meta.today.seconds);
  });
}

/** Breaks the gate of the host's run. */
export async function breakGate(page: Page) {
  await page.evaluate(() => { (window as any).__fondue.session.sim.s.gateHp = 0; });
}

/** Puts weapons into slots of the running game, as if they had been bought ({ slot: weaponId }). */
export async function equip(page: Page, slots: Record<number, string>, stations: string[] = []) {
  await page.evaluate(([sl, st]) => {
    const sim = (window as any).__fondue.session.sim;
    const l = sim.s.meta.loadout;
    for (const [i, id] of Object.entries(sl as Record<string, string>)) {
      sim.s.meta.rules.slotsOpen[Number(i)] = true;
      l.slotWeapon[Number(i)] = id;
      l.weaponTier[id] = l.weaponTier[id] ?? 1;
    }
    for (const id of st as string[]) l.stations[id] = true;
    sim.s.cooldowns = sim.s.cooldowns.map(() => 0);
    sim.s.meta.rev++;
  }, [slots, stations] as const);
}

export const spawn = (page: Page, type: string, x: number) =>
  page.evaluate(([t, px]) => (window as any).__fondue.session.sim.spawnEnemy(t, px).id as number, [type, x] as const);

export const css = (page: Page, x: number, y: number) =>
  page.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b) as { x: number; y: number }, [x, y]);

/**
 * One finger (raw touch events, so the game sees a real touch) or the mouse, in world coordinates.
 * The camera stands still during a fight, so world-to-screen is measured once: a gesture then sends
 * its events without a round trip to the page in between, as fast as a real hand.
 */
export async function pointer(page: Page, touch: boolean) {
  const cdp = await page.context().newCDPSession(page);
  const o = await css(page, 0, 0);
  const k = await css(page, 1000, 1000);
  const at = (x: number, y: number) => ({ x: o.x + ((k.x - o.x) * x) / 1000, y: o.y + ((k.y - o.y) * y) / 1000 });
  // A software-drawn page takes up to a frame to take each input event. A real touch screen or mouse
  // stamps every event with the moment the hand was there, so these events carry their own time
  // stamps: a quick gesture stays quick, however slowly the events arrive.
  let clock = 0;
  let last = { x: 0, y: 0 };
  const stamp = (dtMs: number) => { clock = clock === 0 ? Date.now() / 1000 : clock + dtMs / 1000; return clock; };
  const send = (kind: 'start' | 'move' | 'end', c: { x: number; y: number }, dtMs: number) => {
    const timestamp = stamp(dtMs);
    if (touch) {
      const type = kind === 'start' ? 'touchStart' : kind === 'move' ? 'touchMove' : 'touchEnd';
      return cdp.send('Input.dispatchTouchEvent', { type, touchPoints: kind === 'end' ? [] : [c], timestamp });
    }
    const type = kind === 'start' ? 'mousePressed' : kind === 'move' ? 'mouseMoved' : 'mouseReleased';
    return cdp.send('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', buttons: kind === 'end' ? 0 : 1, clickCount: 1, timestamp });
  };
  const down = async (x: number, y: number) => {
    clock = 0;
    last = at(x, y);
    if (!touch) await page.mouse.move(last.x, last.y);
    await send('start', last, 0);
  };
  const move = async (x: number, y: number, dtMs = 16) => {
    last = at(x, y);
    await send('move', last, dtMs);
  };
  /** Lifts the finger or the button; `stillMs` is how long it rested first, so a carry ends without a throw. */
  const up = async (stillMs = 8) => { await send('end', last, stillMs); };
  const glide = async (ax: number, ay: number, bx: number, by: number, steps = 10, stepMs = 12) => {
    for (let i = 1; i <= steps; i++) await move(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps, stepMs);
  };
  const tap = async (x: number, y: number) => { await down(x, y); await page.waitForTimeout(30); await up(); };
  return { down, move, up, glide, tap };
}

/** Grabs a raider by its body and flings it up high: the fall kills a Pothelm. */
export async function fling(page: Page, touch: boolean, e: { x: number; y: number }) {
  const p = await pointer(page, touch);
  await p.down(e.x - 6, e.y - 44);
  await waitGame(page, () => gameState(page), (v) => !!v && v.enemies.some((q: any) => q.st === 'held'), 3);
  await p.glide(e.x - 6, e.y - 44, e.x - 40, 90, 9, 8);
  await p.up();
}

/** Moves the mouse through many small steps, like a hand would (laptop only). */
export async function drag(page: Page, from: [number, number], to: [number, number], steps = 14, stepMs = 8) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.waitForTimeout(40);
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    await page.mouse.move(from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f);
    await page.waitForTimeout(stepMs);
  }
  await page.mouse.up();
}

/** Taps a place of the market at the keep by its pixels. */
export async function tapMarket(page: Page, id: string, touch: boolean) {
  await page.waitForFunction(() => (window as any).__fondue.scene.marketProgress() >= 1, null, { timeout: GAME_WAIT });
  const spot = await page.evaluate((s) => {
    const p = (window as any).__fondue.scene.marketSpotCss(s);
    return p ? { ...p, free: document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS' } : null;
  }, id);
  expect(spot, `market place ${id}`).toBeTruthy();
  expect(spot.free, `market place ${id} is not covered by a window`).toBe(true);
  if (touch) await page.touchscreen.tap(spot.x, spot.y);
  else await page.mouse.click(spot.x, spot.y);
}

/** Ends the day and opens the market at the keep. */
export async function toMarket(page: Page) {
  await endDay(page);
  await waitPhase(page, 'intermission');
  await page.click('#toShop');
  await waitScreen(page, 'shop');
}
