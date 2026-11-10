import type { Page } from '@playwright/test';

/** Moves the mouse through many small steps, like a hand would. */
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

export const gameState = (page: Page) => page.evaluate(() => {
  const app = (window as any).__fondue;
  const s = app.session;
  const v = s?.view();
  return v ? {
    phase: v.phase, day: v.day, gold: v.gold, offerings: v.offerings, gateHp: v.gateHp, gateMax: v.gateMax, dayT: v.dayT,
    enemies: v.enemies.map((e: any) => ({ id: e.id, type: e.type, st: e.st, x: e.x, y: e.y, heldBy: e.heldBy })),
    hands: v.hands, kills: s.meta()?.totalKills,
    connection: s.connection(), ping: s.pingMs(), screen: app.screen,
  } : null;
});

export async function waitForGame(page: Page, opts: { allArt?: boolean } = {}) {
  const allArt = opts.allArt ?? true;
  // GitHub's machines draw in software; a second window starting beside a running game takes a while there.
  // The menu is usable before the other landscapes and keep stages exist; they follow in the
  // background. Tests start once everything is there, so slow machines measure the game, not the loading;
  // `allArt: false` checks the moment the menu is ready, the way a player meets it.
  await page.waitForFunction((all) => { const a = (window as any).__fondue; return a?.scene?.sys?.isActive?.() === true && (!all || a.artReady === true); }, allArt, { timeout: process.env.CI ? 180_000 : 60_000 });
  await page.waitForSelector('.overlay .panel', { timeout: 30_000 });
}

export async function waitFor<T>(fn: () => Promise<T>, pred: (v: T) => boolean, timeoutMs = 30000, pollMs = 100): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (pred(v)) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`waitFor timed out; last value: ${JSON.stringify(v)?.slice(0, 400)}`);
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

export async function startSolo(page: Page, query = '') {
  await page.goto(`/${query}`);
  await waitForGame(page);
  await page.click('button[data-a="play"]');
  await page.click('button[data-a="solo"]');
}
