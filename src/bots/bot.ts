// A scripted player for headless balance runs: one hand that grabs, throws, shakes, taps weapons and shops.
// It uses only the commands a person's input turns into, sees only what a person sees, and takes time for everything.
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD, perchX } from '../config/field';
import { HAND_RULES } from '../config/hand';
import { SLOTS, SLOT_COUNT } from '../config/slots';
import type { WeaponDef } from '../config/weapons';
import { weaponById } from '../config/weapons';
import { handStrength, massOfType, throwFactor } from '../sim/physics';
import type { Sim } from '../sim/sim';
import type { Enemy } from '../sim/types';
import { BotShopper } from './shopper';
import type { BotSkill } from './skills';

interface Step { t: number; run: () => void }
interface Glide { x0: number; y0: number; x1: number; y1: number; t0: number; t1: number }
type Aim = 'kill' | 'pot' | 'perch';

/** Raiders a weapon's reach would catch around a point. */
interface Crowd { x: number; n: number }

/** A raider a person would count as "on the road": alive, visible, on screen, not in a hand, the pot or on the hook. */
function onField(sim: Sim, e: Enemy): boolean {
  if (e.dead || e.hidden || e.x > sim.fieldW + 10) return false;
  return e.st !== 'held' && e.st !== 'hooked' && e.st !== 'cooking' && e.st !== 'flee';
}

function grounded(e: Enemy): boolean {
  return e.st === 'walk' || e.st === 'attack' || e.st === 'stun' || e.st === 'frozen' || e.st === 'hop';
}

/** Raiders a person sees as tough at a glance: they take a weapon, not a throw. */
const tough = (e: Enemy) => e.big || e.type === 'yeti' || e.type === 'siegeCart';

export class Bot {
  private now = 0;
  private queue: Step[] = [];
  private glide: Glide | null = null;
  private nextDecision = 0;
  private nextWeaponLook = 0;
  private shopped = -1;
  private potFreeAt = 0;
  private perchFreeAt = 0;
  readonly shopper: BotShopper;

  constructor(private p: number, private skill: BotSkill, private rand: () => number) {
    this.shopper = new BotShopper(p, skill, rand);
  }

