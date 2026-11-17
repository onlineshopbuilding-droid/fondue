import { expect, test, type Page } from '@playwright/test';
import { ENEMIES, type EnemyType } from '../../src/config/enemies';
import { DEFAULT_WORLD, levelOf } from '../../src/config/worlds';
import { GUIDE } from '../../src/render/tutorialGuide';
import { DEVICES, GAME_WAIT, endLevel, gameState, openGame, pointer, station, waitFor, waitPhase, waitScreen, type Device } from '../e2e/helpers';

/**
 * Etappe 5, independent check (pruefer): a fresh profile on each format plays the prelude, then levels 1 to 11
 * one after the other. Between levels it uses only the shop UI (unlock with cheese, upgrade with gold, wear).
 * Levels are won with the same shortcut as the tutorial test (jump to the last wave, count the level's gold as
 * if every raider were beaten). Nothing is unlocked by cheat. Screenshots land in docs/screenshots/v0.3/check-*.png.
 */
const SHOTS = 'docs/screenshots/v0.3';
const stage = (page: Page) => page.evaluate(() => (window as any).__fondue.scene.tutorialStage() as string);
const mode = (page: Page) => page.evaluate(() => (window as any).__fondue.session?.meta()?.rules.mode as string | undefined);

function levelGold(level: number): number {
  let gold = 0;
  for (const w of levelOf(DEFAULT_WORLD, level)!.waves) for (const [t, n] of Object.entries(w.counts)) gold += ENEMIES[t as EnemyType].gold * (n ?? 0);
  return gold;
}
const tapAt = (page: Page, d: Device, x: number, y: number) => (d.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
async function press(page: Page, d: Device, selector: string) {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();
  if (d.touch) await el.tap(); else await el.click();
}
async function shot(page: Page, path: string) {
  try { await page.screenshot({ path, timeout: 90_000 }); } catch (e) { console.log(`SCREENSHOT FAILED ${path}: ${String(e).slice(0, 80)}`); }
}
const note = (notes: string[], line: string) => { notes.push(line); console.log(line); };
const snap = (page: Page) => page.evaluate(() => {
  const dd = (window as any).__fondue.profile.data;
  return { wallet: { ...dd.wallet }, castle: dd.keep.castleTier, hand: dd.keep.handTier, loadout: [...dd.keep.loadout], weapons: Object.fromEntries(Object.entries(dd.keep.weapons).map(([k, v]: any) => [k, v.tier])), stations: { ...dd.keep.stations } };
});

/** In the shop: spend cheese and gold through the buttons until nothing more is affordable, and wear what fits an empty slot. */
async function shopSpree(page: Page, d: Device, log: string[], shotName?: string) {
  await waitScreen(page, 'armoury');
  const spots = await page.locator('.sh-spot').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.spot as string));
  for (let round = 0; round < 6; round++) {
    let bought = 0;
    for (const spot of spots) {
      await press(page, d, `#spot-${spot}`);
      for (let guard = 0; guard < 12; guard++) {
        const btn = page.locator('#shopSide button[data-a="buy"]:not([disabled])').first();
        if ((await btn.count()) === 0) break;
        const label = (await btn.innerText()).replace(/\s+/g, ' ');
        const card = await btn.evaluate((b) => (b.closest('[data-weapon-card]') as HTMLElement | null)?.dataset.weaponCard ?? (b.closest('#shopSide') as HTMLElement).dataset.spot);
        if (d.touch) await btn.tap(); else await btn.click();
        log.push(`buy ${spot}/${card}: ${label}`);
        bought++;
      }
      if (/^slot/.test(spot)) {
        // An empty open slot gets its first owned weapon.
        const wear = page.locator('#shopSide button[data-a="equip"]').first();
        const worn = await page.locator('#shopSide .sw-row.worn').count();
        if (worn === 0 && (await wear.count()) > 0) { await press(page, d, '#shopSide button[data-a="equip"]'); log.push(`wear in ${spot}`); bought++; }
      }
    }
    if (bought === 0) break;
  }
  if (shotName) await shot(page, `${SHOTS}/${shotName}`);
}

