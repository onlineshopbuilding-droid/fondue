import { expect, test } from '@playwright/test';
import { PROFILE_KEY, STORAGE_PREFIX, V3_IMPORT_KEY } from '../../src/profile/schema';
import { waitForGame } from './helpers';

/**
 * Browser storage of v0.4 (V2) in the real game: the v0.3 save is imported once, and neither
 * fondue.v3.* nor the v0.2 save (fondue.profile) is ever changed or removed, through start, import,
 * saving, reset and reload. ?fresh=1 leaves the storage alone.
 */

const V3_PROFILE = JSON.stringify({
  format: 'fondue-profile', version: 1, profileId: 'v3-browser', name: 'Lenny',
  wallet: { cheese: 4, gold: 777, crests: 0 },
  keep: { castleTier: 1, handTier: 1, stations: { cauldron: 0, perch: 0 }, weapons: { wheel: { tier: 2 } }, loadout: ['wheel', null, null, null, null] },
  worlds: { fondue: { levelsDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cheese: {}, storyRead: [], scores: [], endlessBest: {} } },
  seen: { tutorial: true, enemies: [], tips: [], slotIntros: [1, 2, 3, 4], v3Notice: true },
});
const OLD: Record<string, string> = {
  'fondue.v3.profile': V3_PROFILE,
  'fondue.v3.dev.decisions': '{"D3-09":{"choice":"b","note":"äöü"}}',
  'fondue.profile': JSON.stringify({ version: 1, name: 'Tim', stars: 120 }),
};

const storage = (page: import('@playwright/test').Page) =>
  page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)!])));

test.beforeEach(async ({ context }) => {
  // Seeds the old saves once per test (sessionStorage flag), so a reload would show any change.
  await context.addInitScript((old: Record<string, string>) => {
    if (sessionStorage.getItem('test.seeded')) return;
    sessionStorage.setItem('test.seeded', '1');
    for (const [k, v] of Object.entries(old)) localStorage.setItem(k, v);
  }, OLD);
});

test('imports the v0.3 save once and never changes fondue.v3.* or fondue.profile', async ({ page }) => {
  await page.goto('/?menu=1');
  await waitForGame(page);
  const imported = await page.evaluate(() => {
    const d = (window as any).__fondue.profile.data;
    return { name: d.name, gold: d.wallet.gold, castle: d.keep.castleTier };
  });
  expect(imported).toEqual({ name: 'Lenny', gold: 777, castle: 5 });

  await page.evaluate(() => { const p = (window as any).__fondue.profile; p.edit((d: any) => { d.wallet.gold += 5; }); p.flushSync(); });
  await page.evaluate(() => { const p = (window as any).__fondue.profile; p.reset(); p.flushSync(); });
  await page.reload();
  await waitForGame(page);
  expect(await page.evaluate(() => (window as any).__fondue.profile.data.wallet.gold)).toBe(0);

  const after = await storage(page);
  for (const [k, v] of Object.entries(OLD)) expect(after[k], k).toBe(v);
  for (const k of Object.keys(after)) expect(k in OLD || k.startsWith(STORAGE_PREFIX), k).toBe(true);
  expect(after[PROFILE_KEY]).toBeTruthy();
  expect(JSON.parse(after[V3_IMPORT_KEY]).imported).toBe(true);
});

test('?fresh=1 neither imports nor writes anything', async ({ page }) => {
  await page.goto('/?menu=1&fresh=1');
  await waitForGame(page);
  expect(await page.evaluate(() => (window as any).__fondue.profile.data.wallet.gold)).toBe(0);
  expect(await storage(page)).toEqual(OLD);
});
