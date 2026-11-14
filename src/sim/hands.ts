// Part of the simulation: what a player's hands do (grabbing, holding, shaking, throwing).
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/field';
import { secondHandSimulated } from '../config/flags';
import { HANDS, HAND_RULES } from '../config/hand';
import { followFactor, grabBonus, hasPermanentSecondHand, isSecondHand, launchVelocity, liftFlat, playerOfHand, springStep, throwFactor } from './physics';
import type { Enemy, Hand, Projectile } from './types';
import { clamp, type SimContext } from './context';

/**
 * Everything a hand does: grabbing, holding, shaking and throwing.
 * The guest predicts some of this on its own machine, see GuestSession (handbook, trap 4).
 *
 * Hands are numbered (`handIndex` in physics.ts): player p's first hand is p, their second hand
 * (C9) is p + players. `heldBy` and `holdingProj` hold hand numbers; kills, gold and crests are
 * credited to the hand's player (`playerOf`).
 */
export class Hands {
  constructor(private ctx: SimContext) {}

  /** Number of players; hand p + players is player p's second hand. */
  get players(): number { return Math.max(1, this.ctx.s.meta.names.length); }

  /** The player a hand belongs to. */
  playerOf(hand: number): number { return playerOfHand(hand, this.players); }

  /**
   * A player may use a second hand: for good from hand tier 7 (C9 variant 1), for a while through
   * the Helping Hand (variant 2), or always when the developer switch simulates it on a laptop.
   */
  secondHandReady(player: number): boolean {
    if (hasPermanentSecondHand(this.ctx.loadout.handTier[player] ?? 1)) return true;
    if ((this.ctx.s.extraHandT[player] ?? 0) > 0) return true;
    return secondHandSimulated(this.ctx.s.meta.flags);
  }

  /** Whether this hand may act right now. A player's first hand always may. */
  usable(hand: number): boolean {
    if (!isSecondHand(hand, this.players)) return true;
    return this.secondHandReady(this.playerOf(hand));
  }

  /** Strength of one hand: the player's tier; a lent second hand (Helping Hand) has its share of it. */
  strengthOfHand(hand: number): number {
    const tier = this.ctx.loadout.handTier[this.playerOf(hand)] ?? 1;
    const own = HANDS[clamp(Math.round(tier), 1, HANDS.length) - 1].strength;
    if (!isSecondHand(hand, this.players) || hasPermanentSecondHand(tier) || secondHandSimulated(this.ctx.s.meta.flags)) return own;
    const share = this.ctx.s.extraHandStrength;
    return own * (share > 0 ? share : 1);
  }

  /** Combined strength of the given hands: several hands on one raider add up (C8), times the Iron Grip. */
  strengthOf(hands: number[]): number {
    let sum = 0;
    for (const h of hands) sum += this.strengthOfHand(h);
    return sum * this.ctx.weapons.gripStrength();
  }

  /** Second hands come into being the first time they are used. */
  private ensure(hand: number): Hand | undefined {
    const s = this.ctx.s;
    if (hand < 0 || hand >= this.players * 2) return undefined;
    while (s.hands.length <= hand) {
      s.hands.push({ x: -200, y: -200, down: false, holding: -1, holdingProj: -1, pressX: 0, pressY: 0, pressTick: 0, connected: true });
    }
    return s.hands[hand];
  }

  /** A hand follows its finger. */
  move(hand: number, x: number, y: number) {
    if (!this.usable(hand)) return;
    const h = this.ensure(hand);
    if (h) { h.x = x; h.y = y; }
  }

  press(hand: number, x: number, y: number) {
    const s = this.ctx.s;
    // Without a second hand a second finger does nothing.
    if (!this.usable(hand)) return;
    const h = this.ensure(hand);
    if (!h) return;
    h.x = x; h.y = y; h.down = true;
    h.pressX = x; h.pressY = y; h.pressTick = s.tick;
    if (s.phase !== 'battle' || s.paused) return;
    if (this.tryGrabBomb(hand, x, y)) return;
    this.tryGrabEnemy(hand, x, y);
  }

