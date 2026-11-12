// The market at the keep between days: the places to tap on the keep and what they show.
import Phaser from 'phaser';
import { WORLD } from '../config/field';
import { STATION_IDS } from '../config/keep';
import { SLOTS, SLOT_COUNT } from '../config/slots';
import { unlockLevelOf } from '../modes/unlocks';
import { quote } from '../sim/shop';
import type { Meta } from '../sim/types';

const FONT = 'Lilita One';
const INK = 0x2b2118;
const MUSTARD = 0xf3cb5e;
const CREAM = 0xfff6df;
const STONE = 0x8a8476;
const GREEN = 0x5aa05a;
/** Where the gate's own button sits: on the gate leaf, below the gate-arm slot. */
const GATE_BADGE = { x: WORLD.gateX - 37, y: 528, r: 30 };
/** The cauldron's spot behind the keep: the middle of the pot on its mound. */
const CAULDRON_SPOT = { x: WORLD.cauldron.x, y: WORLD.cauldron.rimY - 4 };
/** Tap radii in world units; the market view is closer than the fight, so these are above 44 CSS px on phones. */
const TAP = { gate: 50, cauldron: 74, perch: 64 };

/** A place on the keep that opens a market window when tapped. */
export interface MarketSpot { id: string; x: number; y: number; r: number }

/**
 * The tappable places of the market at the keep: the five slots, the gate's button, the cauldron's
 * spot and the eagle hook. Draws a badge on each so that empty, locked and buildable places can be
 * told apart at a glance, and answers which place a tap hit.
 */
