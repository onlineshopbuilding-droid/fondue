import { expect, test } from '@playwright/test';
import { FIRST_FIGHT_TIP, HELP_SLIDES, LOADING_TIPS, STATION_TIPS } from '../../src/ui/content';
import { KING_LOBBY_LINES, TUTORIAL_HINTS } from '../../src/config/worlds/fondue/story';
import { DEVICES, openGame, setCastleTier, tapStation, waitFor, waitForLobby, waitScreen } from './helpers';

/**
 * The lobby in v0.4 (B1–B5): the hall grows with the castle tier, the co-op and endless tables stand
 * broken until levels 3 and 10 are won, the shop opens from its station; texts without days, stars,
 * market or offerings.
 */

test('player texts of help, tips and the King speak of waves, cheese and gold only', () => {
  const texts = [
    ...HELP_SLIDES.flatMap((s) => [s.title, s.text]), ...LOADING_TIPS, ...Object.values(STATION_TIPS), FIRST_FIGHT_TIP,
    ...KING_LOBBY_LINES.map((l) => l.text), ...Object.values(TUTORIAL_HINTS),
  ];
  const stale = texts.filter((t) => /\bstars?\b|market|offering|armoury|\bdays?\b(?! long)|last day|next day/i.test(t));
  expect(stale).toEqual([]);
});

const lobbyOf = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const l = (window as any).__fondue.lobby;
  return { tier: l.hallTier as number, line: l.kingLine as string, spots: l.spots() as { id: string; r: number; open: boolean; x: number; y: number }[] };
});

const winLevels = (page: import('@playwright/test').Page, upTo: number) => page.evaluate((n) => {
  const a = (window as any).__fondue;
  a.profile.edit((d: any) => { d.seen.tutorial = true; });
  for (let l = 1; l <= n; l++) a.profile.markLevelDone(a.world, l);
  a.profile.flushSync();
}, upTo);

for (const d of DEVICES) {
  test(`${d.name}: the hall shows a different look for each of the seven castle tiers`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    await waitForLobby(page);
    for (let t = 1; t <= 7; t++) {
      await setCastleTier(page, t);
      await waitFor(() => lobbyOf(page), (s) => s.tier === t, 20_000);
      const { spots } = await lobbyOf(page);
      expect(spots.map((s) => s.id).sort()).toEqual(['armoury', 'campaign', 'coop', 'options', 'play']);
      // Every tap area is at least 44 CSS px across and lies on the screen.
      for (const s of spots) {
        expect(s.r * 2, s.id).toBeGreaterThanOrEqual(44);
        expect(s.x, s.id).toBeGreaterThan(0);
        expect(s.x, s.id).toBeLessThan(d.width);
      }
      await page.waitForTimeout(150);
      await page.screenshot({ path: `docs/screenshots/v0.4/lobby-tier${t}-${d.name}.png` });
    }
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${d.name}: co-op and endless tables stay broken until levels 3 and 10, then open; the shop opens from its station`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    await waitForLobby(page);
    await winLevels(page, 0);
    let s = await lobbyOf(page);
    expect(s.spots.find((p) => p.id === 'coop')!.open).toBe(false);
    expect(s.spots.find((p) => p.id === 'play')!.open).toBe(false);
    await page.screenshot({ path: `docs/screenshots/v0.4/lobby-tables-broken-${d.name}.png` });
    // Closed: the King explains instead of opening the page, at the first tap, also on the sign.
    const sign = s.spots.find((p) => p.id === 'play')! as unknown as { lx: number; ly: number };
    if (d.touch) await page.touchscreen.tap(sign.lx, sign.ly); else await page.mouse.click(sign.lx, sign.ly);
    await expect.poll(async () => (await lobbyOf(page)).line).toContain('Win level 10');
    await tapStation(page, 'coop', d.touch);
    await expect.poll(async () => (await lobbyOf(page)).line).toContain('Win level 3');
    expect(await page.evaluate(() => (window as any).__fondue.screen)).toBe('main');
    await tapStation(page, 'play', d.touch);
    await expect.poll(async () => (await lobbyOf(page)).line).toContain('Win level 10');
    expect(await page.evaluate(() => (window as any).__fondue.screen)).toBe('main');

    // Level 3 mends the co-op table only.
    await winLevels(page, 3);
    s = await waitFor(() => lobbyOf(page), (v) => v.spots.find((p) => p.id === 'coop')?.open === true);
    expect(s.spots.find((p) => p.id === 'play')!.open).toBe(false);
    await tapStation(page, 'coop', d.touch);
    await waitScreen(page, 'coop');
    await (d.touch ? page.tap('button[data-a="main"]') : page.click('button[data-a="main"]'));

    // Level 10 mends the endless table: it opens the endless page and its loadout.
    await winLevels(page, 10);
    await waitFor(() => lobbyOf(page), (v) => v.spots.find((p) => p.id === 'play')?.open === true);
    await waitForLobby(page);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `docs/screenshots/v0.4/lobby-tables-built-${d.name}.png` });
    await tapStation(page, 'play', d.touch);
    await waitScreen(page, 'play');
    await (d.touch ? page.tap('button[data-a="main"]') : page.click('button[data-a="main"]'));
    // A tap on a station's sign opens the station, like a tap on its picture.
    await waitForLobby(page);
    const shop = (await lobbyOf(page)).spots.find((p) => p.id === 'armoury')! as unknown as { lx: number; ly: number };
    if (d.touch) await page.touchscreen.tap(shop.lx, shop.ly); else await page.mouse.click(shop.lx, shop.ly);
    await waitScreen(page, 'armoury');
    expect(errors).toEqual([]);
    await context.close();
  });
}
