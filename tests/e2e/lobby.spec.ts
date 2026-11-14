import { expect, test } from '@playwright/test';
import { FIRST_FIGHT_TIP, HELP_SLIDES, LOADING_TIPS, STATION_TIPS } from '../../src/ui/content';
import { KING_LOBBY_LINES, TUTORIAL_HINTS } from '../../src/config/worlds/fondue/story';
import { DEVICES, openGame, tapStation, waitForLobby, waitScreen } from './helpers';

/** The lobby in v0.3 (D3): the shop station, the endless pot locked until the fifth slot, texts without days, stars, market or offerings. */

test('player texts of help, tips and the King speak of waves, cheese and gold only', () => {
  const texts = [
    ...HELP_SLIDES.flatMap((s) => [s.title, s.text]), ...LOADING_TIPS, ...Object.values(STATION_TIPS), FIRST_FIGHT_TIP,
    ...KING_LOBBY_LINES.map((l) => l.text), ...Object.values(TUTORIAL_HINTS),
  ];
  const stale = texts.filter((t) => /\bstars?\b|market|offering|armoury|\bdays?\b(?! long)|last day|next day/i.test(t));
  expect(stale).toEqual([]);
});

for (const d of DEVICES) {
  test(`${d.name}: endless is locked with a hint until the fifth slot, then opens; the shop opens from its station`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    await waitForLobby(page);
    const ids = (await page.evaluate(() => (window as any).__fondue.lobby.spots().map((s: any) => s.id))) as string[];
    expect(ids).toContain('play');
    expect(ids).toContain('armoury');
    // Closed: the King explains instead of opening the page.
    await tapStation(page, 'play', d.touch);
    await expect.poll(() => page.evaluate(() => (window as any).__fondue.lobby.kingLine as string)).toContain('Endless opens');
    expect(await page.evaluate(() => (window as any).__fondue.screen)).toBe('main');
    await page.screenshot({ path: `docs/screenshots/v0.3/lobby-endless-locked-${d.name}.png` });
    // With the fifth slot open, the pot opens the endless page and its loadout.
    await page.evaluate(() => { const a = (window as any).__fondue; for (let l = 1; l <= 11; l++) a.profile.markLevelDone(a.world, l); a.profile.flushSync(); });
    await page.reload();
    await tapStation(page, 'play', d.touch);
    await waitScreen(page, 'play');
    await expect(page.locator('#loadout .lo-tile')).toHaveCount(5);
    await page.screenshot({ path: `docs/screenshots/v0.3/lobby-endless-${d.name}.png` });
    await (d.touch ? page.tap('button[data-a="main"]') : page.click('button[data-a="main"]'));
    await tapStation(page, 'armoury', d.touch);
    await waitScreen(page, 'armoury');
    await expect(page.locator('#shop h2')).toHaveText('Keep Shop');
    expect(errors).toEqual([]);
    await context.close();
  });
}
