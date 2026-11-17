import { describe, expect, it } from 'vitest';
import { WEAPONS } from '../../src/config/weapons';
import { KING_LOBBY_LINES, STORYBOOK } from '../../src/config/worlds/fondue/story';
import { DIVE_END, KEEP_GATE, LOBBY_SECONDS, diveOf, diveRect, fadeOf, stepLobby } from '../../src/render/lobby/dive';
import {
  HALL_LOOK, ROOM, STATIONS, WEAPON_PEGS, bannerText, decorFor, fitRoom, hallArtNames, hallLook, linesFor, pickLine, stationArt, stationPos,
} from '../../src/render/lobby/layout';
import { LOBBY_ART, LOBBY_HALL_ART } from '../../src/art/lobby';
import { CASTLE_TIERS } from '../../src/config/keep';
import { TABLE_UNLOCK_LEVEL } from '../../src/config/slotTiers';
import { coopTableOpen, endlessOpen } from '../../src/modes';
import { pagesFor } from '../../src/ui/lobby/storybook';
import { htmlMenuWanted, OVER_LOBBY } from '../../src/ui/lobby/mode';

const SCREENS: [number, number][] = [[852, 393], [915, 412], [1280, 720]];

describe('lobby camera move', () => {
  const cam = { x: 0, y: 0, w: 1280, h: 720 };

  it('leaves the battle camera alone at the start and ends right at the gate', () => {
    expect(diveRect(cam, 0)).toEqual(cam);
    const end = diveRect(cam, 1);
    expect(end.w).toBeCloseTo(cam.w * DIVE_END);
    expect(end.x + end.w / 2).toBeCloseTo(KEEP_GATE.x);
    expect(end.y + end.h / 2).toBeCloseTo(KEEP_GATE.y);
  });

  it('keeps the screen shape and zooms in steadily', () => {
    let last = cam.w;
    for (let d = 0.1; d <= 1; d += 0.1) {
      const r = diveRect(cam, d);
      expect(r.w / r.h).toBeCloseTo(cam.w / cam.h);
      expect(r.w).toBeLessThan(last);
      last = r.w;
      // The gate stays on screen the whole way.
      expect(KEEP_GATE.x).toBeGreaterThan(r.x);
      expect(KEEP_GATE.x).toBeLessThan(r.x + r.w);
    }
  });

  it('is short: well under 1.5 s in either direction, and the curves end where they should', () => {
    expect(LOBBY_SECONDS).toBeLessThan(1.5);
    let k = 0;
    let t = 0;
    while (k < 1) { k = stepLobby(k, true, 1 / 60); t += 1 / 60; }
    expect(t).toBeLessThan(1.5);
    expect(stepLobby(1, false, 0.1)).toBeLessThan(1);
    expect([diveOf(0), fadeOf(0), diveOf(1), fadeOf(1)]).toEqual([0, 0, 1, 1]);
    // On the way in the camera dives before the hall fades in.
    expect(diveOf(0.5)).toBeGreaterThan(fadeOf(0.5));
  });
});

