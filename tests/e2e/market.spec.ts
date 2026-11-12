import { expect, test, type Page } from '@playwright/test';
import { GATES, STATIONS } from '../../src/config/keep';
import { weaponById } from '../../src/config/weapons';
import { IPHONE, LAPTOP, gameState, openGame, startEndless, tapMarket, toMarket, waitFor, waitPhase, type Device } from './helpers';

/** The market at the keep between two days: a tap on a place of the keep opens what can be built there. */

const meta = (page: Page) => page.evaluate(() => (window as any).__fondue.session.meta());
const press = (page: Page, d: Device, selector: string) => (d.touch ? page.tap(selector) : page.click(selector));

for (const d of [LAPTOP, IPHONE]) {
  test(`${d.name}: build a weapon, upgrade it, the gate, the cauldron and the hand; the weapon fires the next day`, async ({ browser }) => {
    const { context, page, errors } = await openGame(browser, d, '?menu=1&seed=21');
    await startEndless(page);
    await page.evaluate(() => { const s = (window as any).__fondue.session.sim.s; s.gold = 20000; s.offerings = 60; });
    await toMarket(page);
    await waitFor(() => page.evaluate(() => (window as any).__fondue.scene.marketProgress() as number), (k) => k >= 1, 15000);
    await page.screenshot({ path: `mobile-screenshots/market-${d.name}.png` });

    // Every place of the keep can be hit with a finger.
    const spots = await page.evaluate(() => (window as any).__fondue.scene.marketSpots());
    expect(spots.map((s: any) => s.id).sort()).toEqual(['gate', 'slot:0', 'slot:1', 'slot:2', 'slot:3', 'slot:4', 'station:cauldron', 'station:perch']);
    for (const s of spots) {
      expect(s.r * 2, `${s.id} is big enough for a finger`).toBeGreaterThanOrEqual(44);
      expect(s.x, s.id).toBeGreaterThan(0);
      expect(s.x, s.id).toBeLessThan(d.width);
      expect(s.y, s.id).toBeGreaterThan(0);
      expect(s.y, s.id).toBeLessThan(d.height);
    }

    // A weapon into the wall foot slot, then its next tier.
    const gold0 = (await gameState(page))!.gold;
    await tapMarket(page, 'slot:0', d.touch);
    await expect(page.locator('#marketWindow')).toHaveAttribute('data-slot', '0');
    await page.screenshot({ path: `mobile-screenshots/market-slot-${d.name}.png` });
    await press(page, d, 'button[data-buy="weapon:0:wheel"]');
    await waitFor(() => meta(page), (m) => m.loadout.slotWeapon[0] === 'wheel', 5000);
    expect((await gameState(page))!.gold).toBe(gold0 - weaponById('wheel')!.buyGold);
    // The window now shows the wheel as the slot's weapon, with its next tier for sale (endless).
    await expect(page.locator('#marketWindow .m-row.owned')).toContainText(weaponById('wheel')!.name);
    await expect(page.locator('#marketWindow .m-row.owned button[data-buy="upgrade:wheel"]')).toBeEnabled();
    await press(page, d, 'button[data-buy="upgrade:wheel"]');
    await waitFor(() => meta(page), (m) => m.loadout.weaponTier.wheel === 2, 5000);
    await press(page, d, 'button[data-a="closeWin"]');
    await expect(page.locator('#marketWindow')).toHaveCount(0);

    // The gate: the next stage of the keep.
    await tapMarket(page, 'gate', d.touch);
    await press(page, d, 'button[data-buy="gate"]');
    await waitFor(() => meta(page), (m) => m.loadout.gateTier === 1, 5000);
    expect((await gameState(page))!.gateMax).toBe(GATES[1].hp);
    await press(page, d, 'button[data-a="closeWin"]');

    // The cauldron's spot behind the keep.
    await tapMarket(page, 'station:cauldron', d.touch);
    await expect(page.locator('#marketWindow')).toContainText(STATIONS.cauldron.name);
    await press(page, d, 'button[data-buy="station:cauldron"]');
    await waitFor(() => meta(page), (m) => m.loadout.stations.cauldron === true, 5000);
    await expect(page.locator('#marketWindow')).toContainText('Built');

    // The hand: a stronger grip for the whole team.
    await press(page, d, 'button[data-a="hand"]');
    await expect(page.locator('#marketWindow')).toHaveAttribute('data-spot', 'hand');
    await press(page, d, '#marketWindow button[data-buy="hand"]');
    await waitFor(() => meta(page), (m) => m.loadout.handTier[0] === 2, 5000);
    await page.screenshot({ path: `mobile-screenshots/market-bought-${d.name}.png` });

    // The next day: the new wheel fires with one tap.
    await press(page, d, '#ready');
    await waitPhase(page, 'battle');
    await page.evaluate(() => (window as any).__fondue.session.sim.spawnEnemy('grunt', 700));
    const at = await page.evaluate(() => (window as any).__fondue.scene.slotCss(0));
    if (d.touch) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await waitFor(() => gameState(page), (s) => s!.cooldowns[0] > 0, 5000);
    expect(errors).toEqual([]);
    await context.close();
  });
}
