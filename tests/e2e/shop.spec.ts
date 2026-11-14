import { expect, test, type Page } from '@playwright/test';
import { DEVICES, openGame, tapStation, waitFor, waitForLobby, waitScreen, type Device } from './helpers';

/**
 * The Keep Shop (D1), the loadout before a level (D2) and the level card (D3), on all three devices:
 * open the shop from the lobby, unlock and upgrade a weapon, wear and take it off, the wallet follows,
 * a reload keeps everything, and from tapping a level to the battle it takes at most two taps.
 * Screenshots land in docs/screenshots/v0.3/.
 */

const SHOTS = 'docs/screenshots/v0.3';

/** Gives the profile campaign progress and money the way a player would have it (no UI cheats). */
async function grant(page: Page, levels: number, wallet: { cheese: number; gold: number; crests: number }) {
  await page.evaluate(([n, w]) => {
    const a = (window as any).__fondue;
    for (let l = 1; l <= (n as number); l++) a.profile.markLevelDone(a.world, l);
    a.profile.edit((d: any) => { d.wallet.cheese = (w as any).cheese; d.wallet.gold = (w as any).gold; d.wallet.crests = (w as any).crests; d.seen.tutorial = true; });
    a.profile.flushSync();
  }, [levels, wallet] as const);
}

const tap = (page: Page, d: Device, sel: string) => (d.touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const wallet = (page: Page) => page.evaluate(() => ({ ...(window as any).__fondue.profile.data.wallet }));
const keep = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((window as any).__fondue.profile.data.keep)));

/** Nothing sticks out of the window, nothing scrolls sideways, and every control is big enough for a finger. */
async function fits(page: Page, root: string, where: string) {
  const f = await page.evaluate((sel) => {
    const box = document.querySelector(sel) as HTMLElement | null;
    const r = box?.getBoundingClientRect();
    const small = [...document.querySelectorAll('.overlay button')]
      .filter((b) => !(b as HTMLElement).closest('[hidden]') && !(b as HTMLElement).classList.contains('cm-st'))
      .map((b) => ({ t: (b as HTMLElement).innerText || (b as HTMLElement).id, r: b.getBoundingClientRect() }))
      .filter((b) => b.r.width > 0 && b.r.bottom > 0 && b.r.top < innerHeight && (b.r.height < 43.5 || b.r.width < 43.5))
      .map((b) => `${b.t} ${Math.round(b.r.width)}x${Math.round(b.r.height)}`);
    return {
      overflowX: document.documentElement.scrollWidth - innerWidth,
      inside: !!r && r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
      small,
    };
  }, root);
  expect(f.overflowX, where).toBeLessThanOrEqual(0);
  expect(f.inside, `${where} ${JSON.stringify(f)}`).toBe(true);
  expect(f.small, where).toEqual([]);
}

