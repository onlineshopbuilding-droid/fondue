import { test, type Browser, type Page } from '@playwright/test';
import { LAND_NAMES } from '../../src/art/registry';
import { perchX, WORLD } from '../../src/config/field';
import { CASTLE_TIERS as GATES } from '../../src/config/keep';
import { openGame, startEndless, type Device } from './helpers';

/**
 * Photo session for reviewing the look of the keep; run with LOOK=1. It checks nothing itself:
 * the pictures in mobile-screenshots/look/ are there to be looked at.
 */
test.skip(!process.env.LOOK, 'Only for reviewing the look: LOOK=1');

const SIZES: Device[] = [
  { name: 'laptop', width: 1280, height: 720, touch: false },
  { name: 'phone', width: 852, height: 393, touch: true },
];
const TIMES: [string, number, boolean][] = [['day', 0.15, false], ['dusk', 0.8, false], ['night', 0.97, true]];
/** One weapon in every slot, both offering sites. */
const FULL = { slotWeapon: ['wheel', 'stomper', 'mortar', 'comet', 'bolter'], stations: { cauldron: true, perch: true } };

const frames = (page: Page, n = 6) => page.evaluate((k) => new Promise<void>((r) => {
  let left = k;
  const step = () => { if (--left <= 0) r(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), n);

async function open(browser: Browser, s: Device) {
  const o = await openGame(browser, s, '?menu=1&seed=77', { allArt: true });
  await startEndless(o.page);
  await o.page.evaluate(`document.querySelector('.toast-area')?.remove()`);
  return o;
}

async function pose(page: Page, tier: number, land: string, share: number, night: boolean) {
  await page.evaluate(([tierN, l, k, n, full]) => {
    const sim = (window as any).__fondue.session.sim;
    const s = sim.s;
    s.spawnQueue = [];
    s.enemies = [];
    s.projectiles = [];
    // The sky follows the waves: in endless one cycle of eight waves runs from day to night.
    sim.freezeWaves();
    s.wave = Math.floor((k as number) * 8) + 1;
    s.meta.wave = { ...s.meta.wave, landscape: l, night: n };
    const loadout = s.meta.loadout;
    loadout.gateTier = tierN;
    loadout.slotWeapon = [...(full as typeof FULL).slotWeapon];
    for (const w of loadout.slotWeapon) loadout.weaponTier[w] = 1;
    loadout.stations = { ...(full as typeof FULL).stations };
    s.meta.rev++;
    for (let i = 0; i < 5; i++) sim.spawnEnemy(i % 2 ? 'grunt' : 'bomber', 230 + i * 170);
    sim.setTuning({ ...sim.tuning, walkSpeed: 0.001 });
  }, [tier, land, share, night, FULL] as const);
  await frames(page);
}

for (const size of SIZES) {
  test(`look: ${size.name}, every stage in every landscape and time of day`, async ({ browser }) => {
    test.setTimeout(420_000);
    const { context, page } = await open(browser, size);
    for (const land of LAND_NAMES) {
      for (const [time, share, night] of TIMES) {
        for (let tier = 0; tier < GATES.length; tier++) {
          await pose(page, tier, land, share, night);
          await page.screenshot({ path: `mobile-screenshots/look/${size.name}-${land}-${time}-tier${tier}.png` });
        }
      }
    }
    await context.close();
  });

  test(`look: ${size.name}, the moments that matter`, async ({ browser }) => {
    test.setTimeout(240_000);
    const { context, page } = await open(browser, size);
    await pose(page, 2, 'meadow', 0.3, false);
    const fieldW = (await page.evaluate(() => (window as any).__fondue.session.sim.fieldW)) as number;

    // Hanging on the hook, then the eagle.
    await page.evaluate(([x, y]) => {
      const sim = (window as any).__fondue.session.sim;
      const e = sim.spawnEnemy('grunt', x);
      e.st = 'air'; e.x = x; e.y = y; e.thrownBy = 0; e.vx = 0; e.vy = 0;
    }, [perchX(fieldW), WORLD.perch.hookY + 70]);
    await frames(page, 10);
    await page.screenshot({ path: `mobile-screenshots/look/${size.name}-hook-hanging.png` });
    await frames(page, 30);
    await page.screenshot({ path: `mobile-screenshots/look/${size.name}-hook-eagle.png` });

    // The pot behind the keep, melting.
    await page.evaluate(() => {
      const sim = (window as any).__fondue.session.sim;
      sim.s.potBusy = 0;
      sim.enterPot(sim.spawnEnemy('grunt', 420));
    });
    await frames(page, 30);
    await page.screenshot({ path: `mobile-screenshots/look/${size.name}-pot.png` });
    await context.close();
  });
}
