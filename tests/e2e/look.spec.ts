import { test, type Browser, type Page } from '@playwright/test';
import { perchX, WORLD } from '../../src/config/world';
import { waitFor, gameState, waitForGame } from './helpers';

/**
 * Photo session for reviewing the look of the keep; run with LOOK=1. It checks nothing itself:
 * the pictures in mobile-screenshots/look/ are there to be looked at.
 */
test.skip(!process.env.LOOK, 'Only for reviewing the look: LOOK=1');

const SIZES = [
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'phone', width: 852, height: 393 },
];
const LANDS: [string, number][] = [['meadow', 2], ['canyon', 5], ['marsh', 8], ['snowpine', 11]];
const TIMES: [string, number][] = [['day', 6], ['dusk', 34], ['night', 49]];
const ALL_WEAPONS = ['cauldron', 'perch', 'wheel1', 'stomper1', 'comet1', 'mortar', 'bolter1'];

const sim = 'window.__fondue.session.sim';

async function open(browser: Browser, s: (typeof SIZES)[number]) {
  const context = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto('/?seed=77');
  await waitForGame(page);
  await page.click('button[data-a="play"]');
  await page.click('button[data-a="solo"]');
  await waitFor(() => gameState(page), (v) => v?.phase === 'battle', 20000);
  await page.evaluate(`document.querySelector('.toast-area')?.remove()`);
  return { context, page };
}

async function pose(page: Page, tier: number, day: number, t: number) {
  await page.evaluate(([tierN, dayN, time, weapons]) => {
    const app = (window as any).__fondue;
    const s = app.session.sim.s;
    s.spawnQueue = [];
    s.enemies = [];
    s.projectiles = [];
    s.day = dayN;
    s.dayT = time;
    s.meta.owned = ['gate0', ...['gate1', 'gate2', 'gate3', 'gate4'].slice(0, tierN as number), ...(weapons as string[])];
    s.meta.hornEquipped = 'mortar';
    s.meta.rev++;
    for (let i = 0; i < 5; i++) app.session.sim.spawnEnemy(i % 2 ? 'grunt' : 'bomber', 230 + i * 170);
    app.session.sim.setTuning({ ...app.session.sim.tuning, walkSpeed: 0.001 });
  }, [tier, day, t, ALL_WEAPONS] as const);
  await page.waitForTimeout(260);
}

for (const size of SIZES) {
  test(`look: ${size.name}, every stage in every landscape and time of day`, async ({ browser }) => {
    test.setTimeout(420_000);
    const { context, page } = await open(browser, size);
    for (const [land, day] of LANDS) {
      for (const [time, t] of TIMES) {
        for (let tier = 0; tier <= 4; tier++) {
          await pose(page, tier, day, t);
          await page.screenshot({ path: `mobile-screenshots/look/${size.name}-${land}-${time}-tier${tier}.png` });
        }
      }
    }
    await context.close();
  });

  test(`look: ${size.name}, the moments that matter`, async ({ browser }) => {
    test.setTimeout(240_000);
    const { context, page } = await open(browser, size);
    await pose(page, 2, 2, 12);
    const fieldW = (await page.evaluate(`${sim}.fieldW`)) as number;

    // Hanging on the hook, then the eagle.
    await page.evaluate(([x, y]) => {
      const sim = (window as any).__fondue.session.sim;
      const e = sim.spawnEnemy('grunt', x);
      e.st = 'air'; e.x = x; e.y = y; e.thrownBy = 0; e.vx = 0; e.vy = 0;
    }, [perchX(fieldW), WORLD.perch.hookY + 70]);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `mobile-screenshots/look/${size.name}-hook-hanging.png` });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `mobile-screenshots/look/${size.name}-hook-eagle.png` });
    await page.waitForTimeout(800);

    // The pot in both places, melting.
    for (const variant of ['front', 'back']) {
      await page.evaluate((v) => {
        const app = (window as any).__fondue;
        const sim = app.session.sim;
        sim.setFlags({ ...sim.s.meta.flags, cauldron: v });
        sim.s.potBusy = 0;
        sim.setTuning({ ...sim.tuning, cauldronSeconds: 3 });
        const e = sim.spawnEnemy('grunt', 420);
        (sim as any).enterPot(e, v === 'back' ? 290 : 345, v === 'back' ? 456 : 600);
      }, variant);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `mobile-screenshots/look/${size.name}-pot-${variant}.png` });
      await page.waitForTimeout(1800);
    }
    await context.close();
  });
}