for (const d of DEVICES) {
  test(`check ${d.name}: fresh profile, prelude, levels 1 to 11, shop in between`, async ({ browser }) => {
    test.setTimeout(900_000);
    const notes: string[] = [];
    const { context, page, errors } = await openGame(browser, d, '?seed=3');
    await waitFor(() => mode(page), (m) => m === 'tutorial', GAME_WAIT);
    // Prelude with the real gesture.
    await waitFor(() => stage(page), (s) => s === 'show', GAME_WAIT * 2);
    await shot(page, `${SHOTS}/check-${d.name}-1-prelude.png`);
    const fieldW = await page.evaluate(() => (window as any).__fondue.session.sim.fieldW as number);
    const target = (await gameState(page))!.enemies
      .filter((e: any) => (e.st === 'walk' || e.st === 'attack') && e.x >= GUIDE.targetMinX && e.x <= fieldW - GUIDE.targetInsetRight)
      .sort((a: any, b: any) => a.x - b.x)[0];
    expect(target).toBeTruthy();
    const p = await pointer(page, d.touch);
    await p.down(target.x - 4, target.y - 44);
    await waitFor(() => stage(page), (st) => st === 'try', 5000);
    await p.glide(target.x - 4, target.y - 44, target.x - 30, 80, 8, 12);
    await p.up();
    await waitFor(() => stage(page), (st) => st === 'praise', 8000);
    await waitFor(() => stage(page), (st) => st === 'wheel', GAME_WAIT);
    await page.waitForTimeout(400);
    const wheelAt = await page.evaluate(() => (window as any).__fondue.scene.slotCss(0) as { x: number; y: number });
    await tapAt(page, d, wheelAt.x, wheelAt.y);
    await waitFor(() => stage(page), (st) => st === 'wheelDone' || st === '', 8000);
    await endLevel(page);
    await waitFor(() => mode(page), (m) => m === 'campaign', GAME_WAIT);
    note(notes, `after prelude: ${JSON.stringify(await snap(page))}`);

    for (let level = 1; level <= 11; level++) {
      await waitPhase(page, ['banner', 'battle']);
      expect((await gameState(page))!.level).toBe(level);
      if (level === 1 || level === 4 || level === 7 || level === 11) {
        await page.waitForTimeout(1500);
        await shot(page, `${SHOTS}/check-${d.name}-battle-l${level}.png`);
      }
      await page.evaluate((g) => { (window as any).__fondue.session.sim.s.stats.goldEarned = g; }, levelGold(level));
      await endLevel(page);
      await waitScreen(page, 'won');
      const won = await page.evaluate(() => ({ cheese: document.querySelector('#wonCheese')?.textContent, gold: document.querySelector('#runGold')?.textContent, king: document.querySelector('#kingSays')?.textContent?.slice(0, 120), unlocks: [...document.querySelectorAll('#unlocks li')].map((e) => e.textContent) }));
      note(notes, `level ${level} won: ${JSON.stringify(won)}`);
      if ([1, 2, 4, 7, 11].includes(level)) await shot(page, `${SHOTS}/check-${d.name}-won-l${level}.png`);
      await press(page, d, '#continue');
      // Where does Continue lead? (level 1 leads into the shop, later levels to the lobby or the map)
      await waitFor(() => page.evaluate(() => (window as any).__fondue.screen as string), (s) => s !== 'won', GAME_WAIT);
      const where = await page.evaluate(() => (window as any).__fondue.screen as string);
      note(notes, `  continue leads to: ${where}`);
      if (where !== 'armoury') {
        if (where !== 'main') note(notes, `  (unexpected screen ${where})`);
        await station(page, 'armoury');
      }
      const log: string[] = [];
      await shopSpree(page, d, log, [1, 2, 4, 7, 11].includes(level) ? `check-${d.name}-shop-l${level}.png` : undefined);
      note(notes, `  shop: ${log.join(' | ') || 'nothing bought'}`);
      note(notes, `  keep: ${JSON.stringify(await snap(page))}`);
      if (level === 11) break;
      await press(page, d, '#shop [data-a="main"]');
      await station(page, 'campaign');
      await press(page, d, `.cm-st[data-level="${level + 1}"]`);
      if (level + 1 === 2 || level + 1 === 5) await shot(page, `${SHOTS}/check-${d.name}-levelcard-l${level + 1}.png`);
      await press(page, d, '#playLevel');
    }
    // After level 11: five slots open, endless open.
    const end = await page.evaluate(() => { const a = (window as any).__fondue; return { loadout: [0, 1, 2, 3, 4].map((i) => a.profile.data.keep.loadout[i]), levels: a.profile.data.worlds.fondue.levelsDone.length }; });
    note(notes, `END: ${JSON.stringify(end)}`);
    await press(page, d, '#shop [data-a="main"]');
    await page.waitForTimeout(1200);
    await shot(page, `${SHOTS}/check-${d.name}-lobby-end.png`);
    // Start level 12 to see five slots on the battle screen.
    await station(page, 'campaign');
    await press(page, d, '.cm-st[data-level="12"]');
    await press(page, d, '#playLevel');
    await waitPhase(page, ['banner', 'battle']);
    await page.waitForTimeout(2500);
    await shot(page, `${SHOTS}/check-${d.name}-battle-l12-five-slots.png`);
    console.log(`PLAYTHROUGH ${d.name}\n${notes.join('\n')}`);
    expect(errors).toEqual([]);
    await context.close();
  });
}
