// Draws the keep: its build stage, the gate, the foot dressing and the weapons in their five slots.
import Phaser from 'phaser';
import { WORLD } from '../config/field';
import { SLOTS, SLOT_COUNT } from '../config/slots';
import { weaponById } from '../config/weapons';
import type { Landscape } from '../config/waves';
import type { ViewState } from '../net/snapshot';
import { slotAt } from '../sim/slots';
import type { Meta } from '../sim/types';
import { keepStagesReady, propKey, TEX_SCALE, wantKeepStages, wantWeaponTiers, weaponKey, weaponTiersReady } from './textures';
import type { GameView } from './viewport';
import { WEST_X } from '../art/castle/westWing';
import { castleArtIndex, clampCastleTier } from '../art/castle/tiers';

const FINGER_CSS = 27;
const RING_RADIUS = 40;
/** Where the ring of a weapon sits, if not around the middle of its art (art grid offset times its scale). */
const RING_OFFSET: Record<string, { x: number; y: number }> = { wheel: { x: 3, y: -6 } };
/** A reloading weapon is drawn this much darker. */
const RELOAD_SHADE = 0.62;
/** Seconds the gate's thorns stay out after a burst, and how far they reach at most (world px). */
const THORN_SECONDS = 0.5;
const THORN_MAX = 46;
/** Gate face spikes: from this height down to the road, one every THORN_STEP px. */
const THORN_TOP = 486;
const THORN_STEP = 16;

interface Mount {
  slot: number;
  img: Phaser.GameObjects.Image;
  flash: Phaser.GameObjects.Image;
  pop: number;
  kick: number;
  weapon: string | null;
}

/**
 * The castle tier (1 to 7) a run shows. v0.3 keeps it in the profile as `castleTier` (1-based);
 * older runs carry the 0-based `gateTier`. Whatever arrives is clamped to the tiers the art has.
 */
export function castleTierOf(meta: Meta): number {
  const l = (meta as unknown as { loadout?: { castleTier?: unknown; gateTier?: unknown } }).loadout ?? {};
  const k = (meta as unknown as { keep?: { castleTier?: unknown } }).keep;
  if (typeof l.castleTier === 'number') return clampCastleTier(l.castleTier);
  if (typeof k?.castleTier === 'number') return clampCastleTier(k.castleTier);
  if (typeof l.gateTier === 'number') return clampCastleTier(l.gateTier + 1);
  return 1;
}

/**
 * Evening light on the keep (issue 1): towards dusk the stone takes on the warm glow of the
 * landscape's sky, strongest when the sun is low (`night` around 0.35) and gone again at night,
 * when the plain night tint makes it darker and bluish.
 */
const DUSK_GLOW: Record<Landscape, number> = { meadow: 0xffc28a, canyon: 0xffa66e, marsh: 0xf2c48e, snowpine: 0xffc6b4 };
const DUSK_STRENGTH = 0.5;

export function keepLight(tint: number, night: number, land: Landscape): number {
  const k = Math.max(0, 1 - Math.abs(night - 0.35) / 0.35) * DUSK_STRENGTH;
  if (k <= 0) return tint;
  const t = Phaser.Display.Color.IntegerToColor(tint);
  const w = Phaser.Display.Color.IntegerToColor(DUSK_GLOW[land] ?? DUSK_GLOW.meadow);
  const ch = (a: number, b: number) => Math.round((a * (255 + (b - 255) * k)) / 255);
  return Phaser.Display.Color.GetColor(ch(t.red, w.red), ch(t.green, w.green), ch(t.blue, w.blue));
}

/** The keep's shadow on the road grows as the sun sinks behind the keep's left and fades at night. */
const SHADOW_STRETCH = 0.4;

const shade = (tint: number, k: number) => {
  const c = Phaser.Display.Color.IntegerToColor(tint);
  return Phaser.Display.Color.GetColor(Math.round(c.red * k), Math.round(c.green * k), Math.round(c.blue * k));
};

