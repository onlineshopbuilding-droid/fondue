import { ENEMIES } from '../config/enemies';
import { SHOP_ITEMS, type WeaponSlot } from '../config/shop';
import { DT, WORLD, perchX } from '../config/world';
import { pointerFor } from './aim';
import type { Sim } from './sim';
import type { Enemy } from './types';

/** How a scripted player behaves. All of it is what a person could do or see. */
export interface BotSkill {
  name: string;
  /** Pause between finishing one action and starting the next, seconds. */
  reaction: number;
  /** Hand speed across the screen, px/s. */
  handSpeed: number;
  /** How long a grabbed raider is held before letting go, seconds. */
  holdTime: number;
  /** The press lands where the target was this long ago, seconds. */
  aimLag: number;
  /** Spread of a press around its aim point, px. */
  clickNoise: number;
  /** Chance a press goes clearly wide. */
  misclick: number;
  /** Chance a throw is too weak to kill. */
  weakThrow: number;
  /** Spread of a throw at the pot or the hook, px. */
  throwNoise: number;
  /** 0 = whatever is nearest the hand, 1 = whoever hurts the gate most. */
  tactics: number;
  /** Reads bubbles and only goes for what can be grabbed right now. */
  readsShields: boolean;
  /** Share of kills aimed at the pot when it is free. */
  potRate: number;
  /** Share of kills aimed at the hook when it is free. */
  perchRate: number;
  /** Seconds between looks at the weapon row. */
  weaponEvery: number;
  /** Chance a ready weapon is noticed at such a look. */
  weaponUse: number;
  /** Raiders that must be in the blast before firing. */
  minCrowd: number;
  /** Spread of an aimed shot on the ground, px. */
  weaponNoise: number;
  /** 0 = aims at where they are, 1 = aims at where they will be. */
  lead: number;
  /** Seconds between taps on a siege cart. */
  tapEvery: number;
  /** Taps on a cart before losing interest. */
  tapsPerCart: number;
  /** Chance per decision of joining a yeti with the other hand, 0 = never. */
  yetiTeamwork: number;
  shop: 'random' | 'order' | 'plan';
}

export const BOT_SKILLS: Record<string, BotSkill> = {
  poor: {
    name: 'Poor', reaction: 0.29, handSpeed: 1500, holdTime: 0.24, aimLag: 0.16, clickNoise: 20, misclick: 0.09, weakThrow: 0.12,
    throwNoise: 120, tactics: 0, readsShields: false, potRate: 0.12, perchRate: 0, weaponEvery: 5, weaponUse: 0.5, minCrowd: 1,
    weaponNoise: 170, lead: 0, tapEvery: 0.5, tapsPerCart: 3, yetiTeamwork: 0, shop: 'random',
  },
  mid: {
    name: 'Mid', reaction: 0.27, handSpeed: 1900, holdTime: 0.22, aimLag: 0.12, clickNoise: 13, misclick: 0.05, weakThrow: 0.08,
    throwNoise: 60, tactics: 0.6, readsShields: true, potRate: 0.45, perchRate: 0.15, weaponEvery: 1.8, weaponUse: 0.8, minCrowd: 3,
    weaponNoise: 75, lead: 0.5, tapEvery: 0.3, tapsPerCart: 7, yetiTeamwork: 0.35, shop: 'order',
  },
  great: {
    name: 'Great', reaction: 0.16, handSpeed: 2700, holdTime: 0.16, aimLag: 0.07, clickNoise: 7, misclick: 0.02, weakThrow: 0.025,
    throwNoise: 28, tactics: 1, readsShields: true, potRate: 0.8, perchRate: 0.5, weaponEvery: 0.9, weaponUse: 0.95, minCrowd: 4,
    weaponNoise: 32, lead: 0.9, tapEvery: 0.2, tapsPerCart: 7, yetiTeamwork: 1, shop: 'plan',
  },
};

