import { expect, test, type Page } from '@playwright/test';
import { WORLD, perchX } from '../../src/config/field';
import { SLOT_COUNT } from '../../src/config/slots';
import { firesOnItsOwn, weaponById } from '../../src/config/weapons';
import { DEVICES, clearField, equip, gameState, openGame, pointer, spawn, startEndless, waitFor, waitGame, type Device } from './helpers';

/** Everything about the keep in a fight, by mouse and by finger, on the three devices. */

const view = (page: Page) => page.evaluate(() => (window as any).__fondue.session.view());
/** Raiders the run has lost to a cause so far (the cauldron and the eagle are causes of their own). */
const killsBy = (page: Page, cause: string) => page.evaluate((c) => ((window as any).__fondue.session.sim.s.stats.killsByCause[c] ?? 0) as number, cause);
const slotCss = (page: Page, i: number) => page.evaluate((n) => (window as any).__fondue.scene.slotCss(n) as { x: number; y: number }, i);

async function fight(browser: Parameters<typeof openGame>[0], d: Device) {
  const o = await openGame(browser, d, '?menu=1&seed=31');
  await startEndless(o.page);
  await clearField(o.page);
  return o;
}

/** Taps a point of the screen with a finger or clicks it. */
async function tapCss(page: Page, d: Device, at: { x: number; y: number }) {
  if (d.touch) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
}