  tick(sim: Sim) {
    const s = sim.s;
    if (s.phase === 'intermission') {
      this.clear();
      if (this.shopped !== s.day) {
        this.shopped = s.day;
        this.shopper.shop(sim);
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
    this.queue.sort((a, b) => a.t - b.t);
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

  private strength(sim: Sim, players: number[]): number {
    let sum = 0;
    for (const q of players) sum += handStrength(sim.loadout.handTier[q] ?? 1);
    return sum;
  }

  /** Hand strength a yeti needs before it leaves the ground. The hand notes in the armoury say as much. */
  private yetiNeed(e: Enemy) { return HAND_RULES.yetiLift * (e.big ? BEHAVIOUR.big.mass : 1); }

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
    const mine = this.strength(sim, [this.p]);
    const team = this.strength(sim, s.hands.map((_, i) => i));
    let best: Enemy | null = null;
    let bestScore = -Infinity;
    for (const e of s.enemies) {
      if (e.dead || e.hidden || e.x > fieldEnd || e.st === 'air' || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      let joinYeti = false;
      if (e.type === 'yeti') {
        const need = this.yetiNeed(e);
        if (mine >= need) {
          if (e.heldBy.length > 0) continue;
        } else {
          // Too heavy alone: only worth it together, and only for a player who plays together.
          if (!twoPlayers || team < need || k.yetiTeamwork <= 0 || this.rand() > k.yetiTeamwork) continue;
          if (e.heldBy.includes(this.p) || e.heldBy.length > 1 || e.x > sim.fieldW * 0.7) continue;
          joinYeti = e.heldBy.length === 1;
        }
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
        if (e.type === 'yeti') score += joinYeti ? 5 : 1.2;
        // Only attentive players keep out of each other's way.
        if (twoPlayers && k.tactics >= 0.9 && !joinYeti && this.otherHandNear(sim, e)) score -= 0.8;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // Grabbing, shaking and throwing
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
    const yetiTogether = e.type === 'yeti' && this.strength(sim, [this.p]) < this.yetiNeed(e);
    const hold = yetiTogether ? 1.6 : k.holdTime * (0.85 + this.rand() * 0.3);
    this.at(pressAt + hold, () => this.afterHold(sim, id));
    this.rest(pressAt + hold);
  }

  /** The hold is over: a Keg Hauler with its keg may get shaken first, everything else is thrown. */
  private afterHold(sim: Sim, targetId: number) {
    const h = sim.s.hands[this.p];
    const e = sim.s.enemies.find((o) => o.id === h.holding);
    if (!e || e.type !== 'bomber' || !e.armed || e.st !== 'held' || this.rand() >= this.skill.shakeTry) {
      this.letGo(sim, targetId);
      return;
    }
    // Shaking: the hand goes back and forth over the road for a while, then the keg comes loose.
    const k = this.skill;
    const x0 = h.x;
    const y0 = h.y;
    const swing = 46;
    const half = 0.09;
    let t = 0;
    for (let i = 0; t + half < k.shakeSeconds; i++) {
      t += half;
      const dx = i % 2 === 0 ? swing : -swing;
      this.at(t, () => sim.setHand(this.p, x0 + dx, y0));
    }
    this.at(k.shakeSeconds, () => {
      sim.setHand(this.p, x0, y0);
      sim.command({ k: 'shake', p: this.p });
    });
    // A moment to see the keg drop, then the hauler is thrown like any other.
    const after = k.shakeSeconds + Math.max(0.1, k.reaction * 0.6);
    this.at(after, () => this.letGo(sim, targetId));
    this.nextDecision = Math.max(this.nextDecision, this.now + after + 0.15);
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

  /** Share of the swipe that reaches this raider, as the player has learnt to feel it. */
  private factorOf(sim: Sim, e: Enemy): number {
    const holders = e.heldBy.length > 0 ? e.heldBy : [this.p];
    return throwFactor(massOfType(e.type, e.big, e.crow), this.strength(sim, holders));
  }

  /**
   * Turns the flight the player wants into the swipe it makes. Heavy raiders need a harder swipe;
   * how much harder the player gets right is its `heavyThrow`, and no swipe is faster than `swipeMax`.
   */
  private swipe(sim: Sim, e: Enemy, v: { vx: number; vy: number }): { vx: number; vy: number } {
    const k = this.skill;
    const f = this.factorOf(sim, e);
    let gain = 1 / (sim.tuning.throwMult * Math.pow(f, k.heavyThrow));
    const sp = Math.hypot(v.vx, v.vy) * gain;
    if (sp > k.swipeMax) gain *= k.swipeMax / sp;
    return { vx: v.vx * gain, vy: v.vy * gain };
  }

  private throwFor(sim: Sim, e: Enemy, x: number, y: number): { vx: number; vy: number } {
    const k = this.skill;
    if (e.type === 'yeti') return this.swipe(sim, e, { vx: 80, vy: -1500 });
    // A weak throw is a weak swipe, whatever the weight.
    if (this.rand() < k.weakThrow) return { vx: this.gauss(120), vy: -500 - this.rand() * 250 };
    const kind = this.chooseAim(sim, e, x);
    if (kind === 'perch') {
      const v = this.lobTo(sim, e, x + e.grabOffX, y + e.grabOffY, perchX(sim.fieldW), WORLD.perch.hookY + ENEMIES[e.type].height * 0.3, 0.42);
      if (v) { this.perchFreeAt = this.now + 2.2; return this.swipe(sim, e, v); }
    }
    if (kind === 'pot') {
      const ex = x + e.grabOffX;
      const ey = y + e.grabOffY;
      const v = this.lobTo(sim, e, ex, ey - ENEMIES[e.type].height * 0.45, WORLD.cauldron.x, WORLD.cauldron.rimY, 0.34);
      if (v) { this.potFreeAt = this.now + 0.7 + sim.tuning.cauldronSeconds; return this.swipe(sim, e, v); }
    }
    return this.swipe(sim, e, { vx: this.gauss(60), vy: -1250 - this.rand() * 250 });
  }

  private chooseAim(sim: Sim, e: Enemy, x: number): Aim {
    const k = this.skill;
    const s = sim.s;
    const st = sim.loadout.stations;
    // Neither the eagle nor the pot takes a yeti or an oversized raider.
    if (e.type === 'yeti' || e.big) return 'kill';
    if (st.perch && s.perchBusy <= 0 && this.now >= this.perchFreeAt && Math.abs(perchX(sim.fieldW) - x) < 700 && this.rand() < k.perchRate) return 'perch';
    if (st.cauldron && s.potBusy <= 0 && this.now >= this.potFreeAt && this.rand() < k.potRate) return 'pot';
    return 'kill';
  }

  /** A throw that passes through a point after a flight time chosen for the distance; null if out of reach for this weight. */
  private lobTo(sim: Sim, e: Enemy, ex: number, ey: number, tx: number, ty: number, minT: number) {
    const k = this.skill;
    const g = sim.tuning.gravity;
    const dx = tx + this.gauss(k.throwNoise) - ex;
    const dy = ty + this.gauss(k.throwNoise * 0.6) - ey;
    const T = Math.max(minT, Math.abs(dx) / 1050);
    const vx = dx / T;
    const vy = (dy - 0.5 * g * T * T) / T;
    // A heavy raider cannot be flung as fast as a light one; a player learns where that ends.
    const cap = sim.tuning.maxThrow * Math.max(this.factorOf(sim, e), 0.62);
    if (Math.hypot(vx, vy) > cap * 0.98) return null;
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
  // Weapons: one tap each, the weapon picks its own target
  // ---------------------------------------------------------------------------

  private useWeapon(sim: Sim): boolean {
    const k = this.skill;
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const id = sim.loadout.slotWeapon[slot];
      if (!id || sim.s.cooldowns[slot] > 0 || this.rand() > k.weaponUse) continue;
      const def = weaponById(id);
      if (!def || !this.wants(sim, def)) continue;
      const pos = SLOTS[slot];
      const reach = this.moveTo(sim, pos.x, pos.y) + 0.03;
      this.at(reach, () => sim.command({ k: 'fireSlot', p: this.p, slot }));
      this.rest(reach);
      return true;
    }
    return false;
  }

  /** Densest group for a reach of this half width, counting tough raiders as several. */
  private crowd(sim: Sim, halfWidth: number, groundOnly: boolean): Crowd {
    const pts: { x: number; w: number }[] = [];
    for (const e of sim.s.enemies) {
      if (!onField(sim, e) || e.st === 'air') continue;
      if (groundOnly && !grounded(e)) continue;
      // Solo a yeti can only be beaten with weapons, so one near the gate counts like a small crowd.
      pts.push({ x: e.x, w: tough(e) && e.type !== 'siegeCart' && e.x < WORLD.gateX + 320 ? 6 : 1 });
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

  /** Raiders within this distance of the gate. */
  private nearGate(sim: Sim, reach: number, groundOnly = false): number {
    let n = 0;
    for (const e of sim.s.enemies) {
      if (!onField(sim, e) || e.st === 'air' || (groundOnly && !grounded(e))) continue;
      if (e.x - WORLD.gateX <= reach) n++;
    }
    return n;
  }

  private visible(sim: Sim): Enemy[] {
    return sim.s.enemies.filter((e) => onField(sim, e) && e.st !== 'air');
  }

  /** Would a player of this skill tap this weapon right now? A weapon with nothing to hit costs nothing, but taps it would waste a reload. */
  private wants(sim: Sim, def: WeaponDef): boolean {
    const k = this.skill;
    const tier = sim.loadout.weaponTier[def.id] ?? 1;
    const t = def.tiers[Math.max(1, Math.min(def.tiers.length, tier)) - 1];
    const all = this.visible(sim);
    if (all.length === 0) return false;
    const s = sim.s;
    const gateLow = s.gateMax > 0 && s.gateHp / s.gateMax < 0.45;
    const groundN = all.filter(grounded).length;
    switch (def.kind) {
      case 'roll': return groundN >= k.minCrowd;
      case 'spikes':
      case 'slam': return this.crowd(sim, (t as { halfWidth: number }).halfWidth, true).n >= k.minCrowd;
      case 'sky': return this.crowd(sim, (t as { radius: number }).radius, true).n >= k.minCrowd;
      case 'shell': {
        const r = (t as { radius: number }).radius;
        if (def.target === 'front') {
          // The shell goes to whoever is closest to the gate: worth it once a few stand there.
          const front = all.filter(grounded).sort((a, b) => a.x - b.x)[0];
          if (!front) return false;
          const n = all.filter((e) => grounded(e) && Math.abs(e.x - front.x) <= r).length;
          return n >= Math.max(1, Math.ceil(k.minCrowd / 2)) || tough(front);
        }
        return this.crowd(sim, r, true).n >= k.minCrowd;
      }
      case 'puddle': {
        const front = all.filter(grounded).sort((a, b) => a.x - b.x)[0];
        if (!front) return false;
        const hw = (t as { halfWidth: number }).halfWidth;
        return all.filter((e) => grounded(e) && e.x - front.x <= hw * 2).length >= k.minCrowd;
      }
      case 'chain': return all.length >= k.minCrowd || all.some(tough);
      case 'volley': return all.length >= k.minCrowd || all.some((e) => e.st === 'float');
      case 'sentry': return all.length >= Math.max(1, Math.ceil(k.minCrowd / 2));
      case 'thorns': {
        const reach = (t as { burstReach: number }).burstReach + 20;
        return this.nearGate(sim, reach, true) >= (k.weaponWise ? Math.max(1, k.minCrowd - 1) : 1);
      }
      case 'push': {
        const reach = (t as { reach: number }).reach;
        if (!k.weaponWise) return this.nearGate(sim, reach) >= 1;
        // Saved for when the gate is pressed: several close by, or the gate is getting low.
        const near = this.nearGate(sim, reach);
        return near >= k.minCrowd + 1 || (gateLow && near >= 1);
      }
      case 'stop': {
        if (!k.weaponWise) return all.length >= k.minCrowd;
        const near = this.nearGate(sim, 360);
        return near >= k.minCrowd + 1 || (gateLow && near >= 1);
      }
      case 'gold': {
        if (!k.weaponWise) return true;
        // Just before many kills: a full road, or a damage weapon about to go off.
        const ready = this.damageReady(sim);
        return all.length >= k.minCrowd * 2 + 2 || (ready && all.length >= k.minCrowd + 1);
      }
      case 'beacon': {
        if (!k.weaponWise) return true;
        // Before a run of throws: enough raiders in reach of the hand.
        const grabbable = all.filter((e) => ENEMIES[e.type].grabbable && !tough(e) && !e.shieldOn).length;
        return grabbable >= k.minCrowd + 2;
      }
    }
  }

  /** A weapon that kills groups is ready on the keep. */
  private damageReady(sim: Sim): boolean {
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const def = weaponById(sim.loadout.slotWeapon[slot] ?? '');
      if (!def || sim.s.cooldowns[slot] > 0) continue;
      if (def.kind === 'roll' || def.kind === 'slam' || def.kind === 'sky' || def.kind === 'spikes' || (def.kind === 'shell' && def.tiers[0].effect === 'blast')) return true;
    }
    return false;
  }
}
