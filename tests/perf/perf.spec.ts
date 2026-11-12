import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { closePopups, gameState, startSolo, waitFor } from '../e2e/helpers';

test.use({
  headless: false,
  launchOptions: { args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] },
});

/** Run by hand: npx playwright test --config playwright.perf.config.ts */
test('frame rate with 200 enemies and effects', async ({ page }) => {
  await startSolo(page, '?menu=1&seed=31');
  await waitFor(() => gameState(page), (s) => s?.phase === 'battle');
  await closePopups(page);
  const result = await page.evaluate(async () => {
    const app = (window as any).__fondue;
    const sim = app.session.sim;
    sim.s.spawnQueue = [];
    sim.s.dayT = 2;
    const types = ['grunt', 'bomber', 'goatRider', 'pogo', 'hexer', 'slinger', 'balloonist', 'shade', 'crowcaller'];
    const fill = () => {
      while (sim.s.enemies.length < 200) sim.spawnEnemy(types[sim.s.enemies.length % types.length], 300 + Math.random() * 960);
    };
    fill();
    sim.s.gateHp = 1e9;
    sim.s.gateMax = 1e9;
    const frames: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      const start = last;
      let n = 0;
      const loop = () => {
        const now = performance.now();
        frames.push(now - last);
        last = now;
        // Keep the screen busy: a continuous stream of deaths with full effects.
        fill();
        sim.s.dayT = Math.min(sim.s.dayT, 40);
        if (n++ % 6 === 0) {
          const e = sim.s.enemies.find((q: any) => q.st === 'walk' || q.st === 'attack');
          if (e) {
            sim.command({ k: 'press', p: 0, x: e.x, y: e.y - 30 });
            sim.command({ k: 'release', p: 0, x: e.x, y: e.y - 120, vx: 0, vy: -1400 });
          }
        }
        if (now - start < 8000) requestAnimationFrame(loop);
        else resolve();
      };
      requestAnimationFrame(loop);
    });
    frames.shift();
    frames.sort((a, b) => a - b);
    const avg = frames.reduce((x, y) => x + y, 0) / frames.length;
    return { avgFps: 1000 / avg, medianMs: frames[Math.floor(frames.length / 2)], p95Ms: frames[Math.floor(frames.length * 0.95)], frames: frames.length, enemies: sim.s.enemies.length };
  });
  console.log(JSON.stringify(result));
  writeFileSync('docs/perf-latest.json', JSON.stringify(result, null, 2));
});