for (const d of DEVICES) {
  test(`${d.name}: the keep fills the left edge, every weapon fires with one tap and never grabs`, async ({ browser }) => {
    const { context, page, errors } = await fight(browser, d);

    // The keep stands at the left edge, the road fills the rest, and every slot is on screen.
    const v = await page.evaluate(() => (window as any).__fondue.scene.view);
    expect(v.offsetX).toBe(0);
    expect(v.width).toBeGreaterThanOrEqual(1280);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const c = await slotCss(page, i);
      expect(c.x, `slot ${i}`).toBeGreaterThanOrEqual(0);
      expect(c.y, `slot ${i}`).toBeGreaterThanOrEqual(0);
      expect(c.x, `slot ${i}`).toBeLessThanOrEqual(d.width * 0.3);
      expect(c.y, `slot ${i}`).toBeLessThanOrEqual(d.height);
    }
    // On a touch screen the finger is the hand: my own hand is not drawn. With a mouse it is.
    await page.mouse.move(d.width / 2, d.height / 2);
    if (d.touch) {
      const p = await pointer(page, true);
      await p.down(700, 400);
      await page.waitForTimeout(120);
      expect(await page.evaluate(() => (window as any).__fondue.scene.ownHandVisible())).toBe(false);
      await p.up();
    } else {
      await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.ownHandVisible() as boolean), (b) => b, 3000);
    }

    // One weapon of each kind of slot; a raider right at the gate and one further out.
    await equip(page, { 0: 'wheel', 1: 'stomper', 2: 'mortar', 3: 'comet', 4: 'bolter' });
    await spawn(page, 'grunt', WORLD.gateX + 24);
    await spawn(page, 'grunt', 620);
    await waitFor(() => view(page), (s) => s.enemies.length === 2, 3000);
    await page.screenshot({ path: `mobile-screenshots/keep-${d.name}.png` });
    // A weapon only fires at a target, so these two are made sturdy enough to outlive all five shots.
    await page.evaluate(() => { for (const e of (window as any).__fondue.session.sim.s.enemies) { e.hp = 20000; e.maxHp = 20000; } });
    for (let i = 0; i < SLOT_COUNT; i++) {
      await tapCss(page, d, await slotCss(page, i));
      await waitGame(page, () => view(page), (s) => s.cooldowns[i] > 0, 4);
      const s = await gameState(page);
      expect(s!.enemies.every((e: any) => e.heldBy.length === 0), `tap on slot ${i} grabbed nobody: ${JSON.stringify(s!.enemies)}`).toBe(true);
    }
    await page.screenshot({ path: `mobile-screenshots/weapons-fired-${d.name}.png` });
    // The shots hit: the raiders lose hit points.
    await waitGame(page, () => view(page), (s) => s.enemies.some((e: any) => e.hpFrac < 1), 15);

    // A raider at the gate can still be grabbed right next to the weapons, and a grab fires nothing.
    await clearField(page);
    // Nothing of the five shots is left on the road either (burning cheese, shells still on their way):
    // on a slow machine they would kill the next raider before the hand gets to it, and the kill below
    // must come from the throw.
    await page.evaluate(() => { const s = (window as any).__fondue.session.sim.s; s.cooldowns = s.cooldowns.map(() => 0); s.zones = []; s.delayed = []; });
    await spawn(page, 'grunt', WORLD.gateX + 26);
    const e = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
    const kills = (await gameState(page))!.kills;
    const p = await pointer(page, d.touch);
    await p.down(e.x + 4, e.y - 44);
    await waitGame(page, () => gameState(page), (s) => s!.enemies[0]?.st === 'held', 3);
    // A weapon of the passive slot fires by itself once reloaded; every tap weapon must still be ready.
    const slots = await page.evaluate(() => (window as any).__fondue.session.meta().loadout.slotWeapon as (string | null)[]);
    const tapSlots = slots.map((id, i) => ({ id, i })).filter(({ id }) => { const w = id ? weaponById(id) : undefined; return !!w && !firesOnItsOwn(w); });
    expect(tapSlots.length).toBeGreaterThanOrEqual(4);
    const cds = (await view(page)).cooldowns as number[];
    expect(tapSlots.every(({ i }) => cds[i] === 0), `no tap weapon fired on the grab: ${JSON.stringify(cds)}`).toBe(true);
    await p.glide(e.x + 4, e.y - 44, e.x + 30, 90);
    await p.up();
    // Its flight and fall take game time, which runs slower than real time where frames are slow.
    await waitGame(page, () => gameState(page), (s) => s!.kills > kills, 8);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${d.name}: a keg is shaken loose, a raider melts in the pot behind the keep, the eagle takes one`, async ({ browser }) => {
    const { context, page, errors } = await fight(browser, d);
    await equip(page, {}, ['cauldron', 'perch']);
    const p = await pointer(page, d.touch);

    // Keg Hauler: grabbed and shaken, his keg comes loose and he no longer carries it.
    await spawn(page, 'bomber', 700);
    const keg = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
    expect(keg.armed).toBe(true);
    await p.down(keg.x, keg.y - 44);
    await waitFor(() => gameState(page), (s) => s!.enemies[0]?.st === 'held', 3000);
    let x = keg.x;
    const y = 330;
    await p.glide(keg.x, keg.y - 44, x, y, 6, 10);
    // A shake as a hand does it: strokes of about a tenth of a second, back and forth.
    const stroke = async (i: number) => {
      const to = i % 2 === 0 ? x + 140 : x - 140;
      await p.glide(x, y, to, y, 5, 20);
      x = to;
    };
    // Two strokes first: the progress shows before the keg comes loose.
    for (let i = 0; i < 2; i++) await stroke(i);
    expect(await page.evaluate(() => (window as any).__fondue.scene.kegShakeProgress() as number), 'the shake shows its progress').toBeGreaterThan(0);
    for (let i = 2; i < 9; i++) await stroke(i);
    await waitFor(() => page.evaluate(() => (window as any).__fondue.session.sim.s.stats.kegsShaken as number), (n) => n === 1, 3000);
    const hauler = (await gameState(page))!.enemies.find((q: any) => q.id === keg.id);
    if (hauler) expect(hauler.armed, 'the hauler no longer carries his keg').toBe(false);
    await page.screenshot({ path: `mobile-screenshots/keg-loose-${d.name}.png` });
    await p.up();

    // The cauldron stands behind the keep: a raider let go above it is cooked and counts as the cauldron's kill.
    await clearField(page);
    await spawn(page, 'grunt', 620);
    const g = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
    const cooked = await killsBy(page, 'cauldron');
    const eaten = await killsBy(page, 'eagle');
    await p.down(g.x, g.y - 44);
    await waitFor(() => gameState(page), (s) => s!.enemies[0]?.st === 'held', 3000);
    // Carried over the pot and let go there, without a throw.
    await p.glide(g.x, g.y - 44, WORLD.cauldron.x, WORLD.cauldron.rimY - 30, 16, 25);
    await p.up(160);
    await waitFor(() => gameState(page), (s) => s!.enemies[0]?.st === 'cooking', 4000, 30);
    expect((await gameState(page))!.potBusy).toBeGreaterThan(0);
    await page.screenshot({ path: `mobile-screenshots/cauldron-${d.name}.png` });
    await waitGame(page, () => killsBy(page, 'cauldron'), (n) => n === cooked + 1, 15);
    await waitGame(page, () => gameState(page), (s) => s!.potBusy === 0, 15);

    // The eagle hook hangs at the top right and takes one raider at a time.
    await clearField(page);
    await spawn(page, 'grunt', 800);
    const h = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
    const fieldW = await page.evaluate(() => (window as any).__fondue.session.sim.fieldW as number);
    const hook = perchX(fieldW);
    const hookCss = await page.evaluate(([a, b]) => (window as any).__fondue.scene.worldToCss(a, b), [hook, WORLD.perch.hookY]);
    expect(hookCss.x).toBeGreaterThan(d.width * 0.7);
    expect(hookCss.y).toBeGreaterThan(await page.evaluate(() => (window as any).__fondue.scene.hudBottomCss()));
    // Carried up to the hook and let go there, without a throw: the eagle does not take it (C6).
    await p.down(h.x, h.y - 44);
    await waitFor(() => gameState(page), (s) => s!.enemies[0]?.st === 'held', 3000);
    await p.glide(h.x, h.y - 44, hook, WORLD.perch.hookY, 16, 25);
    await p.up(160);
    let hookedByDrop = false;
    await waitFor(() => gameState(page), (s) => {
      const q = s!.enemies.find((r: any) => r.id === h.id);
      if (q?.st === 'hooked') hookedByDrop = true;
      return hookedByDrop || !q || (q.st !== 'held' && q.st !== 'air');
    }, 6000, 30);
    expect(hookedByDrop, 'a raider only carried to the hook and let go is not caught').toBe(false);
    expect(await page.evaluate(() => (window as any).__fondue.session.sim.s.perchBusy as number)).toBe(0);

    // A real throw at the hook is caught: carried down and to the left of it, then flung straight at it.
    await clearField(page);
    await spawn(page, 'grunt', 800);
    const t = (await waitFor(() => gameState(page), (s) => s!.enemies.length === 1, 3000))!.enemies[0];
    // The finger holds the raider 44 above its feet; its collar (0.3 of the body) is what meets the hook.
    // The aim point sits a little above, for the drop during the short flight.
    const aimX = hook;
    const aimY = WORLD.perch.hookY + 87 * 0.3 - 44 - 14;
    const dir = { x: Math.cos(Math.PI / 6), y: -Math.sin(Math.PI / 6) };
    const from = { x: aimX - 240 * dir.x, y: aimY - 240 * dir.y };
    const to = { x: aimX - 60 * dir.x, y: aimY - 60 * dir.y };
    await p.down(t.x, t.y - 44);
    await waitFor(() => gameState(page), (s) => s!.enemies[0]?.st === 'held', 3000);
    await p.glide(t.x, t.y - 44, from.x, from.y, 16, 25);
    // Let the raider settle in the hand, then a quick flick along the line to the hook (about 1500 px/s).
    await page.waitForTimeout(400);
    await p.glide(from.x, from.y, to.x, to.y, 10, 12);
    await p.up();
    await waitFor(() => gameState(page), (s) => s!.enemies[0]?.st === 'hooked', 4000, 30);
    await page.screenshot({ path: `mobile-screenshots/hook-${d.name}.png` });
    // The game clock falls behind real time on a software renderer, so the meal gets a long limit.
    await waitGame(page, () => killsBy(page, 'eagle'), (n) => n === eaten + 1, 30);
    expect(errors).toEqual([]);
    await context.close();
  });
}
