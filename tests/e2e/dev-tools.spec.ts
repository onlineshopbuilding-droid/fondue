import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { GAME_VERSION } from '../../src/config/game';
import { CASTLE_TIERS } from '../../src/config/keep';
import { CASTLE_TIER_LEVEL } from '../../src/config/slotTiers';
import { VERSIONS, versionUrl } from '../../src/config/versions';
import { STORAGE_PREFIX } from '../../src/profile/schema';
import { GAME_WAIT, startSolo, station, waitForGame } from './helpers';

/**
 * Developer tools of v0.3 (F1 weapon editor, F2 cheats, F3/F4 developer overview), on the laptop.
 * The game state is read through window.__fondue.
 */

const openMenu = async (page: Page) => {
  if (!(await page.locator('#tuning').isVisible())) await page.keyboard.press('F1');
  await expect(page.locator('#tuning')).toBeVisible();
};

const profile = (page: Page) => page.evaluate(() => {
  const d = (window as any).__fondue.profile.data;
  return { wallet: d.wallet, keep: d.keep, cheats: d.cheats.used, won: Math.max(0, ...(d.worlds.fondue?.levelsDone ?? [0])), flags: d.settings.flags };
});

test('weapon editor: a shorter cooldown reaches the running game and the run becomes a developer run', async ({ page }) => {
  await startSolo(page, '?menu=1&fresh=1&seed=5');
  // The Rolling Wheel in the damage slot of this run, whatever the fresh profile owns.
  await page.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.loadout.slotWeapon[0] = 'wheel';
    sim.loadout.weaponTier.wheel = sim.loadout.weaponTier.wheel ?? 1;
  });
  const before = await page.evaluate(() => {
    const a = (window as any).__fondue;
    return { devRun: a.session.sim.s.meta.devRun as boolean, tier: a.session.sim.loadout.weaponTier.wheel ?? 1 };
  });
  expect(before.devRun).toBe(false);
  await openMenu(page);
  await page.locator('#devWeaponEditor > summary').click();
  await page.locator('#devEditWeapon').selectOption('wheel');
  await page.locator(`#devEditTier${before.tier}`).click();
  const field = page.locator('#devW-cooldown');
  await field.fill('1.5');
  await field.dispatchEvent('change');
  await expect(page.locator('#devEditCount')).toHaveText('1 changed');
  await page.keyboard.press('F1');
  // A raider on the road, then a tap on the wheel: it reloads with the edited cooldown.
  const fired = await page.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.s.cooldowns[0] = 0;
    sim.spawnEnemy('grunt', 600);
    sim.command({ k: 'fireSlot', p: 0, slot: 0 });
    return { max: sim.s.cooldownMax[0] as number };
  });
  expect(fired.max).toBe(1.5);
  await page.waitForFunction(() => (window as any).__fondue.session.sim.s.meta.devRun === true, null, { timeout: GAME_WAIT });

  // Export as text names the change; reset brings the default back.
  await openMenu(page);
  await page.click('#devWExport');
  await expect(page.locator('#devWeaponText')).toHaveValue(/Rolling Wheel \(wheel\) tier \d: cooldown [\d.]+ -> 1\.5/);
  await page.click('#devWResetAll');
  await expect(page.locator('#devEditCount')).toHaveCount(0);
  const def = await page.evaluate(() => {
    const sim = (window as any).__fondue.session.sim;
    sim.s.cooldowns[0] = 0;
    sim.spawnEnemy('grunt', 600);
    sim.command({ k: 'fireSlot', p: 0, slot: 0 });
    return sim.s.cooldownMax[0] as number;
  });
  expect(def).not.toBe(1.5);
});

test('cheats: gold, cheese, crests, levels, tiers, second hand and reset, with the visible mark', async ({ page }) => {
  await page.goto('/?menu=1&fresh=1');
  await waitForGame(page);
  await openMenu(page);
  await expect(page.locator('#devCheatBadge')).toHaveCount(0);

  await page.click('#devGold1000');
  expect((await profile(page)).wallet.gold).toBe(1000);
  await expect(page.locator('#devCheatBadge')).toHaveText('Cheats used');
  await page.click('#devCheese');
  expect((await profile(page)).wallet.cheese).toBe(50);
  await page.click('#devCrests');
  expect((await profile(page)).wallet.crests).toBe(40);

  await page.locator('#devUnlockTo').fill('12');
  await page.click('#devUnlockLevels');
  expect((await profile(page)).won).toBe(12);

  await page.click('#devCastleTier5');
  expect((await profile(page)).keep.castleTier).toBe(5);
  await page.click('#devHandTier7');
  expect((await profile(page)).keep.handTier).toBe(7);
  await page.locator('#devTierWeapon').selectOption('forks');
  await page.click('#devWeaponTier6');
  expect((await profile(page)).keep.weapons.forks.tier).toBe(6);
  await page.click('#devStation-cauldron-2');
  expect((await profile(page)).keep.stations.cauldron).toBe(2);

  // The second hand on the laptop is a stored switch: settings.flags.secondHand.
  await page.click('#tuning button[data-flag="secondHand"][data-value="on"]');
  expect((await profile(page)).flags.secondHand).toBe('on');
  await page.click('#tuning button[data-flag="secondHand"][data-value="off"]');
  expect((await profile(page)).flags.secondHand).toBe('off');
  expect((await profile(page)).cheats).toBe(true);

  // Options shows the mark too.
  await page.keyboard.press('F1');
  await page.evaluate(() => (window as any).__fondue.show('options'));
  await expect(page.locator('#optCheatBadge')).toHaveText('Cheats used');

  // Reset asks first, then gives a clean profile without the mark.
  await openMenu(page);
  await page.click('#devResetProfile');
  await expect(page.locator('#resetConfirm')).toBeVisible();
  await page.click('#tuning button[data-act="resetConfirm"]');
  const after = await profile(page);
  expect(after.cheats).toBe(false);
  expect(after.wallet.gold).toBe(0);
  await expect(page.locator('#devCheatBadge')).toHaveCount(0);
});

