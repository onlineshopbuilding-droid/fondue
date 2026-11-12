import { describe, expect, it } from 'vitest';
import { WEAPONS } from '../../src/config/weapons';
import { KING_LOBBY_LINES, STORYBOOK } from '../../src/config/worlds/fondue/story';
import { DIVE_END, KEEP_GATE, LOBBY_SECONDS, diveOf, diveRect, fadeOf, stepLobby } from '../../src/render/lobby/dive';
import { DECOR, ROOM, STATIONS, WEAPON_PEGS, decorFor, fitRoom, linesFor, pagesFor, pickLine } from '../../src/render/lobby/layout';
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
  it('has a station for every action of the old main menu, plus the storybook', () => {
    const ids = STATIONS.map((s) => s.id).sort();
    expect(ids).toEqual(['armoury', 'campaign', 'continueLevel', 'coop', 'credits', 'help', 'options', 'play', 'scores', 'storybook']);
    for (const s of STATIONS) expect(s.label.length).toBeLessThanOrEqual(10);
  });

  it('keeps every station on screen and big enough for a finger on phones and laptops', () => {
    for (const [w, h] of SCREENS) {
      const f = fitRoom(w, h);
      for (const s of STATIONS) {
        expect(s.r * f.zoom, `${s.id} on ${w}x${h}`).toBeGreaterThanOrEqual(44);
        expect(s.x - 70, s.id).toBeGreaterThanOrEqual(f.x);
        expect(s.x + 70, s.id).toBeLessThanOrEqual(f.x + f.w);
        expect(s.ly + 22, s.id).toBeLessThanOrEqual(Math.min(ROOM.h, f.y + f.h));
        expect(s.ly - 22, s.id).toBeGreaterThanOrEqual(Math.max(0, f.y));
      }
      // The room fills the whole canvas: nothing outside it shows.
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.w).toBeLessThanOrEqual(ROOM.w + 0.01);
    }
  });

  it('makes the hall grander with the campaign, from a plain hall to a victory garland', () => {
    const ids = (lvl: number) => decorFor(lvl).map((d) => d.id);
    expect(ids(0)).toEqual(['throne']);
    expect(ids(10).length).toBeGreaterThan(ids(0).length);
    expect(ids(70)).toContain('throneGold');
    expect(ids(70)).not.toContain('throne');
    expect(ids(99)).not.toContain('garland');
    expect(ids(100)).toContain('garland');
    for (let lvl = 1; lvl <= 100; lvl++) expect(decorFor(lvl).length).toBeGreaterThanOrEqual(decorFor(lvl - 1).length - 1);
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
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