export class MarketView {
  private gfx: Phaser.GameObjects.Graphics;
  private lockText: Phaser.GameObjects.Text[] = [];
  private gateText: Phaser.GameObjects.Text;
  private spots: MarketSpot[] = [];
  private k = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(38);
    const style = { fontFamily: FONT, fontSize: '17px', color: '#fff6df', stroke: '#2b2118', strokeThickness: 5, align: 'center' };
    for (let i = 0; i < SLOT_COUNT; i++) this.lockText.push(scene.add.text(0, 0, '', style).setOrigin(0.5, 0).setDepth(38.1).setVisible(false));
    this.gateText = scene.add.text(0, 0, 'Gate', { ...style, fontSize: '18px' }).setOrigin(0.5, 0).setDepth(38.1).setVisible(false);
  }

  /** Spots of the last frame, for the tap test and the test hooks. */
  list(): MarketSpot[] { return this.spots; }

  /** Which spot a press in world coordinates hits, or null. Only while the market is in view. */
  hit(x: number, y: number): string | null {
    if (this.k < 0.95) return null;
    let best: MarketSpot | null = null;
    let bestD = Infinity;
    for (const s of this.spots) {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d <= s.r && d < bestD) { best = s; bestD = d; }
    }
    return best?.id ?? null;
  }

  /**
   * `k` is how far the camera has moved into the market (0 to 1); `hook` is where the eagle hook
   * hangs now; `slotR` the slots' tap radius.
   */
  update(meta: Meta, gold: number, offerings: number, k: number, hook: { x: number; top: number }, slotR: number, time: number) {
    this.k = k;
    const g = this.gfx;
    g.clear();
    const show = k > 0.02;
    this.gateText.setVisible(show);
    if (!show) {
      for (const t of this.lockText) t.setVisible(false);
      this.spots = [];
      return;
    }
    const a = Math.min(1, k * 1.4);
    const rules = meta.rules;
    const l = meta.loadout;
    const pulse = 1 + Math.sin(time * 0.006) * 0.07;
    const sold = (prefix: string) => rules.marketOnly === null || rules.marketOnly.some((it) => it.startsWith(prefix));
    const spots: MarketSpot[] = [];

    for (let i = 0; i < SLOT_COUNT; i++) {
      const { x, y } = SLOTS[i];
      spots.push({ id: `slot:${i}`, x, y, r: slotR });
      const label = this.lockText[i];
      label.setVisible(false);
      if (!rules.slotsOpen[i]) {
        this.lock(x, y, a);
        const lv = rules.level !== null ? unlockLevelOf(rules.world, 'slot', i) : null;
        label.setText(lv === null ? 'Locked' : `Level ${lv + 1}`).setPosition(x, y + 24).setAlpha(a).setVisible(true);
        continue;
      }
      const weapon = l.slotWeapon[i];
      if (!weapon) {
        const can = sold(`weapon:${i}:`);
        this.dashedRing(x, y, 34, can ? a : a * 0.35);
        if (can) this.plus(x, y, 15 * pulse, a);
        continue;
      }
      if (rules.tierUpgrades && quote(rules, l, gold, offerings, `upgrade:${weapon}`).reason === 'ok') this.arrow(x + 30, y - 30, a * (0.8 + 0.2 * Math.sin(time * 0.008)));
    }

    // The gate's own button: a round wooden plate with a hammer, "Gate" below it.
    const gq = quote(rules, l, gold, offerings, 'gate');
    const gateOn = gq.reason !== 'locked';
    const { x: gx, y: gy, r: gr } = GATE_BADGE;
    g.fillStyle(INK, a).fillCircle(gx, gy, gr + 3);
    g.fillStyle(gateOn ? 0x9a6a3c : STONE, a).fillCircle(gx, gy, gr);
    g.fillStyle(0xbb8c56, a * 0.8).fillCircle(gx - 4, gy - 5, gr - 9);
    this.hammer(gx, gy, a);
    if (gq.reason === 'ok') this.plus(gx + gr * 0.72, gy - gr * 0.72, 11 * pulse, a);
    this.gateText.setPosition(gx, gy + gr + 2).setAlpha(gateOn ? a : a * 0.6);
    spots.push({ id: 'gate', x: gx, y: gy, r: TAP.gate });

    // Offering sites: a badge where one can still be built.
    for (const id of STATION_IDS) {
      const at = id === 'cauldron' ? CAULDRON_SPOT : { x: hook.x, y: hook.top + 64 };
      spots.push({ id: `station:${id}`, x: at.x, y: at.y, r: id === 'cauldron' ? TAP.cauldron : TAP.perch });
      if (l.stations[id]) continue;
      const q = quote(rules, l, gold, offerings, `station:${id}`);
      if (q.reason === 'locked') continue;
      this.plus(at.x + (id === 'cauldron' ? 0 : 30), at.y - (id === 'cauldron' ? 6 : 10), 16 * pulse, a);
    }
    this.spots = spots;
  }

  private plus(x: number, y: number, r: number, a: number) {
    const g = this.gfx;
    g.fillStyle(INK, a).fillCircle(x, y, r + 3);
    g.fillStyle(MUSTARD, a).fillCircle(x, y, r);
    g.fillStyle(0xffe896, a).fillCircle(x - r * 0.25, y - r * 0.3, r * 0.45);
    const t = r * 0.28;
    const s = r * 0.62;
    g.fillStyle(INK, a).fillRect(x - s, y - t / 2, s * 2, t).fillRect(x - t / 2, y - s, t, s * 2);
  }

  private lock(x: number, y: number, a: number) {
    const g = this.gfx;
    g.fillStyle(INK, a * 0.55).fillCircle(x, y, 34);
    g.fillStyle(INK, a).fillCircle(x, y - 4, 22);
    g.fillStyle(STONE, a).fillCircle(x, y - 4, 19);
    g.lineStyle(4.5, INK, a).beginPath().arc(x, y - 9, 6.5, Math.PI, 0, false).strokePath();
    g.fillStyle(INK, a).fillRoundedRect(x - 10, y - 10, 20, 15, 3);
    g.fillStyle(MUSTARD, a).fillRoundedRect(x - 7.5, y - 7.5, 15, 10, 2);
    g.fillStyle(INK, a).fillCircle(x, y - 3, 2.2);
  }

  /** A broken ring: here a weapon can stand. */
  private dashedRing(x: number, y: number, r: number, a: number) {
    const g = this.gfx;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / n * 0.55;
      g.lineStyle(7, INK, a * 0.8).beginPath().arc(x, y, r, a0, a1, false).strokePath();
      g.lineStyle(3.5, CREAM, a).beginPath().arc(x, y, r, a0, a1, false).strokePath();
    }
  }

  /** Upgrade affordable: a green arrow beside the weapon. */
  private arrow(x: number, y: number, a: number) {
    const g = this.gfx;
    g.fillStyle(INK, a).fillCircle(x, y, 14);
    g.fillStyle(GREEN, a).fillCircle(x, y, 11.5);
    g.fillStyle(CREAM, a).fillTriangle(x - 7, y + 1, x + 7, y + 1, x, y - 8).fillRect(x - 3, y, 6, 7);
  }

  private hammer(x: number, y: number, a: number) {
    const g = this.gfx;
    g.save();
    g.translateCanvas(x, y);
    g.rotateCanvas(-0.6);
    g.fillStyle(INK, a).fillRoundedRect(-4.5, -6, 9, 28, 3);
    g.fillStyle(0xe2c27f, a).fillRoundedRect(-2.5, -4, 5, 24, 2);
    g.fillStyle(INK, a).fillRoundedRect(-15, -19, 30, 15, 3);
    g.fillStyle(0x777d83, a).fillRoundedRect(-12.5, -16.5, 25, 10, 2);
    g.fillStyle(0xa9b0b8, a).fillRect(-11, -15.5, 22, 3);
    g.restore();
  }
}
