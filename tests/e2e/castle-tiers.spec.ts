import { expect, test, type Page } from '@playwright/test';
import { SLOT_COUNT } from '../../src/config/slots';
import { CASTLE_ART_TIERS } from '../../src/art/castle/tiers';
import { DEVICES, LAPTOP, openGame, startEndless, type Device } from './helpers';

/**
 * Pictures of the seven castle tiers (C7, issue 1) on the three formats, plus the top tier in every
 * landscape at day, dusk and night. The tier is shown through the castle view's preview hook, so the
 * pictures do not depend on buying the tiers first. All five slots carry a weapon, to check that the
 * art leaves them free.
 */

const OUT = 'docs/screenshots/v0.3';
const SLOTS_FILLED: Record<number, string> = { 0: 'wheel', 1: 'stomper', 2: 'mortar', 3: 'comet', 4: 'bolter' };

/** Puts the scene into a quiet fight: a few raiders near the gate, all slots filled, the given light. */
async function stage(page: Page, land: string, share: number, night: boolean) {
  // Tips and enemy cards are not part of the castle; keep them out of the pictures.
  await page.addStyleTag({ content: '#enemyPopup, .enemy-popup, .toast { display: none !important; }' });
  await page.evaluate(([l, k, n, slots]) => {
    const a = (window as any).__fondue;
    const sim = a.session.sim;
    const s = sim.s;
    s.spawnQueue = [];
    s.enemies = [];
    s.projectiles = [];
    const meta = s.meta;
    // Landscape and light come with the wave: in endless one cycle of eight waves runs from day to night.
    sim.freezeWaves();
    s.wave = Math.floor((k as number) * 8) + 1;
    meta.wave = { ...meta.wave, landscape: l, night: n };
    try {
      const lo = meta.loadout;
      for (const [i, id] of Object.entries(slots as Record<string, string>)) {
        if (meta.rules?.slotsOpen) meta.rules.slotsOpen[Number(i)] = true;
        lo.slotWeapon[Number(i)] = id;
        lo.weaponTier[id] = lo.weaponTier[id] ?? 1;
      }
      s.cooldowns = s.cooldowns.map(() => 0);
    } catch { /* weapons are only decoration here */ }
    if (sim.setTuning) sim.setTuning({ ...sim.tuning, walkSpeed: 0.0001 });
    for (const [kind, x] of [['grunt', 236], ['grunt', 330], ['grunt', 470], ['grunt', 640]] as const) {
      try { sim.spawnEnemy(kind, x); } catch { /* fine without raiders */ }
    }
    meta.rev++;
  }, [land, share, night, SLOTS_FILLED] as const);
}

async function showTier(page: Page, tier: number) {
  await page.evaluate((t) => { (window as any).__fondue.scene.castle.previewTier = t; }, tier);
  // The bigger stages are made in the background after boot; wait until the asked one is on screen.
  await page.waitForFunction((t) => {
    const c = (window as any).__fondue.scene.castle;
    return c.keep.texture.key === `prop:keep${t - 1}`;
  }, tier, { timeout: 90_000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

for (const d of DEVICES) {
  test(`${d.name}: all seven castle tiers stand in the landscape with free slots`, async ({ browser }) => {
    test.setTimeout(300_000);
    const { context, page, errors } = await openGame(browser, d, '?menu=1&seed=51');
    await startEndless(page);
    await stage(page, 'meadow', 0.2, false);
    for (let t = 1; t <= CASTLE_ART_TIERS; t++) {
      await showTier(page, t);
      // Every slot stays on screen at every tier.
      for (let i = 0; i < SLOT_COUNT; i++) {
        const c = await page.evaluate((n) => (window as any).__fondue.scene.slotCss(n) as { x: number; y: number }, i);
        expect(c.x, `tier ${t} slot ${i}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `tier ${t} slot ${i}`).toBeLessThanOrEqual(d.height);
      }
      await page.screenshot({ path: `${OUT}/castle-tier${t}-${d.name}.png` });
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('laptop: the top tier fits every landscape at day, dusk and night', async ({ browser }) => {
  test.setTimeout(300_000);
  const d: Device = LAPTOP;
  const { context, page, errors } = await openGame(browser, d, '?menu=1&seed=51', { allArt: true });
  await startEndless(page);
  const shots: [string, string, number, boolean][] = [
    ['meadow', 'day', 0.2, false], ['canyon', 'dusk', 0.72, false], ['marsh', 'day', 0.3, false], ['snowpine', 'night', 0.95, true],
  ];
  for (const [land, name, share, night] of shots) {
    await stage(page, land, share, night);
    await showTier(page, CASTLE_ART_TIERS);
    await page.screenshot({ path: `${OUT}/castle-land-${land}-${name}.png` });
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('wide screen: the road ends at the gate, nothing runs on left of the keep', async ({ browser }) => {
  test.setTimeout(300_000);
  const wide: Device = { name: 'wide', width: 1568, height: 560, touch: false };
  const { context, page, errors } = await openGame(browser, wide, '?menu=1&seed=51');
  await startEndless(page);
  await stage(page, 'meadow', 0.2, false);
  const v = await page.evaluate(() => (window as any).__fondue.scene.view);
  // The keep stands at the very left edge of the screen: nothing of the world left of it shows.
  expect(v.offsetX).toBe(0);
  for (const t of [1, CASTLE_ART_TIERS]) {
    await showTier(page, t);
    await page.screenshot({ path: `${OUT}/castle-wide-tier${t}.png` });
  }
  expect(errors).toEqual([]);
  await context.close();
});