test('developer overview: version, cheese sum, roadmap, and a decision becomes a valid issue address', async ({ page }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'fondue-devpage-'));
  try {
    execFileSync(process.execPath, ['scripts/dev-page.ts', dir], { stdio: 'pipe', timeout: 150_000 });
    await page.addInitScript(() => { (window as any).open = () => null; });
    await page.goto(pathToFileURL(join(dir, 'index.html')).href);
    await expect(page.locator('#gameVersion')).toHaveText(`v${GAME_VERSION}`);
    await expect(page.locator('#cheeseSum')).toContainText('500');
    await expect(page.locator('#fahrplan')).toContainText('v1.0');
    await expect(page.locator('#waffen')).toContainText('Rolling Wheel');
    // v0.4: the playable versions with links, the castle tiers from the configuration, the level
    // column of buildable castle tiers and the v0.4 decision list above the older one of v0.3.
    const links = await page.locator('#versionen a[href]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    for (const v of VERSIONS) expect(links).toContain(versionUrl(v));
    const castleRows = page.locator('#burg tbody tr');
    await expect(castleRows).toHaveCount(CASTLE_TIERS.length);
    for (let i = 1; i < CASTLE_TIERS.length; i++) {
      await expect(castleRows.nth(i)).toContainText(CASTLE_TIERS[i].name);
      await expect(castleRows.nth(i)).toContainText(`Level ${CASTLE_TIER_LEVEL[i]}`);
      await expect(castleRows.nth(i)).toContainText(`${CASTLE_TIERS[i].gold} Gold`);
    }
    await expect(castleRows.nth(1)).toContainText('Slot');
    await expect(page.locator('#level thead').first()).toContainText('Burg-Stufe kaufbar');
    await expect(page.locator('#level tbody tr').filter({ has: page.locator('td:first-child', { hasText: /^6$/ }) }).first()).toContainText('Burg-Stufe 2');
    await expect(page.locator('#entscheidungen-v4')).toHaveText('Offene Entscheidungen v0.4');
    for (let i = 1; i <= 7; i++) await expect(page.locator(`[data-decision="D4-0${i}"]`)).toBeVisible();
    await expect(page.locator('[data-decision="D4-04"]')).toContainText('docs/v0.4/BERICHT.md');

    const card = page.locator('[data-decision="D3-09"]');
    await card.locator('input[type=radio]').nth(1).check();
    await card.locator('textarea').fill('Weniger Gold beim Wiederholen, bitte testen.');
    await page.click('#makeIssues');
    const href = await page.locator('#issueLinks a.issue-link').first().getAttribute('href');
    expect(href).toBeTruthy();
    expect(href!.length).toBeLessThanOrEqual(7000);
    const url = new URL(href!);
    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/onlineshopbuilding-droid/fondue/issues/new');
    expect(url.searchParams.get('title')).toMatch(/^\[Entscheidungen\] /);
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('### D3-09 Replayed levels give gold');
    expect(body).toContain('Weniger Gold beim Wiederholen');

    // The draft survives a reload (only under the build's own prefix, fondue.v4.dev.*).
    await page.reload();
    await expect(page.locator('[data-decision="D3-09"] textarea')).toHaveValue('Weniger Gold beim Wiederholen, bitte testen.');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.every((k) => k.startsWith(`${STORAGE_PREFIX}dev.`))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('options: the developer menu sets castle tiers 1 to 7 through the cheat and marks the profile', async ({ page }) => {
  await page.goto('/?menu=1&fresh=1');
  await waitForGame(page);
  // The cog in the lobby, as a player opens the Options.
  await station(page, 'options');
  await page.click('#devMenuButton');
  await expect(page.locator('#tuning')).toBeVisible();
  for (const tier of [3, 7, 1, 5]) {
    await page.click(`#devCastleTier${tier}`);
    const p = await profile(page);
    expect(p.keep.castleTier).toBe(tier);
    expect(p.cheats).toBe(true);
    await expect(page.locator(`#devCastleTier${tier}`)).not.toHaveClass(/secondary/);
  }
  // A changed number field that loses focus while the panel redraws does not break the page.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.locator('#devUnlockTo').fill('7');
  await page.click('#devCastleTier2');
  await page.keyboard.press('F1');
  await expect(page.locator('#tuning')).toHaveCount(0);
  expect((await profile(page)).keep.castleTier).toBe(2);
  await page.evaluate(() => (window as any).__fondue.show('options'));
  await expect(page.locator('#optCheatBadge')).toHaveText('Cheats used');
  expect(errors).toEqual([]);
});
