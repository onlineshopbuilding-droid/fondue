import { expect, test, type Page } from '@playwright/test';
import { CASTLE_TIERS } from '../../src/config/keep';
import { TABLE_UNLOCK_LEVEL } from '../../src/config/slotTiers';
import { CI, DEVICES, collectErrors, setCastleTier, station, waitFor, waitForGame } from './helpers';

/**
 * v0.4: the co-op room shows the castle tier of every player next to the name (the run is played with
 * the host's castle). A friend joins through the invite link even with a fresh profile that has not
 * won the level that mends the co-op table; the link must not stop at the tutorial or a lock.
 */

test.describe.configure({ timeout: CI ? 720_000 : 240_000 });

const SHOTS = 'docs/screenshots/v0.4';
const HOST_TIER = 3;

/** The host: castle tier 3 and enough won levels for that tier and the co-op table. */
async function prepareHost(page: Page) {
  await page.evaluate((upTo) => {
    const a = (window as any).__fondue;
    for (let l = 1; l <= upTo; l++) a.profile.markLevelDone(a.world, l);
    a.profile.flushSync();
  }, Math.max(12, TABLE_UNLOCK_LEVEL.coop));
  await setCastleTier(page, HOST_TIER);
}

for (const d of DEVICES) {
  test(`${d.name}: both castle tiers in the room; a fresh guest joins through the invite link`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: d.width, height: d.height }, hasTouch: d.touch, isMobile: d.touch, deviceScaleFactor: 1 });
    const host = await context.newPage();
    const guest = await context.newPage();
    const hostErrors = collectErrors(host);
    const guestErrors = collectErrors(guest);

    await host.goto('/?menu=1&fresh=1&net=loopback');
    await waitForGame(host);
    await prepareHost(host);
    await station(host, 'coop');
    await host.fill('#name', 'Tim');
    await host.click('button[data-a="openRoom"]');
    await expect(host.locator('#roomCode')).toHaveText(/[A-Z2-9]{5}/);
    await waitFor(() => host.locator('#status').innerText(), (t) => t.includes('Waiting'));
    const code = await host.locator('#roomCode').innerText();

    // The guest opens the invite link with a brand-new profile: no tutorial, no level won.
    await guest.goto(`/?fresh=1&net=loopback&join=${code}`);
    await waitForGame(guest);
    await expect.poll(() => guest.evaluate(() => (window as any).__fondue.screen as string)).toBe('join');
    const fresh = await guest.evaluate(() => {
      const a = (window as any).__fondue;
      return { tutorial: a.profile.data.seen.tutorial as boolean, done: a.profile.highestLevelDone(a.world) as number, tier: a.profile.data.keep.castleTier as number };
    });
    expect(fresh).toEqual({ tutorial: false, done: 0, tier: 1 });
    await expect(guest.locator('#code')).toHaveValue(code);
    await guest.fill('#name', 'Lenny');
    await guest.click('#doJoin');
    await expect(host.locator('#status')).toContainText('Lenny joined', { timeout: 10000 });
    await expect(guest.locator('#status')).toContainText('Waiting for the host', { timeout: 10000 });

    // Each side sees both castle tiers, its own first.
    const name = (t: number) => CASTLE_TIERS[t - 1].name;
    await expect(host.locator('#roomMembers [data-seat="0"]')).toContainText('Tim (you)');
    await expect(host.locator('#seatCastle-0')).toHaveText(`Castle tier ${HOST_TIER} · ${name(HOST_TIER)}`);
    await expect(host.locator('#seatCastle-1')).toHaveText(`Castle tier 1 · ${name(1)}`);
    await expect(guest.locator('#roomMembers [data-seat="0"]')).toContainText('Lenny (you)');
    await expect(guest.locator('#seatCastle-0')).toHaveText(`Castle tier 1 · ${name(1)}`);
    await expect(guest.locator('#seatCastle-1')).toHaveText(`Castle tier ${HOST_TIER} · ${name(HOST_TIER)}`);
    await expect(host.locator('#roomCastleNote')).toContainText('your castle');
    await expect(guest.locator('#roomCastleNote')).toContainText("the host's castle");

    // Back and the main action at their usual places, and in sight.
    for (const p of [host, guest]) {
      const back = (await p.locator('.panel.room .navrow button[data-a="quit"]').boundingBox())!;
      expect(back.y + back.height).toBeLessThanOrEqual(d.height);
      expect(back.height).toBeGreaterThanOrEqual(44);
    }
    await host.screenshot({ path: `${SHOTS}/coop-room-host-${d.name}.png` });
    await guest.screenshot({ path: `${SHOTS}/coop-room-guest-${d.name}.png` });

    // The guest's profile stays untouched by joining.
    expect(await guest.evaluate(() => (window as any).__fondue.profile.data.keep.castleTier)).toBe(1);
    expect(hostErrors).toEqual([]);
    expect(guestErrors).toEqual([]);
    await context.close();
  });
}
