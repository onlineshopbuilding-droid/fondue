import { expect, test, type Page } from '@playwright/test';
import { CI, GAME_WAIT, collectErrors, station, waitFor, waitForGame } from './helpers';

/**
 * E2: how smooth the guest's picture is. Two windows play co-op over the loopback link with a
 * simulated real network (latency, jitter, the odd retransmit). The guest records, every frame,
 * how far each walking raider moved on its own screen, when snapshots arrived and how big they were.
 * The numbers go to the log (and docs/v0.3/MESSUNGEN-KOOP.md); the checks catch a return of the stutter.
 */

test.describe.configure({ timeout: CI ? 600_000 : 240_000 });

const BASE = '/?menu=1&fresh=1&net=loopback';
const NET = '&lat=60&jit=25&loss=0.02';
/** How long the guest records. */
const MEASURE_MS = 8000;

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

const pct = (list: number[], p: number) => {
  if (list.length === 0) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const mean = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
const r = (v: number) => Math.round(v * 10) / 10;

for (const [label, query] of [['no added latency', ''], ['lat 60 ms, jitter 25 ms, 2 % loss', NET]] as const) {
  test(`co-op guest picture stays smooth, ${label}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const host = await context.newPage();
    const guest = await context.newPage();
    const errors = [...collectErrors(host), ...collectErrors(guest)];
    await host.goto(`${BASE}&seed=7${query}`);
    await waitForGame(host);
    await openEndless(host);
    await station(host, 'coop');
    await host.fill('#name', 'Tim');
    await host.click('button[data-a="openRoom"]');
    await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
    const code = await host.locator('#roomCode').innerText();
    await guest.goto(`${BASE}&join=${code}${query}`);
    await waitForGame(guest);
    await guest.fill('#name', 'Lenny');
    await guest.click('#doJoin');
    await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 10000 });
    await host.click('#startCoop');
    await waitFor(() => host.evaluate(() => (window as any).__fondue.session?.view()?.phase), (p) => p === 'battle', GAME_WAIT * 2);
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session?.role), (p) => p === 'guest', GAME_WAIT);

    // The host keeps a steady stream of walking raiders on the field, and nothing else.
    await host.evaluate(() => {
      const a = (window as any).__fondue;
      const sim = a.session.sim;
      sim.freezeWaves();
      sim.s.enemies = [];
      const w = a.session.meta().fieldW as number;
      const feed = () => {
        if (a.session?.sim !== sim) return;
        const walking = sim.s.enemies.filter((e: any) => e.st === 'walk').length;
        if (walking < 5) sim.spawnEnemy('grunt', w - 40 - Math.floor(Math.random() * 200));
        for (const e of sim.s.enemies) if (e.st !== 'walk') e.hp = 0;
        sim.s.gateHp = sim.s.gateMax;
        setTimeout(feed, 150);
      };
      feed();
    });
    await waitFor(() => guest.evaluate(() => (window as any).__fondue.session.view()?.enemies.length ?? 0), (n) => n >= 3, GAME_WAIT);

    // The guest records its own frames and the snapshots it hears.
    const raw = await guest.evaluate(async (ms) => {
      const s = (window as any).__fondue.session;
      const link = s.link;
      const arrivals: number[] = [];
      const bytes: number[] = [];
      const inner = link.onMessage;
      link.onMessage = (m: any) => {
        if (m.k === 's') { arrivals.push(performance.now()); bytes.push(JSON.stringify(m).length); }
        inner(m);
      };
      const frames: number[] = [];
      const steps: number[] = [];
      const speeds: number[] = [];
      const dts: number[] = [];
      let prev = new Map<number, number>();
      const update = s.update.bind(s);
      let lastT = performance.now();
      s.update = (ms: number) => {
        update(ms);
        // Real time between two frames: the game clamps its own step, the eye does not.
        const t = performance.now();
        const dt = t - lastT;
        lastT = t;
        frames.push(dt);
        const v = s.view();
        const now = new Map<number, number>();
        for (const e of v?.enemies ?? []) if (e.st === 'walk' && e.heldBy.length === 0) now.set(e.id, e.x);
        for (const [id, x] of now) {
          const p = prev.get(id);
          if (p === undefined || dt <= 0) continue;
          steps.push(Math.abs(x - p));
          speeds.push(Math.abs(x - p) / (dt / 1000));
          dts.push(dt);
        }
        prev = now;
      };
      await new Promise((res) => setTimeout(res, ms));
      s.update = update;
      link.onMessage = inner;
      return { arrivals, bytes, frames, steps, speeds, dts };
    }, MEASURE_MS);
    const gaps = raw.arrivals.slice(1).map((t, i) => t - raw.arrivals[i]);
    // A frame's step against the step a raider at its median speed would make in that frame.
    const median = pct(raw.speeds, 0.5);
    const errorsPx = raw.steps.map((d, i) => Math.abs(d - median * raw.dts[i] / 1000));
    const stalls = raw.steps.filter((d) => d === 0).length / Math.max(1, raw.steps.length);
    const result = {
      label,
      snapshots: raw.arrivals.length,
      snapshotHz: r(raw.arrivals.length / (MEASURE_MS / 1000)),
      snapshotBytesMean: Math.round(mean(raw.bytes)),
      snapshotBytesMax: Math.max(0, ...raw.bytes),
      gapMeanMs: r(mean(gaps)),
      gapP95Ms: r(pct(gaps, 0.95)),
      gapMaxMs: r(Math.max(0, ...gaps)),
      frameMeanMs: r(mean(raw.frames)),
      frameP95Ms: r(pct(raw.frames, 0.95)),
      raiderSpeedMedian: r(median),
      stepMeanPx: r(mean(raw.steps)),
      stepP95Px: r(pct(raw.steps, 0.95)),
      stepErrMeanPx: r(mean(errorsPx)),
      stepErrP95Px: r(pct(errorsPx, 0.95)),
      stallFrames: r(stalls * 100),
      // How far a frame's on-screen speed is from the raider's typical speed, in percent.
      speedErrMeanPct: r(mean(raw.speeds.map((v) => Math.abs(v - median) / Math.max(1, median) * 100))),
      speedErrP95Pct: r(pct(raw.speeds.map((v) => Math.abs(v - median) / Math.max(1, median) * 100), 0.95)),
    };
    console.log(`COOP-LAG ${JSON.stringify(result)}`);
    test.info().annotations.push({ type: 'coop-lag', description: JSON.stringify(result) });

    // The guest's own hand is drawn where the pointer is in the very next frame, not after a round trip.
    const handX = () => guest.evaluate(async () => {
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      return (window as any).__fondue.session.view().hands[1].x as number;
    });
    await guest.mouse.move(500, 300);
    const left = await handX();
    await guest.mouse.move(900, 300);
    const right = await handX();
    expect(right - left).toBeGreaterThan(100);

    expect(raw.arrivals.length).toBeGreaterThan(20);
    expect(raw.steps.length).toBeGreaterThan(50);
    expect(errors).toEqual([]);
    await context.close();
  });
}