for (const d of DEVICES) {
  test(`${d.name}: keep shop: unlock, upgrade, wear and take off; the wallet follows and a reload keeps it`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    await grant(page, 14, { cheese: 40, gold: 20000, crests: 0 });
    await page.reload();
    await waitForLobby(page);
    await page.screenshot({ path: `${SHOTS}/lobby-${d.name}.png` });
    await tapStation(page, 'armoury', d.touch);
    await waitScreen(page, 'armoury');
    await expect(page.locator('#shop h2')).toHaveText('Keep Shop');
    await expect(page.locator('#walletCheese')).toHaveText('40');
    await expect(page.locator('#walletGold')).toHaveText('20,000');
    await fits(page, '#shop', `${d.name} shop`);
    // Every spot on the keep is a big target.
    for (const box of await page.locator('.sh-spot').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
    }
    await page.screenshot({ path: `${SHOTS}/shop-overview-${d.name}.png` });

    // The damage slot: the Rolling Wheel is worn, Fondue Forks can be unlocked for cheese.
    await tap(page, d, '#spot-slot0');
    await expect(page.locator('#shopSide')).toHaveAttribute('data-spot', 'slot0');
    const forks = page.locator('[data-weapon-card="forks"]');
    await expect(forks.locator('button[data-a="buy"]')).toContainText('Unlock');
    await tap(page, d, '[data-weapon-card="forks"] button[data-a="buy"]');
    await expect(page.locator('#walletCheese')).toHaveText('32');
    expect((await keep(page)).weapons.forks.tier).toBe(1);
    // A locked weapon says when it comes.
    await expect(page.locator('[data-weapon-card="comet"]')).toContainText('Unlocks after winning level 44');
    // Upgrade: before and after are shown, gold is paid.
    await expect(forks).toContainText('Tier 1 → 2');
    const goldBefore = (await wallet(page)).gold;
    await tap(page, d, '[data-weapon-card="forks"] button[data-a="buy"]');
    await expect(forks.locator('.pips i.on')).toHaveCount(2);
    const goldAfter = (await wallet(page)).gold;
    expect(goldAfter).toBeLessThan(goldBefore);
    await expect(page.locator('#walletGold')).toHaveText(goldAfter.toLocaleString('en-US'));
    await page.screenshot({ path: `${SHOTS}/shop-slot-${d.name}.png` });
    // Wear the forks instead of the wheel, then take them off; the tier stays.
    await tap(page, d, '#equip-forks');
    expect((await keep(page)).loadout[0]).toBe('forks');
    await expect(forks).toHaveClass(/worn/);
    await tap(page, d, '#unequip-forks');
    expect((await keep(page)).loadout[0]).toBeNull();
    await tap(page, d, '#equip-forks');
    expect((await keep(page)).loadout[0]).toBe('forks');

    // The castle at the gate: before and after of the gate strength.
    await tap(page, d, '#spot-castle');
    await expect(page.locator('#castleChange')).toContainText('800');
    await expect(page.locator('#castleChange')).toContainText('1250');
    await page.screenshot({ path: `${SHOTS}/shop-upgrade-${d.name}.png` });
    await tap(page, d, '#shopSide button[data-a="buy"]');
    expect((await keep(page)).castleTier).toBe(2);
    // The cap: after level 14 the castle goes up to tier 4; tier 5 needs a later level, and the shop says which.
    await tap(page, d, '#shopSide button[data-a="buy"]');
    expect((await keep(page)).castleTier).toBe(3);
    await tap(page, d, '#shopSide button[data-a="buy"]');
    expect((await keep(page)).castleTier).toBe(4);
    await expect(page.locator('#shopSide')).toContainText('Win level 25 to build tier 5');
    // Locked slot and locked station explain themselves.
    await tap(page, d, '#spot-perch');
    await expect(page.locator('#shopSide')).toContainText('after winning level 70');

    // A reload keeps every purchase and the worn weapon.
    const before = { wallet: await wallet(page), keep: await keep(page) };
    await page.reload();
    await waitForLobby(page);
    expect(await wallet(page)).toEqual(before.wallet);
    expect(await keep(page)).toEqual(before.keep);
    expect(before.keep.weapons.forks.tier).toBe(2);
    expect(errors).toEqual([]);
    await context.close();
  });

  test(`${d.name}: level card: facts, cheese and loadout; two taps from the map to the battle`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1');
    await grant(page, 3, { cheese: 10, gold: 0, crests: 0 });
    await page.evaluate(() => {
      const a = (window as any).__fondue;
      a.profile.edit((d: any) => { d.keep.weapons.cheese = { tier: 2 }; d.worlds[a.world].cheese['2'] = 0b00111; });
      a.profile.flushSync();
    });
    await page.reload();
    await tapStation(page, 'campaign', d.touch);
    await waitScreen(page, 'campaign');
    // The map shows the cheese won per level.
    await expect(page.locator('.cm-st[data-level="2"] .cm-got')).toHaveText('3🧀');
    // Tap 1: the level.
    await tap(page, d, '.cm-st[data-level="4"]');
    const card = page.locator('#levelCard');
    await expect(card).toBeVisible();
    // Win, gate above half, gate above 90 %, and the level's challenges.
    expect(await page.locator('#cardCheese li').count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator('#cardCheeseTotal')).toContainText('/5 cheese');
    await expect(page.locator('#loadout .lo-tile')).toHaveCount(5);
    // Change the loadout right in the card: the slow slot takes Sticky Fondue.
    await tap(page, d, '#lo-1');
    await expect(page.locator('#loChoice')).toBeVisible();
    await fits(page, '#levelCard', `${d.name} level card with choice`);
    await tap(page, d, '#loChoice button[data-id="cheese"]');
    expect((await keep(page)).loadout[1]).toBe('cheese');
    await expect(page.locator('#loChoice')).toHaveCount(0);
    await fits(page, '#levelCard', `${d.name} level card`);
    await page.screenshot({ path: `${SHOTS}/level-card-${d.name}.png` });
    // Tap 2: Play. The battle starts.
    await tap(page, d, '#playLevel');
    await waitFor(() => page.evaluate(() => !!(window as any).__fondue.session), (v) => v, 30_000);
    expect(errors).toEqual([]);
    await context.close();
  });
}