/** The keep as one thing: body per build stage, gate, shadow, foot dressing and the weapons in its five slots. */
export class CastleView {
  private shadow: Phaser.GameObjects.Image;
  private keep: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private weather: Phaser.GameObjects.Image;
  private ground: Phaser.GameObjects.Image;
  private gate: Phaser.GameObjects.Image;
  private cracks: Phaser.GameObjects.Image;
  private foot: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private thornGfx: Phaser.GameObjects.Graphics;
  private beaconGlow: Phaser.GameObjects.Image;
  /** The west wing left of the keep, which only the market shows. */
  private west: Phaser.GameObjects.Image;
  private westGlow: Phaser.GameObjects.Image;
  private westSnow: Phaser.GameObjects.Image;
  private westGround: Phaser.GameObjects.Image;
  private mounts: Mount[] = [];
  private gateFlash = 0;
  private thornT = 0;
  private thornReach = 0;
  private view!: GameView;
  private tierName = '';
  /** Dev and test hook: shows this castle tier (1 to 7) whatever the run has bought; null = the run's own. */
  previewTier: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(-40, 668, propKey('keepShadow')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(7);
    this.keep = scene.add.image(-40, 640, propKey('keep0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10);
    this.glow = scene.add.image(-40, 640, propKey('keepGlow0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.1).setAlpha(0);
    // Starts hidden; its real texture comes with the landscape, which may still be loading at boot.
    this.weather = scene.add.image(-40, 640, propKey('keep0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.05).setVisible(false);
    // Grass, earth and paving of the landscape at the wall foot: behind the gate and the raiders.
    this.ground = scene.add.image(-40, 670, propKey('keepGround_meadow')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.06);
    // Above the keep's own left edge (art x < 40), which it hides; under the keep's ground strip.
    this.west = scene.add.image(WEST_X, 640, propKey('keepWest0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.055).setVisible(false);
    this.westSnow = scene.add.image(WEST_X, 640, propKey('keepWest0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.056).setVisible(false);
    this.westGlow = scene.add.image(WEST_X, 640, propKey('keepWestGlow0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.057).setVisible(false);
    this.westGround = scene.add.image(-460, 670, propKey('keepWestGround_meadow')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(10.06).setVisible(false);
    this.thornGfx = scene.add.graphics().setDepth(10.9);
    this.gate = scene.add.image(WORLD.gateX - 74, 620, propKey('gate0')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(11);
    this.cracks = scene.add.image(WORLD.gateX - 74, 620, propKey('crack1')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(12).setVisible(false);
    this.foot = scene.add.image(-40, 690, propKey('foot_meadow')).setOrigin(0, 1).setScale(1 / TEX_SCALE).setDepth(36);
    // Above the foreground, so that the wheel's ring is never cut off by the bank.
    this.ring = scene.add.graphics().setDepth(37);
    this.beaconGlow = scene.add.image(0, 0, 'fx:skyglow').setDepth(12.4).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9a40).setVisible(false);
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const { x, y } = SLOTS[slot];
      const img = scene.add.image(x, y, weaponKey('wheel', 1)).setScale(1 / TEX_SCALE).setDepth(12.5).setVisible(false);
      const flash = scene.add.image(x, y, 'fx:burst').setDepth(12.6).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.mounts.push({ slot, img, flash, pop: 0, kick: 0, weapon: null });
    }
  }

  layout(v: GameView) { this.view = v; }

  hit() { this.gateFlash = 1; }

  /** A little jump when a weapon has reloaded. */
  ready(slot: number) {
    const m = this.mounts[slot];
    if (m) m.pop = 1;
  }

  /** The weapon in a slot has just been fired: it kicks back and flashes. */
  fired(slot: number) {
    const m = this.mounts[slot];
    if (m) m.kick = 1;
  }

  /** The spikes of the Hedgehog Gate burst out of the gate. */
  thorns(reach: number) {
    this.thornT = THORN_SECONDS;
    this.thornReach = Math.min(THORN_MAX, Math.max(18, reach * 0.35));
  }

  /** Radius of a grip zone: fat enough for a finger on every screen. */
  hitRadius() { return Math.max(WORLD.slotHitRadius, FINGER_CSS / this.view.cssPerUnit); }
  diameterCss() { return this.hitRadius() * 2 * this.view.cssPerUnit; }

  /** Which filled slot a press in world coordinates lands on, or -1. */
  hitSlot(x: number, y: number, meta: Meta | null): number {
    if (!meta) return -1;
    return slotAt(x, y, this.hitRadius(), (i) => this.weaponIn(i, meta) !== null);
  }

  /** Weapon id in a slot that is open in this run, or null. */
  weaponIn(slot: number, meta: Meta): string | null {
    if (!meta.rules.slotsOpen[slot]) return null;
    return meta.loadout.slotWeapon[slot] ?? null;
  }

  /**
   * `land` is the landscape on screen (Background.shown), which lags behind the day while it loads;
   * `market` how far the market view has come in (0 to 1), which brings the west wing into sight.
   */
  update(view: ViewState, meta: Meta, land: Landscape, sky: number, night: number, dt: number, time: number, market = 0) {
    const tint = keepLight(sky, night, land);
    // Stages beyond the first are prepared in the background after boot; until then stage 0 stands in.
    const built = castleArtIndex(this.previewTier ?? castleTierOf(meta));
    if (built > 0 && !keepStagesReady()) wantKeepStages();
    const tier = built > 0 && !keepStagesReady() ? 0 : built;
    const name = `${tier}:${land}`;
    if (name !== this.tierName) {
      this.tierName = name;
      this.keep.setTexture(propKey(`keep${tier}`));
      this.glow.setTexture(propKey(`keepGlow${tier}`));
      this.foot.setTexture(propKey(`foot_${land}`));
      this.ground.setTexture(propKey(`keepGround_${land}`));
      const weather = land === 'snowpine' ? `keepWeather_snowpine_${tier}` : land === 'meadow' ? null : `keepWeather_${land}`;
      this.weather.setVisible(weather !== null);
      if (weather) this.weather.setTexture(propKey(weather));
      this.west.setTexture(propKey(`keepWest${tier}`));
      this.westGlow.setTexture(propKey(`keepWestGlow${tier}`));
      this.westGround.setTexture(propKey(`keepWestGround_${land}`));
      if (land === 'snowpine') this.westSnow.setTexture(propKey(`keepWestSnow_snowpine_${tier}`));
    }
    const westOn = market > 0;
    this.west.setVisible(westOn).setTint(tint);
    this.westGround.setVisible(westOn).setTint(tint);
    this.westSnow.setVisible(westOn && land === 'snowpine').setTint(tint);
    this.westGlow.setVisible(westOn).setAlpha(Math.min(1, night * 1.6));
    this.keep.setTint(tint);
    this.weather.setTint(tint);
    this.ground.setTint(tint);
    this.foot.setTint(tint);
    this.glow.setAlpha(Math.min(1, night * 1.6));
    const low = Math.min(1, night * 2);
    this.shadow.setScale((1 + low * SHADOW_STRETCH) / TEX_SCALE, 1 / TEX_SCALE).setAlpha(1 - night * 0.6);

    // Gates are made at boot, so the bought gate shows at once.
    this.gate.setTexture(propKey(`gate${built}`));
    const frac = view.gateMax > 0 ? view.gateHp / view.gateMax : 1;
    const stage = frac < 0.25 ? 3 : frac < 0.5 ? 2 : frac < 0.75 ? 1 : 0;
    this.cracks.setVisible(stage > 0);
    if (stage > 0) this.cracks.setTexture(propKey(`crack${stage}`));
    this.gateFlash = Math.max(0, this.gateFlash - 0.12);
    const off = this.gateFlash * 3 * (Math.random() - 0.5);
    this.gate.x = WORLD.gateX - 74 + off;
    this.cracks.x = this.gate.x;
    this.gate.setTint(this.gateFlash > 0.5 ? 0xffb0a0 : tint);

    this.ring.clear();
    for (const m of this.mounts) this.updateMount(m, view, meta, tint, dt, time);
    this.updateThorns(meta, dt);
    this.updateBeacon(view, meta, time);
  }

  private updateMount(m: Mount, view: ViewState, meta: Meta, tint: number, dt: number, time: number) {
    const id = this.weaponIn(m.slot, meta);
    m.weapon = id;
    m.img.setVisible(id !== null);
    m.pop = Math.max(0, m.pop - dt * 4);
    m.kick = Math.max(0, m.kick - dt * 5);
    m.flash.setVisible(id !== null && m.kick > 0.4);
    if (!id) return;
    const owned = meta.loadout.weaponTier[id] ?? 1;
    if (owned > 1 && !weaponTiersReady()) wantWeaponTiers();
    const tier = owned > 1 && !weaponTiersReady() ? 1 : owned;
    m.img.setTexture(weaponKey(id, tier));
    const cd = view.cooldowns[m.slot] ?? 0;
    const max = view.cooldownMax[m.slot] ?? 0;
    const isReady = cd <= 0;
    const { x: sx, y: sy } = SLOTS[m.slot];
    // A shot kicks the weapon back towards the wall, then it springs into place.
    const kick = Math.sin(m.kick * Math.PI) * 5;
    m.img.setPosition(sx - kick, sy + kick * 0.3);
    m.img.setScale((1 + m.pop * 0.18 - m.kick * 0.06) / TEX_SCALE);
    // Weapons sit in the same light as the wall; a reloading one is darker.
    m.img.setTint(isReady ? tint : shade(tint, RELOAD_SHADE));
    if (m.flash.visible) {
      const k = (m.kick - 0.4) / 0.6;
      m.flash.setPosition(sx + 30, sy - 6).setScale(0.18 + (1 - k) * 0.35).setAlpha(k * 0.9);
    }
    const off = RING_OFFSET[id];
    const x = sx + (off?.x ?? 0);
    const y = sy + (off?.y ?? 0);
    const g = this.ring;
    if (!isReady && max > 0) {
      const done = 1 - cd / max;
      g.lineStyle(9, 0x2b2118, 0.7);
      g.strokeCircle(x, y, RING_RADIUS);
      g.lineStyle(6, 0xf2c14e, 1);
      g.beginPath();
      g.arc(x, y, RING_RADIUS, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2, false);
      g.strokePath();
    } else {
      // Same solid ring on every ready weapon; only a soft outer glow breathes.
      const glow = 0.16 + Math.sin(time * 0.005 + x) * 0.1;
      g.lineStyle(10, 0xf3cb5e, glow);
      g.strokeCircle(x, y, RING_RADIUS + 3);
      g.lineStyle(6, 0x2b2118, 0.7);
      g.strokeCircle(x, y, RING_RADIUS);
      g.lineStyle(3.5, 0xf3cb5e, 1);
      g.strokeCircle(x, y, RING_RADIUS);
    }
    this.drawTier(owned, x, y);
  }

  /** Tier pips, so that the tier can be read on the keep at a glance. */
  private drawTier(tier: number, x: number, y: number) {
    const g = this.ring;
    for (let i = 0; i < tier; i++) {
      const px = x - ((tier - 1) * 11) / 2 + i * 11;
      g.fillStyle(0x2b2118, 1);
      g.fillCircle(px, y + RING_RADIUS + 8, 6);
      g.fillStyle(tier >= 4 ? 0xffe08a : 0xf3cb5e, 1);
      g.fillCircle(px, y + RING_RADIUS + 8, 3.6);
    }
  }

  /** Iron spikes slide out of the gate face and back. */
  private updateThorns(meta: Meta, dt: number) {
    const g = this.thornGfx;
    g.clear();
    const fitted = meta.loadout.slotWeapon.includes('thorns');
    // Fitted thorns always show their tips; a burst drives them out.
    const burst = this.thornT > 0 ? Math.sin((this.thornT / THORN_SECONDS) * Math.PI) : 0;
    this.thornT = Math.max(0, this.thornT - dt);
    if (!fitted && burst <= 0) return;
    const len = 7 + burst * this.thornReach;
    const x0 = WORLD.gateX - 4;
    for (let y = THORN_TOP, i = 0; y < WORLD.groundY + 4; y += THORN_STEP, i++) {
      const l = len * (i % 2 ? 0.8 : 1);
      g.fillStyle(0x2b2118, 1);
      g.fillTriangle(x0, y - 6.5, x0 + l + 3, y, x0, y + 6.5);
      g.fillStyle(0x9aa1a9, 1);
      g.fillTriangle(x0, y - 4, x0 + l, y, x0, y + 4);
      g.fillStyle(0xd6dbe0, 1);
      g.fillTriangle(x0, y - 4, x0 + l * 0.8, y - 0.6, x0, y - 1.5);
    }
  }

  /** While the Ember Beacon burns, its basket glows and flickers. */
  private updateBeacon(view: ViewState, meta: Meta, time: number) {
    const slot = meta.loadout.slotWeapon.indexOf('beacon');
    const on = slot >= 0 && view.beaconT > 0 && !!meta.rules.slotsOpen[slot];
    this.beaconGlow.setVisible(on);
    if (!on) return;
    const { x, y } = SLOTS[slot];
    const flicker = 0.75 + Math.sin(time * 0.031) * 0.12 + Math.sin(time * 0.057) * 0.08;
    this.beaconGlow.setPosition(x, y - 26).setScale(0.75 * flicker).setAlpha(Math.min(1, view.beaconT) * 0.7);
  }

  /** Position for tests and tips, in world coordinates. */
  slotWorld(slot: number) { return SLOTS[slot]; }

  /** Name of the weapon mounted in a slot, or ''. */
  nameOf(slot: number, meta: Meta): string {
    const id = this.weaponIn(slot, meta);
    return id ? weaponById(id)?.name ?? '' : '';
  }
}