/** Sensible order for a player who just buys what is next. */
const ORDER_MID = [
  'cauldron', 'gate1', 'wheel1', 'comet1', 'mortar', 'stomper1', 'gate2', 'perch', 'comet2', 'wheel2', 'stomper2', 'bolter1',
  'frost', 'gate3', 'comet3', 'stomper3', 'wheel3', 'bolter2', 'bellows', 'gate4', 'bolter3',
];
/** Offerings first, then area damage, gates when they are due. */
const ORDER_GREAT = [
  'cauldron', 'perch', 'comet1', 'wheel1', 'gate1', 'stomper1', 'comet2', 'mortar', 'stomper2', 'wheel2', 'gate2', 'comet3', 'bolter1',
  'stomper3', 'wheel3', 'gate3', 'frost', 'bolter2', 'bellows', 'bolter3', 'gate4',
];

interface Step { t: number; run: () => void }
interface Glide { x0: number; y0: number; x1: number; y1: number; t0: number; t1: number }
type Aim = 'kill' | 'pot' | 'perch';

/** Raiders a weapon's blast would catch around a point. */
interface Crowd { x: number; n: number }

/**
 * A scripted player for headless balance runs. It only moves its hand, presses, lets go and shops
 * through the same commands a person's input turns into, and it takes time for all of them.
 */
export class Bot {
  private now = 0;
  private queue: Step[] = [];
  private glide: Glide | null = null;
  private nextDecision = 0;
  private nextWeaponLook = 0;
  private shopped = -1;
  private potFreeAt = 0;
  private perchFreeAt = 0;

  constructor(private p: number, private skill: BotSkill, private rand: () => number) {}

  tick(sim: Sim) {
    const s = sim.s;
    if (s.phase === 'intermission') {
      this.clear();
      if (this.shopped !== s.day) {
        this.shopped = s.day;
        this.shop(sim);
        sim.command({ k: 'ready', p: this.p, ready: true });
      }
      return;
    }
    if (s.phase !== 'battle' || s.paused) {
      this.clear();
      return;
    }
    this.now += DT;
    if (this.glide) this.moveHand(sim);
    while (this.queue.length > 0 && this.queue[0].t <= this.now) this.queue.shift()!.run();
    if (this.queue.length === 0 && this.now >= this.nextDecision) this.decide(sim);
  }

  private clear() {
    this.queue = [];
    this.glide = null;
    this.nextDecision = this.now + 0.3;
  }

  private gauss(sd: number) {
    // Sum of three uniforms: close enough to a bell curve and cheap.
    return (this.rand() + this.rand() + this.rand() - 1.5) * sd * 1.15;
  }

  private at(delay: number, run: () => void) {
    this.queue.push({ t: this.now + delay, run });
  }

  private rest(after: number) {
    // Nobody starts the next move in under 150 ms, however good they are.
    this.nextDecision = this.now + after + Math.max(0.15, this.skill.reaction * (0.75 + this.rand() * 0.5));
  }

  /** Starts moving the hand, returns how long it takes to get there. */
  private moveTo(sim: Sim, x: number, y: number, extraDelay = 0): number {
    const h = sim.s.hands[this.p];
    const from = this.glide && this.now < this.glide.t1 ? this.glide : null;
    const x0 = from ? from.x1 : h.x;
    const y0 = from ? from.y1 : h.y;
    // A wider field is drawn smaller: the hand crosses the same screen in the same time.
    const dur = Math.hypot(x - x0, y - y0) / (this.skill.handSpeed * (sim.fieldW / WORLD.width)) + 0.05;
    this.glide = { x0, y0, x1: x, y1: y, t0: this.now + extraDelay, t1: this.now + extraDelay + dur };
    return dur;
  }