describe('lobby layout', () => {
  it('has exactly the v0.4 stations: continue, campaign, shop, co-op and endless tables, options', () => {
    const ids = STATIONS.map((s) => s.id).sort();
    expect(ids).toEqual(['armoury', 'campaign', 'continueLevel', 'coop', 'options', 'play']);
    // Storybook, help, credits and scores live in the options and on the campaign map now.
    for (const gone of ['storybook', 'help', 'credits', 'scores']) expect(ids).not.toContain(gone);
    for (const s of STATIONS) expect(s.label.length).toBeLessThanOrEqual(10);
  });

  it('puts the campaign table in the middle as the biggest station, with the shop right beside it', () => {
    const by = (id: string) => STATIONS.find((s) => s.id === id)!;
    const campaign = by('campaign');
    for (const s of STATIONS) if (s.id !== 'campaign') expect(campaign.r, s.id).toBeGreaterThan(s.r);
    expect(Math.abs(campaign.x - ROOM.w / 2)).toBeLessThan(200);
    const shop = by('armoury');
    // In the same front row as the campaign table, nothing stands between it and the shop.
    expect(Math.abs(shop.y - campaign.y)).toBeLessThan(60);
    const others = STATIONS.filter((s) => s.id !== 'campaign' && s.id !== 'armoury' && Math.abs(s.y - campaign.y) < 60);
    for (const s of others) expect(Math.abs(shop.x - campaign.x), s.id).toBeLessThanOrEqual(Math.abs(s.x - campaign.x));
    expect(by('options').corner).toBe(true);
  });

  it('keeps every station on screen and big enough for a finger on phones and laptops', () => {
    for (const [w, h] of SCREENS) {
      const f = fitRoom(w, h);
      for (const s of STATIONS) {
        const p = stationPos(s, f);
        expect(s.r * f.zoom, `${s.id} on ${w}x${h}`).toBeGreaterThanOrEqual(44);
        expect(p.x - 50, s.id).toBeGreaterThanOrEqual(f.x);
        expect(p.x + 50, s.id).toBeLessThanOrEqual(f.x + f.w);
        expect(p.ly + 20, s.id).toBeLessThanOrEqual(Math.min(ROOM.h, f.y + f.h));
        expect(p.ly - 20, s.id).toBeGreaterThanOrEqual(Math.max(0, f.y));
      }
      // The room fills the whole canvas: nothing outside it shows.
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.w).toBeLessThanOrEqual(ROOM.w + 0.01);
    }
  });

  it('builds a hall of its own for each of the seven castle tiers', () => {
    expect(HALL_LOOK.length).toBe(7);
    for (let t = 1; t <= 7; t++) {
      expect(hallLook(t).name).toBe(CASTLE_TIERS[t - 1].name);
      expect(bannerText(t)).toEqual({ name: CASTLE_TIERS[t - 1].name, tier: `Castle tier ${t}` });
      // Walls, floor, ceiling, windows, door, cauldron and all tables are pictures of that tier.
      for (const name of hallArtNames(t)) expect(LOBBY_HALL_ART[name], name).toBeTruthy();
      for (const d of decorFor(t)) expect(LOBBY_ART[d.art], `${d.art} at tier ${t}`).toBeTruthy();
      if (t > 1) {
        expect(hallArtNames(t).filter((n) => hallArtNames(t - 1).includes(n))).toEqual([]);
        expect(decorFor(t).map((d) => d.art).join()).not.toBe(decorFor(t - 1).map((d) => d.art).join());
      }
    }
    // Plain wood and straw at the start, gold and cheese treasures at the top.
    expect(decorFor(1).map((d) => d.art)).toContain('straw');
    expect(decorFor(7).map((d) => d.art)).toEqual(expect.arrayContaining(['cheeseChest', 'chandelier', 'goldPile']));
    expect(hallLook(7).throne).toBe('throneGold');
    // Out of range falls back to the nearest tier.
    expect(hallLook(0).name).toBe(hallLook(1).name);
    expect(hallLook(9).name).toBe(hallLook(7).name);
  });

  it('shows broken tables until their level is won', () => {
    const coop = STATIONS.find((s) => s.id === 'coop')!;
    const endless = STATIONS.find((s) => s.id === 'play')!;
    expect(stationArt(coop, 3, false)).toBe('coopTableBroken');
    expect(stationArt(coop, 3, true)).toBe('coopTable3');
    expect(stationArt(endless, 5, false)).toBe('endlessTableBroken');
    expect(stationArt(endless, 5, true)).toBe('endlessTable5');
    const prof = (n: number) => ({ data: { worlds: { fondue: { levelsDone: Array.from({ length: n }, (_, i) => i + 1) } } } });
    const at = (n: number) => ({ coop: coopTableOpen(prof(n) as never, 'fondue'), endless: endlessOpen(prof(n) as never, 'fondue') });
    expect(at(TABLE_UNLOCK_LEVEL.coop - 1)).toEqual({ coop: false, endless: false });
    expect(at(TABLE_UNLOCK_LEVEL.coop)).toEqual({ coop: true, endless: false });
    expect(at(TABLE_UNLOCK_LEVEL.endless - 1)).toEqual({ coop: true, endless: false });
    expect(at(TABLE_UNLOCK_LEVEL.endless)).toEqual({ coop: true, endless: true });
  });

  it('has a peg on the wall for every weapon', () => {
    expect(WEAPON_PEGS.length).toBeGreaterThanOrEqual(WEAPONS.filter((w) => w.enabled).length);
  });
});

describe('lobby texts', () => {
  it('always has something for the King to say', () => {
    for (let lvl = 0; lvl <= 100; lvl++) expect(linesFor(KING_LOBBY_LINES, lvl).length, `level ${lvl}`).toBeGreaterThan(1);
    expect(linesFor([{ minLevel: 5, maxLevel: 9, text: 'a' }], 4)).toEqual([]);
  });

  it('never says the same remark twice in a row', () => {
    const lines = ['a', 'b', 'c'];
    let last = '';
    for (let i = 0; i < 50; i++) {
      const next = pickLine(lines, last);
      expect(next).not.toBe(last);
      last = next;
    }
    expect(pickLine(['only'], 'only')).toBe('only');
    expect(pickLine([], '')).toBe('');
  });

  it('opens storybook pages with the campaign', () => {
    expect(pagesFor(STORYBOOK, 0).length).toBeGreaterThanOrEqual(1);
    expect(pagesFor(STORYBOOK, 100).length).toBe(STORYBOOK.length);
    expect(pagesFor(STORYBOOK, 10).length).toBeLessThan(STORYBOOK.length);
  });
});

describe('menu mode', () => {
  it('uses the lobby unless the address asks for the plain HTML menu', () => {
    expect(htmlMenuWanted('')).toBe(false);
    expect(htmlMenuWanted('?menu=1')).toBe(false);
    expect(htmlMenuWanted('?fresh=1&menu=html')).toBe(true);
    expect(OVER_LOBBY.has('main') && OVER_LOBBY.has('armoury') && !OVER_LOBBY.has('shop')).toBe(true);
  });
});