  tryGrabBomb(hand: number, x: number, y: number): boolean {
    const h = this.ctx.s.hands[hand];
    let best: Projectile | null = null;
    let bestD = 44 + this.ctx.tuning.grabRadius * 0.5;
    for (const q of this.ctx.s.projectiles) {
      if (q.kind !== 'bomb' || q.heldBy >= 0 || q.burstOnLand) continue;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bestD) { bestD = d; best = q; }
    }
    if (!best) return false;
    best.heldBy = hand;
    best.byPlayer = true;
    h.holdingProj = best.id;
    return true;
  }

  grabDistance(e: Enemy, x: number, y: number): number {
    const def = ENEMIES[e.type];
    const scale = e.big ? BEHAVIOUR.big.scale : 1;
    const halfW = def.radius * scale;
    const top = e.y - (e.crow ? 40 : def.height * scale);
    const dx = Math.max(0, Math.abs(x - e.x) - halfW);
    const dy = y < top ? top - y : y > e.y ? y - e.y : 0;
    return Math.hypot(dx, dy);
  }

  /** A yeti leaves the ground only when the hands on it are strong enough together. */
  canLift(e: Enemy): boolean {
    if (e.type !== 'yeti') return true;
    return this.strengthOf(e.heldBy) >= HAND_RULES.yetiLift * (e.big ? BEHAVIOUR.big.mass : 1);
  }

  /**
   * A hand may take hold of a raider that is already held: anyone may help with a Yeti, and a
   * player's own two hands may share any raider (C9). Their strengths add up.
   */
  mayJoin(e: Enemy, hand: number): boolean {
    if (e.heldBy.includes(hand)) return false;
    if (e.type === 'yeti') return true;
    const me = this.playerOf(hand);
    return e.heldBy.every((q) => this.playerOf(q) === me);
  }

  tryGrabEnemy(hand: number, x: number, y: number) {
    const s = this.ctx.s;
    const h = s.hands[hand];
    const pad = this.ctx.tuning.grabRadius;
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of s.enemies) {
      if (e.dead || e.hidden || e.st === 'hooked' || e.st === 'cooking' || e.st === 'flee') continue;
      if (e.heldBy.length > 0 && !this.mayJoin(e, hand)) continue;
      const d = this.grabDistance(e, x, y);
      if (d > pad + grabBonus(e.type, e.st)) continue;
      // Prefer the enemy the pointer is actually inside, then the closest centre; a free raider before one already held.
      const score = d + Math.abs(x - e.x) * 0.02 + (e.heldBy.length > 0 && e.type !== 'yeti' ? 1000 : 0);
      if (score < bestD) { bestD = score; best = e; }
    }
    if (!best) return;
    const e = best;
    const p = this.playerOf(hand);
    if (e.shieldOn) { this.ctx.emit({ e: 'shieldBlock', x: e.x, y: e.y - 40 }); return; }
    if (!ENEMIES[e.type].grabbable) {
      this.ctx.emit({ e: 'tapCart', x, y, hp: e.hp });
      this.ctx.combat.hurt(e, e.maxHp / BEHAVIOUR.siegeCartTaps, 'tap', p);
      return;
    }
    const joining = e.heldBy.length > 0;
    e.heldBy.push(hand);
    if (!joining) {
      e.frozenHeld = e.st === 'frozen';
      e.grabOffX = clamp(e.x - x, -ENEMIES[e.type].radius, ENEMIES[e.type].radius);
      e.grabOffY = clamp(e.y - y, 0, ENEMIES[e.type].height);
    }
    if (e.type === 'yeti') {
      e.grabOffX = 0; e.grabOffY = ENEMIES.yeti.height * 0.5;
      if (e.heldBy.length === 1) e.tugLimit = e.x + BEHAVIOUR.yeti.tugReach;
      if (this.canLift(e)) { e.st = 'held'; e.vx = 0; e.vy = 0; }
    } else {
      e.st = 'held';
      e.vx = 0; e.vy = 0;
    }
    h.holding = e.id;
    this.ctx.emit({ e: 'grab', id: e.id, p, x: e.x, y: e.y, etype: e.type });
  }

  /** `hand` lets go; the throw is credited to its player. */
  release(hand: number, x: number, y: number, vx: number, vy: number) {
    const s = this.ctx.s;
    const h = s.hands[hand];
    if (!h) return;
    const p = this.playerOf(hand);
    h.x = x; h.y = y; h.down = false;

    if (s.phase !== 'battle') { this.dropHeld(hand); return; }
    if (s.paused) return;

    if (h.holdingProj >= 0) {
      const q = s.projectiles.find((o) => o.id === h.holdingProj);
      h.holdingProj = -1;
      if (q) {
        q.heldBy = -1;
        const v = launchVelocity(vx, vy, this.ctx.tuning, 1);
        q.vx = v.vx; q.vy = v.vy; q.x = x; q.y = y;
        q.landed = false;
      }
      return;
    }

    const e = s.enemies.find((o) => o.id === h.holding);
    h.holding = -1;
    if (!e || e.dead) return;

    const held = (s.tick - h.pressTick) * DT;
    const moved = Math.hypot(x - h.pressX, y - h.pressY);
    const isTap = held <= BEHAVIOUR.tapMaxSeconds && moved <= BEHAVIOUR.tapMaxMove;
    const holders = e.heldBy.length > 0 ? e.heldBy : [hand];

    if (e.type === 'yeti') {
      const wasLifted = e.st === 'held';
      e.heldBy = [];
      for (const other of s.hands) if (other.holding === e.id) other.holding = -1;
      if (wasLifted) this.throwEnemy(e, vx, vy, p, holders);
      return;
    }

    // With both of a player's hands on it, letting go with either one throws, with both strengths.
    for (const other of s.hands) if (other.holding === e.id) other.holding = -1;
    e.heldBy = [];
    if (isTap && e.st === 'held' && e.frozenHeld) {
      this.ctx.combat.shatter(e, p, this.ctx.weapons.shatterSpread());
      return;
    }

    e.x = clamp(x + e.grabOffX, WORLD.gateX + 10, this.ctx.wall - 10);
    e.y = Math.min(y + e.grabOffY, this.ctx.groundOf(e));
    e.thrownBy = p;
    if (this.ctx.stations.tryPotOnRelease(e, vx, vy)) return;
    this.throwEnemy(e, vx, vy, p, holders);
    const lift = liftFlat(e.y, this.ctx.groundOf(e), e.vx, e.vy);
    if (lift) { e.y = lift.y; e.vy = lift.vy; }
    this.ctx.stations.steerAtPot(e);
    this.ctx.stations.throwAtPerch(e);
  }

  /** p is the player credited with the throw, holders the hands that threw. */
  throwEnemy(e: Enemy, vx: number, vy: number, p: number, holders: number[] = [p]) {
    const factor = throwFactor(this.ctx.massOf(e), this.strengthOf(holders));
    const v = launchVelocity(vx, vy, this.ctx.tuning, factor);
    e.vx = v.vx; e.vy = v.vy;
    e.st = 'air';
    e.thrownBy = p;
    e.rotV = clamp(v.vx / 110, -14, 14) + (Math.abs(v.vy) / 240) * (v.vx >= 0 ? 1 : -1);
    if (Math.abs(e.rotV) < 1) e.rotV = this.ctx.rng.range(-3, 3);
    this.ctx.stats.thrown();
    this.ctx.emit({ e: 'release', id: e.id, p, speed: Math.hypot(v.vx, v.vy), x: e.x, y: e.y });
  }

  /**
   * The hand shook what it holds (the device counted the direction changes). A Keg Hauler loses
   * its keg: it drops straight down and bursts on the road below.
   */
  shake(hand: number) {
    const s = this.ctx.s;
    const h = s.hands[hand];
    if (!h || s.phase !== 'battle' || s.paused) return;
    const e = s.enemies.find((o) => o.id === h.holding);
    if (!e || e.dead || e.type !== 'bomber' || !e.armed || e.st !== 'held') return;
    this.ctx.stations.dropKeg(e, this.playerOf(hand));
  }

  dropHeld(hand: number) {
    const s = this.ctx.s;
    const h = s.hands[hand];
    if (!h) return;
    const e = s.enemies.find((o) => o.id === h.holding);
    if (e) {
      e.heldBy = e.heldBy.filter((q) => q !== hand);
      if (e.type === 'yeti' && e.st === 'held') {
        for (const q of e.heldBy) if (s.hands[q]) s.hands[q].holding = -1;
        e.heldBy = [];
      }
      if (e.st === 'held' && e.heldBy.length === 0) { e.st = 'air'; e.vx = 0; e.vy = 0; }
    }
    h.holding = -1;
    const q = s.projectiles.find((o) => o.id === h.holdingProj);
    if (q) {
      q.heldBy = -1;
    }
    h.holdingProj = -1;
  }

  /** Lets go of everything a lent second hand holds once the Helping Hand runs out. */
  expireSecondHands() {
    const s = this.ctx.s;
    for (let i = this.players; i < s.hands.length; i++) {
      if (this.usable(i)) continue;
      const h = s.hands[i];
      if (h.holding >= 0 || h.holdingProj >= 0) this.dropHeld(i);
      h.down = false;
    }
  }

  updateHeld(e: Enemy) {
    const s = this.ctx.s;
    if (e.heldBy.some((q) => !this.usable(q))) this.expireSecondHands();
    const hands = e.heldBy.map((p) => s.hands[p]).filter((h) => !!h);
    if (hands.length === 0) { e.st = 'air'; return; }
    let tx = 0;
    let ty = 0;
    for (const h of hands) { tx += h.x; ty += h.y; }
    tx = tx / hands.length + e.grabOffX;
    ty = ty / hands.length + e.grabOffY;
    const k = this.ctx.tuning.holdSpring * followFactor(this.ctx.massOf(e), this.strengthOf(e.heldBy));
    springStep(e, tx, ty, k, DT);
    e.x = clamp(e.x, WORLD.gateX + 10, this.ctx.wall - 10);
    const ground = this.ctx.groundOf(e);
    if (e.y > ground) { e.y = ground; e.vy = Math.min(0, e.vy); }
    e.rot += (clamp(e.vx / 900, -0.8, 0.8) - e.rot) * 0.2;
  }

  /** Hands too weak to lift a yeti can only drag it a little. */
  updateTug(e: Enemy) {
    const s = this.ctx.s;
    if (e.heldBy.some((q) => !this.usable(q))) this.expireSecondHands();
    const h = s.hands[e.heldBy[0]];
    if (!h) return;
    // Another hand joining may make the hands strong enough together.
    if (this.canLift(e)) { e.st = 'held'; e.vx = 0; e.vy = 0; return; }
    const pull = clamp((h.x - e.x) * 2, -BEHAVIOUR.yeti.tugSpeed, BEHAVIOUR.yeti.tugSpeed);
    // The limit creeps forward, so holding on slows a yeti but cannot stop it for good.
    e.tugLimit -= this.ctx.speedOf(e) * 0.5 * DT;
    e.x = Math.max(WORLD.gateX + ENEMIES.yeti.range, Math.min(e.tugLimit, e.x + pull * DT));
  }
}
