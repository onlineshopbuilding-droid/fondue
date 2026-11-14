import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { GAME_WAIT, startSolo, waitForGame } from './helpers';

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
  await page.click('#devStars');
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
    await expect(page.locator('#gameVersion')).toHaveText('v0.3');
    await expect(page.locator('#cheeseSum')).toContainText('500');
    await expect(page.locator('#fahrplan')).toContainText('v1.0');
    await expect(page.locator('#waffen')).toContainText('Rolling Wheel');

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

    // The draft survives a reload (only under fondue.v3.dev.*).
    await page.reload();
    await expect(page.locator('[data-decision="D3-09"] textarea')).toHaveValue('Weniger Gold beim Wiederholen, bitte testen.');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.every((k) => k.startsWith('fondue.v3.dev.'))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