  private moveHand(sim: Sim) {
    const g = this.glide!;
    if (this.now < g.t0) return;
    const u = Math.min(1, (this.now - g.t0) / Math.max(1e-3, g.t1 - g.t0));
    sim.setHand(this.p, g.x0 + (g.x1 - g.x0) * u, g.y0 + (g.y1 - g.y0) * u);
    if (u >= 1) this.glide = null;
  }

  // ---------------------------------------------------------------------------
  // Choosing what to do
  // ---------------------------------------------------------------------------

  private decide(sim: Sim) {
    if (this.now >= this.nextWeaponLook) {
      this.nextWeaponLook = this.now + this.skill.weaponEvery * (0.8 + this.rand() * 0.4);
      if (this.useWeapon(sim)) return;
    }
    const e = this.pick(sim);
    if (!e) { this.nextDecision = this.now + 0.15; return; }
    if (e.type === 'siegeCart') this.tapCart(sim, e);
    else this.grab(sim, e);
  }

  private otherHandNear(sim: Sim, e: Enemy): boolean {
    return sim.s.hands.some((h, i) => i !== this.p && Math.abs(h.x - e.x) < 90 && Math.abs(h.y - e.y) < 140);
  }

  /** The one a person with this much sense would go for next. */
  private pick(sim: Sim): Enemy | null {
    const s = sim.s;
    const k = this.skill;
    const h = s.hands[this.p];
    const fieldEnd = sim.fieldW - 6;
    const twoPlayers = s.hands.length > 1;
    let best: Enemy | null = null;
    let bestScore = -Infinity;
    for (const e of s.enemies) {
      if (e.dead || e.hidden || e.x > fieldEnd || e.st === 'air' || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      if (e.type === 'yeti') {
        if (!twoPlayers || k.yetiTeamwork <= 0 || this.rand() > k.yetiTeamwork) continue;
        if (e.heldBy.includes(this.p) || e.heldBy.length > 1 || e.x > sim.fieldW * 0.7) continue;
      } else if (e.heldBy.length > 0) continue;
      if (k.readsShields && e.shieldOn) continue;
      const def = ENEMIES[e.type];
      const reach = Math.hypot(e.x - h.x, e.y - def.height * 0.5 - h.y);
      let score: number;
      if (k.tactics <= 0) {
        // Whatever happens to be closest, and even that not reliably.
        score = -reach / 380 + this.rand() * 1.3;
        if (e.type === 'siegeCart') score -= 1.2;
      } else {
        const fromGate = Math.max(0, e.x - WORLD.gateX) / (sim.fieldW - WORLD.gateX);
        const hitting = e.st === 'attack' || (e.st === 'float' && e.x <= WORLD.gateX + def.range + 4) ? 1 : 0;
        const dps = (e.crow ? 6 : def.strike) / def.strikeEvery;
        score = (1 - fromGate) * 1.2 + hitting * (0.9 + dps * 0.05 * k.tactics) - reach / 2600 + this.rand() * 0.25 * (1.2 - k.tactics);
        if (e.type === 'bomber' && e.armed) score += 0.35 * k.tactics;
        if (e.type === 'siegeCart' && e.st !== 'attack') score -= 1.5;
        if (e.type === 'yeti') score += e.heldBy.length === 1 ? 5 : 1.2;
        // Only attentive players keep out of each other's way.
        if (twoPlayers && k.tactics >= 0.9 && this.otherHandNear(sim, e)) score -= 0.8;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // Grabbing and throwing
  // ---------------------------------------------------------------------------

  private aimPoint(e: Enemy) {
    const k = this.skill;
    const def = ENEMIES[e.type];
    const wide = this.rand() < k.misclick ? (this.rand() < 0.5 ? -1 : 1) * 110 : 0;
    return { x: e.x + this.gauss(k.clickNoise) + wide, y: e.y - (e.crow ? 20 : def.height * 0.5) + this.gauss(k.clickNoise) };
  }

  private grab(sim: Sim, e: Enemy) {
    const k = this.skill;
    const id = e.id;
    const def = ENEMIES[e.type];
    const walkAhead = this.moveTo(sim, e.x, e.y - def.height * 0.5);
    const pressAt = walkAhead + 0.02;
    let aimed: { x: number; y: number } | null = null;
    this.at(Math.max(0, pressAt - k.aimLag), () => {
      const now = sim.s.enemies.find((o) => o.id === id);
      aimed = now ? this.aimPoint(now) : null;
    });
    this.at(pressAt, () => {
      if (!aimed) return;
      this.glide = null;
      sim.command({ k: 'press', p: this.p, x: aimed.x, y: aimed.y });
    });
    const hold = e.type === 'yeti' ? 1.6 : k.holdTime * (0.85 + this.rand() * 0.3);
    this.at(pressAt + hold, () => this.letGo(sim, id));
    this.rest(pressAt + hold);
  }

  private letGo(sim: Sim, targetId: number) {
    const s = sim.s;
    const h = s.hands[this.p];
    if (h.holding < 0 && h.holdingProj < 0) {
      if (h.down) sim.command({ k: 'release', p: this.p, x: h.x, y: h.y, vx: 0, vy: 0 });
      return;
    }
    const e = s.enemies.find((o) => o.id === h.holding);
    const grabbed = e ?? s.enemies.find((o) => o.id === targetId);
    const x = h.x;
    const y = h.y - 40;
    sim.setHand(this.p, x, y);
    if (!grabbed || grabbed.dead) {
      sim.command({ k: 'release', p: this.p, x, y, vx: 0, vy: 0 });
      return;
    }
    const v = this.throwFor(sim, grabbed, x, y);
    sim.command({ k: 'release', p: this.p, x, y, vx: v.vx, vy: v.vy });
  }

  private throwFor(sim: Sim, e: Enemy, x: number, y: number): { vx: number; vy: number } {
    const k = this.skill;
    if (e.type === 'yeti') return { vx: 80, vy: -1500 };
    if (this.rand() < k.weakThrow) return { vx: this.gauss(120), vy: -500 - this.rand() * 250 };
    const kind = this.chooseAim(sim, e, x);
    if (kind === 'perch') {
      const v = this.lobTo(sim, x + e.grabOffX, y + e.grabOffY, perchX(sim.fieldW), WORLD.perch.hookY + ENEMIES[e.type].height * 0.3, 0.42);
      if (v) { this.perchFreeAt = this.now + 2.2; return v; }
    }
    if (kind === 'pot') {
      const v = this.potThrow(sim, e, x, y);
      if (v) { this.potFreeAt = this.now + 0.7 + sim.tuning.cauldronSeconds; return v; }
    }
    return { vx: this.gauss(60), vy: -1250 - this.rand() * 250 };
  }

  private chooseAim(sim: Sim, e: Enemy, x: number): Aim {
    const k = this.skill;
    const s = sim.s;
    if (e.type === 'yeti') return 'kill';
    if (sim.owns('perch') && s.perchBusy <= 0 && this.now >= this.perchFreeAt && Math.abs(perchX(sim.fieldW) - x) < 700 && this.rand() < k.perchRate) return 'perch';
    if (sim.owns('cauldron') && s.potBusy <= 0 && this.now >= this.potFreeAt && this.rand() < k.potRate) return 'pot';
    return 'kill';
  }

  private potThrow(sim: Sim, e: Enemy, x: number, y: number) {
    const k = this.skill;
    const ex = x + e.grabOffX;
    const ey = y + e.grabOffY;
    if (sim.flag('cauldron') === 'back') {
      const { x: px, rimY } = WORLD.cauldronBack;
      return this.lobTo(sim, ex, ey - ENEMIES[e.type].height * 0.45, px, rimY, 0.34);
    }
    const g = sim.tuning.gravity;
    const vy = -1100;
    const ground = WORLD.groundY + e.lane;
    const tLand = (-vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, ground - ey))) / g;
    const target = WORLD.cauldron.x + this.gauss(k.throwNoise);
    const vx = (target - ex) / tLand;
    if (Math.abs(vx) > 1300) return null;
    return { vx, vy };
  }

  /** A throw that passes through a point after a flight time chosen for the distance. */
  private lobTo(sim: Sim, ex: number, ey: number, tx: number, ty: number, minT: number) {
    const k = this.skill;
    const g = sim.tuning.gravity;
    const dx = tx + this.gauss(k.throwNoise) - ex;
    const dy = ty + this.gauss(k.throwNoise * 0.6) - ey;
    const T = Math.max(minT, Math.abs(dx) / 1050);
    const vx = dx / T;
    const vy = (dy - 0.5 * g * T * T) / T;
    if (Math.hypot(vx, vy) > sim.tuning.maxThrow * 0.98) return null;
    return { vx, vy };
  }

  private tapCart(sim: Sim, e: Enemy) {
    const k = this.skill;
    const id = e.id;
    const def = ENEMIES[e.type];
    const y = e.y - def.height * 0.5;
    const first = this.moveTo(sim, e.x, y) + 0.02;
    let t = first;
    for (let i = 0; i < k.tapsPerCart; i++) {
      const at = t;
      this.at(at, () => {
        const now = sim.s.enemies.find((o) => o.id === id);
        if (!now || now.dead) return;
        const px = now.x + this.gauss(k.clickNoise);
        const py = now.y - def.height * 0.5 + this.gauss(k.clickNoise);
        sim.command({ k: 'press', p: this.p, x: px, y: py });
        sim.command({ k: 'release', p: this.p, x: px, y: py, vx: 0, vy: 0 });
      });
      t += k.tapEvery * (0.9 + this.rand() * 0.2);
    }
    this.rest(t);
  }

  // ---------------------------------------------------------------------------
  // Weapons
  // ---------------------------------------------------------------------------

  private ready(sim: Sim, slot: WeaponSlot) {
    return sim.tierOf(slot) !== null && sim.s.cooldowns[slot] <= 0;
  }

  /** Best spot for a blast of this half width. */
  private crowd(sim: Sim, halfWidth: number, groundedOnly: boolean): Crowd {
    const end = sim.fieldW - 10;
    // Solo a yeti can only be beaten with weapons, so one counts like a small crowd of its own.
    const yetiWeight = 6;
    const pts: { x: number; w: number }[] = [];
    for (const e of sim.s.enemies) {
      if (e.dead || e.x > end || e.hidden || e.st === 'air' || e.st === 'hooked' || e.st === 'cooking') continue;
      if (groundedOnly && e.st === 'float') continue;
      pts.push({ x: e.x, w: e.type === 'yeti' && e.x < WORLD.gateX + 320 ? yetiWeight : 1 });
    }
    pts.sort((a, b) => a.x - b.x);
    let best: Crowd = { x: WORLD.gateX + 120, n: 0 };
    let j = 0;
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      sum += pts[i].w;
      while (pts[i].x - pts[j].x > halfWidth * 2) { sum -= pts[j].w; j++; }
      if (sum > best.n) best = { x: (pts[i].x + pts[j].x) / 2, n: sum };
    }
    return best;
  }

  private walkLead(sim: Sim, x: number, flight: number): number {
    if (x < WORLD.gateX + 70) return 0;
    const speed = ENEMIES.grunt.speed * (1 + (sim.s.day - 1) * 0.03);
    return speed * flight * this.skill.lead;
  }

  private useWeapon(sim: Sim): boolean {
    const k = this.skill;
    for (const slot of SLOT_ORDER) {
      if (!this.ready(sim, slot) || this.rand() > k.weaponUse) continue;
      if (this.fire(sim, slot)) return true;
    }
    return false;
  }

  private fire(sim: Sim, slot: WeaponSlot): boolean {
    const k = this.skill;
    const halfWidth = SLOT_REACH[slot];
    const grounded = slot === 'wheel' || slot === 'stomper';
    const c = this.crowd(sim, slot === 'wheel' ? 2000 : halfWidth, grounded);
    if (c.n < k.minCrowd) return false;
    const hit = WORLD.slots[slot];
    const reach = this.moveTo(sim, hit.x, hit.y) + 0.03;
    const p = this.p;
    if (slot === 'wheel') {
      this.at(reach, () => {
        sim.command({ k: 'pressSlot', p, slot, x: hit.x, y: hit.y });
        sim.command({ k: 'release', p, x: hit.x, y: hit.y, vx: 0, vy: 0 });
      });
      this.rest(reach);
      return true;
    }
    if (slot === 'comet' || slot === 'stomper') {
      const delay = slot === 'comet' ? 0.55 : 0.25;
      const x = c.x + this.gauss(k.weaponNoise);
      this.at(reach, () => {
        sim.command({ k: 'pressSlot', p, slot, x: hit.x, y: hit.y });
        sim.command({ k: 'release', p, x: hit.x, y: hit.y, vx: 0, vy: 0 });
        const dur = this.moveTo(sim, x, 420);
        this.at(dur, () => {
          const target = x - this.walkLead(sim, x, delay + dur * 0.5);
          sim.command({ k: 'press', p, x: target, y: 420 });
          sim.command({ k: 'release', p, x: target, y: 420, vx: 0, vy: 2600 });
          this.nextWeaponLook = Math.max(this.nextWeaponLook, this.now + 0.2);
        });
      });
      this.rest(reach + Math.abs(x - hit.x) / k.handSpeed + 0.1);
      return true;
    }
    const horn = sim.s.meta.hornEquipped as 'mortar' | 'frost' | 'bellows' | null;
    const aimSlot = slot as 'bolter' | 'horn';
    const flight = slot === 'bolter' ? 0.35 : 1.0;
    const x = c.x + this.gauss(k.weaponNoise);
    this.at(reach, () => {
      sim.command({ k: 'pressSlot', p, slot, x: hit.x, y: hit.y });
      const target = Math.max(WORLD.gateX + 20, x - this.walkLead(sim, x, flight));
      const pull = pointerFor(aimSlot, horn, target, sim.fieldW, sim.tuning.gravity);
      const dur = this.moveTo(sim, pull.x, pull.y);
      this.at(dur + 0.08, () => {
        sim.command({ k: 'release', p, x: pull.x, y: pull.y, vx: 0, vy: 0 });
      });
    });
    this.rest(reach + 0.42);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Shop
  // ---------------------------------------------------------------------------

  private shop(sim: Sim) {
    const k = this.skill;
    if (k.shop === 'random') {
      const ids = SHOP_ITEMS.map((i) => i.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      for (const id of ids) if (sim.canBuy(id)) sim.command({ k: 'buy', p: this.p, item: id });
      return;
    }
    if (k.shop === 'order') {
      for (const id of ORDER_MID) if (sim.canBuy(id)) sim.command({ k: 'buy', p: this.p, item: id });
      return;
    }
    // Saves for the next key item instead of spending on whatever is in reach.
    for (const id of ORDER_GREAT) {
      if (sim.owns(id)) continue;
      if (!sim.canBuy(id)) return;
      sim.command({ k: 'buy', p: this.p, item: id });
    }
  }
}

/** Looked at in this order; the wheel needs no aiming, so it comes first. */
const SLOT_ORDER: WeaponSlot[] = ['wheel', 'comet', 'stomper', 'horn', 'bolter'];
/** Rough half width of each weapon's effect, for picking the best spot. */
const SLOT_REACH: Record<WeaponSlot, number> = { wheel: 2000, comet: 150, stomper: 120, horn: 110, bolter: 60 };
