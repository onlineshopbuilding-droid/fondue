import { BEHAVIOUR, ENEMIES, type EnemyType } from '../config/enemies';
import { DAY, DIFFICULTIES } from '../config/waves';
import { DT, WORLD } from '../config/world';
import { ECONOMY, GATE_HP, SHOP_ITEMS, STARTING_ITEMS, WEAPONS, WEAPON_SLOTS, type WeaponSlot } from '../config/shop';
import { Rng } from './rng';
import { buildDayPlan, newTypesOnDay } from './spawn';
import type {
  Command, DeathCause, Enemy, Hand, Projectile, ProjectileKind, SimEvent, SimOptions, SimState,
} from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function newHand(): Hand {
  return { x: 640, y: 300, down: false, mode: 'none', holding: -1, holdingProj: -1, pressX: 0, pressY: 0, pressTick: 0, modePress: false, connected: true };
}

/**
 * The whole game rules. No rendering, no timers, no Math.random: given the same seed and the same
 * commands it produces the same result, which is what makes it testable and able to run headless.
 */
export class Sim {
  readonly s: SimState;
  private rng: Rng;
  private events: SimEvent[] = [];

  constructor(opts: SimOptions) {
    const n = opts.names.length;
    this.rng = new Rng(opts.seed);
    const zero = () => ({ wheel: 0, stomper: 0, comet: 0, horn: 0, bolter: 0 });
    this.s = {
      tick: 0, phase: 'banner', phaseT: 0, day: 0, dayT: 0, gold: 0, offerings: 0,
      gateHp: 0, gateMax: 0, enemies: [], projectiles: [], flames: [],
      hands: Array.from({ length: n }, newHand),
      cooldowns: zero(), cooldownMax: zero(),
      spawnQueue: [], spawned: 0, perchBusy: 0, nextId: 1, rngState: opts.seed,
      dayKills: 0, dayGold: 0, dayOfferings: 0, dayScore: 0, paused: false, seenTypes: [],
      meta: {
        rev: 1, difficulty: opts.difficulty, owned: [...STARTING_ITEMS], hornEquipped: null,
        names: opts.names, ready: new Array(n).fill(false), lastDay: null, totalScore: 0, totalKills: 0,
        newTipTypes: [], pausedBy: null, tuning: { ...opts.tuning },
      },
    };
    this.startDay(1);
  }

  get tuning() { return this.s.meta.tuning; }

  private touchMeta() { this.s.meta.rev++; }

  /** Replaces the tuning values (host panel). */
  setTuning(t: SimState['meta']['tuning']) { this.s.meta.tuning = { ...t }; this.touchMeta(); }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(ev: SimEvent) { this.events.push(ev); }

  owns(id: string): boolean { return this.s.meta.owned.includes(id); }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  setHand(p: number, x: number, y: number) {
    const h = this.s.hands[p];
    if (h) { h.x = x; h.y = y; }
  }

  setConnected(p: number, connected: boolean) {
    const h = this.s.hands[p];
    if (!h) return;
    h.connected = connected;
    if (!connected) {
      this.dropHeld(p);
      h.down = false;
      h.mode = 'none';
    }
    this.touchMeta();
  }

  command(c: Command) {
    switch (c.k) {
      case 'press': this.press(c.p, c.x, c.y); break;
      case 'release': this.release(c.p, c.x, c.y, c.vx, c.vy); break;
      case 'activate': this.activate(c.p, c.slot); break;
      case 'cancelMode': this.cancelMode(c.p); break;
      case 'buy': this.buy(c.p, c.item); break;
      case 'equip': this.equip(c.item); break;
      case 'ready': this.setReady(c.p, c.ready); break;
      case 'forceStart': if (c.p === 0 && this.s.phase === 'intermission') this.startDay(this.s.day + 1); break;
      case 'pause': this.setPaused(c.p, c.paused); break;
    }
  }

  private setPaused(p: number, paused: boolean) {
    const s = this.s;
    if (s.phase === 'gameover' || s.phase === 'intermission') return;
    s.paused = paused;
    s.meta.pausedBy = paused ? (s.meta.names[p] ?? 'Someone') : null;
    if (!paused) this.dropReleasedDuringPause();
    this.touchMeta();
  }

  /** A button let go during a pause must not count as a throw; the enemy just drops afterwards. */
  private dropReleasedDuringPause() {
    this.s.hands.forEach((h, p) => {
      if (!h.down && (h.holding >= 0 || h.holdingProj >= 0)) this.dropHeld(p);
    });
  }

  /** Pause caused by a lost connection rather than a player. */
  pauseForDisconnect(reason: string) {
    if (this.s.phase === 'gameover' || this.s.phase === 'intermission') return;
    this.s.paused = true;
    this.s.meta.pausedBy = reason;
    this.touchMeta();
  }

  private press(p: number, x: number, y: number) {
    const s = this.s;
    const h = s.hands[p];
    if (!h) return;
    h.x = x; h.y = y; h.down = true;
    h.pressX = x; h.pressY = y; h.pressTick = s.tick;
    if (s.phase !== 'battle' || s.paused) return;
    h.modePress = h.mode !== 'none';
    if (h.mode === 'horn' || h.mode === 'stomper') return;
    if (h.mode === 'comet') {
      const c = s.projectiles.find((q) => q.id === h.holdingProj);
      if (c) c.charge = 0;
      return;
    }
    if (this.tryGrabBomb(p, x, y)) return;
    this.tryGrabEnemy(p, x, y);
  }

  private tryGrabBomb(p: number, x: number, y: number): boolean {
    const h = this.s.hands[p];
    let best: Projectile | null = null;
    let bestD = 44 + this.tuning.grabRadius * 0.5;
    for (const q of this.s.projectiles) {
      if (q.kind !== 'bomb' || q.heldBy >= 0) continue;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bestD) { bestD = d; best = q; }
    }
    if (!best) return false;
    best.heldBy = p;
    h.holdingProj = best.id;
    return true;
  }

  private grabDistance(e: Enemy, x: number, y: number): number {
    const def = ENEMIES[e.type];
    const halfW = def.radius;
    const top = e.y - (e.crow ? 40 : def.height);
    const dx = Math.max(0, Math.abs(x - e.x) - halfW);
    const dy = y < top ? top - y : y > e.y ? y - e.y : 0;
    return Math.hypot(dx, dy);
  }

  private tryGrabEnemy(p: number, x: number, y: number) {
    const s = this.s;
    const h = s.hands[p];
    const pad = this.tuning.grabRadius;
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of s.enemies) {
      if (e.dead || e.hidden || e.st === 'hooked' || e.st === 'flee') continue;
      if (e.heldBy.length > 0 && !(e.type === 'yeti' && !e.heldBy.includes(p))) continue;
      const d = this.grabDistance(e, x, y);
      if (d > pad) continue;
      // Prefer the enemy the pointer is actually inside, then the closest centre.
      const score = d + Math.abs(x - e.x) * 0.02;
      if (score < bestD) { bestD = score; best = e; }
    }
    if (!best) return;
    const e = best;
    if (e.shieldOn) { this.emit({ e: 'shieldBlock', x: e.x, y: e.y - 40 }); return; }
    if (!ENEMIES[e.type].grabbable) {
      this.emit({ e: 'tapCart', x, y, hp: e.hp });
      this.hurt(e, e.maxHp / BEHAVIOUR.siegeCartTaps, 'tap', p);
      return;
    }
    e.heldBy.push(p);
    e.frozenHeld = e.st === 'frozen';
    e.grabOffX = clamp(e.x - x, -ENEMIES[e.type].radius, ENEMIES[e.type].radius);
    e.grabOffY = clamp(e.y - y, 0, ENEMIES[e.type].height);
    if (e.type === 'yeti') {
      e.grabOffX = 0; e.grabOffY = ENEMIES.yeti.height * 0.5;
      if (e.heldBy.length === 1) e.tugLimit = e.x + BEHAVIOUR.yeti.tugReach;
      if (e.heldBy.length === 2) { e.st = 'held'; e.vx = 0; e.vy = 0; }
    } else {
      e.st = 'held';
      e.vx = 0; e.vy = 0;
    }
    h.holding = e.id;
    this.emit({ e: 'grab', id: e.id, p, x: e.x, y: e.y, etype: e.type });
  }

  private release(p: number, x: number, y: number, vx: number, vy: number) {
    const s = this.s;
    const h = s.hands[p];
    if (!h) return;
    h.x = x; h.y = y; h.down = false;

    if (s.phase !== 'battle') { this.dropHeld(p); return; }
    if (s.paused) return;
    // This press began before the weapon was picked, so letting go is not an aimed shot.
    if (h.mode !== 'none' && !h.modePress) return;

    if (h.mode === 'horn') { this.fireHorn(p, x, y); return; }
    if (h.mode === 'stomper') { this.fireStomper(p, x, vy); return; }

    if (h.holdingProj >= 0) {
      const q = s.projectiles.find((o) => o.id === h.holdingProj);
      h.holdingProj = -1;
      if (q) {
        q.heldBy = -1;
        const v = this.clampThrow(vx, vy);
        q.vx = v.vx; q.vy = v.vy; q.x = x; q.y = y;
        q.landed = false;
        if (q.kind === 'comet') { h.mode = 'none'; this.launchComet(q); }
      }
      return;
    }

    const e = s.enemies.find((o) => o.id === h.holding);
    h.holding = -1;
    if (!e || e.dead) return;

    const held = (s.tick - h.pressTick) * DT;
    const moved = Math.hypot(x - h.pressX, y - h.pressY);
    const isTap = held <= BEHAVIOUR.tapMaxSeconds && moved <= BEHAVIOUR.tapMaxMove;

    if (e.type === 'yeti') {
      const wasLifted = e.heldBy.length === 2;
      e.heldBy = [];
      for (const other of s.hands) if (other.holding === e.id) other.holding = -1;
      if (wasLifted) this.throwEnemy(e, vx, vy, p);
      return;
    }

    e.heldBy = [];
    if (isTap && e.st === 'held') {
      if (e.frozenHeld) { this.shatter(e, p); return; }
      if (e.type === 'bomber' && e.armed) {
        e.armed = false;
        e.kegFuse = BEHAVIOUR.kegDropFuse;
        e.st = 'walk';
        e.y = this.groundOf(e);
        this.emit({ e: 'kegDrop', x: e.x, y: e.y });
        return;
      }
    }

    e.x = clamp(x + e.grabOffX, WORLD.gateX + 10, WORLD.rightWallX - 10);
    e.y = Math.min(y + e.grabOffY, this.groundOf(e));
    if (this.tryPerch(e)) return;
    this.throwEnemy(e, vx, vy, p);
    this.liftFlatThrow(e);
    this.applyCauldronAssist(e);
  }

  private clampThrow(vx: number, vy: number) {
    const m = this.tuning.throwMult;
    let ax = vx * m;
    let ay = vy * m;
    const sp = Math.hypot(ax, ay);
    if (sp > this.tuning.maxThrow) {
      ax *= this.tuning.maxThrow / sp;
      ay *= this.tuning.maxThrow / sp;
    }
    return { vx: ax, vy: ay };
  }

  private throwEnemy(e: Enemy, vx: number, vy: number, p: number) {
    const v = this.clampThrow(vx, vy);
    e.vx = v.vx; e.vy = v.vy;
    e.st = 'air';
    e.thrownBy = p;
    e.rotV = clamp(v.vx / 110, -14, 14) + (Math.abs(v.vy) / 240) * (v.vx >= 0 ? 1 : -1);
    if (Math.abs(e.rotV) < 1) e.rotV = this.rng.range(-3, 3);
    this.emit({ e: 'release', id: e.id, p, speed: Math.hypot(v.vx, v.vy), x: e.x, y: e.y });
  }

  /** A sideways fling from road height would land in its first tick; give it a low arc instead. */
  private liftFlatThrow(e: Enemy) {
    const speed = Math.abs(e.vx);
    if (this.groundOf(e) - e.y >= 20 || speed <= 250 || e.vy > speed * 0.5 || e.vy < -speed * 0.25) return;
    e.y = this.groundOf(e) - 22;
    e.vy = -speed * 0.25;
  }

  private tryPerch(e: Enemy): boolean {
    const s = this.s;
    if (!this.owns('perch') || s.perchBusy > 0) return false;
    const { x, hookY, snapRadius } = WORLD.perch;
    if (Math.hypot(e.x - x, e.y - hookY - ENEMIES[e.type].height * 0.3) > snapRadius) return false;
    if (e.type === 'siegeCart' || e.type === 'yeti') return false;
    e.st = 'hooked';
    e.x = x;
    e.y = hookY + ENEMIES[e.type].height * 0.7;
    e.vx = 0; e.vy = 0;
    e.rot = 0;
    e.t = 2.0;
    s.perchBusy = 2.3;
    return true;
  }

  /** Gentle steering so that a release close to the cauldron actually lands in it. */
  private applyCauldronAssist(e: Enemy) {
    if (!this.owns('cauldron') || e.st !== 'air') return;
    const { x: cx, halfWidth } = WORLD.cauldron;
    const g = this.tuning.gravity;
    const ground = this.groundOf(e);
    const disc = e.vy * e.vy + 2 * g * Math.max(0, ground - e.y);
    const tLand = (-e.vy + Math.sqrt(disc)) / g;
    if (tLand <= 0.02) return;
    const landX = e.x + e.vx * tLand;
    if (Math.abs(landX - cx) > halfWidth + 95 || Math.abs(landX - cx) < halfWidth * 0.6) return;
    const wanted = (cx - e.x) / tLand;
    e.vx += clamp(wanted - e.vx, -280, 280);
  }

  private dropHeld(p: number) {
    const s = this.s;
    const h = s.hands[p];
    if (!h) return;
    const e = s.enemies.find((o) => o.id === h.holding);
    if (e) {
      e.heldBy = e.heldBy.filter((q) => q !== p);
      if (e.type === 'yeti' && e.st === 'held') {
        for (const q of e.heldBy) s.hands[q].holding = -1;
        e.heldBy = [];
      }
      if (e.st === 'held' && e.heldBy.length === 0) { e.st = 'air'; e.vx = 0; e.vy = 0; }
    }
    h.holding = -1;
    const q = s.projectiles.find((o) => o.id === h.holdingProj);
    if (q) {
      if (q.kind === 'comet') q.t = -1;
      q.heldBy = -1;
    }
    h.holdingProj = -1;
    h.mode = 'none';
  }

  private cancelMode(p: number) {
    const h = this.s.hands[p];
    if (!h || h.mode === 'none') return;
    if (h.mode === 'comet') {
      this.s.projectiles = this.s.projectiles.filter((q) => q.id !== h.holdingProj);
      h.holdingProj = -1;
    }
    h.mode = 'none';
  }

  // ---------------------------------------------------------------------------
  // Weapons
  // ---------------------------------------------------------------------------

  /** Highest owned item of a slot, or null. */
  tierOf(slot: WeaponSlot): string | null {
    const ids: Record<WeaponSlot, string[]> = {
      wheel: ['wheel3', 'wheel2', 'wheel1'],
      stomper: ['stomper3', 'stomper2', 'stomper1'],
      comet: ['comet3', 'comet2', 'comet1'],
      horn: [],
      bolter: ['bolter3', 'bolter2', 'bolter1'],
    };
    if (slot === 'horn') return this.s.meta.hornEquipped;
    return ids[slot].find((i) => this.owns(i)) ?? null;
  }

  private startCooldown(slot: WeaponSlot, seconds: number) {
    this.s.cooldowns[slot] = seconds;
    this.s.cooldownMax[slot] = seconds;
  }

  private activate(p: number, slot: WeaponSlot) {
    const s = this.s;
    const h = s.hands[p];
    if (!h || s.phase !== 'battle' || s.paused) return;
    const tier = this.tierOf(slot);
    const modeOf: Partial<Record<WeaponSlot, Hand['mode']>> = { stomper: 'stomper', comet: 'comet', horn: 'horn' };
    if (modeOf[slot] && h.mode === modeOf[slot]) { this.cancelMode(p); return; }
    if (!tier || s.cooldowns[slot] > 0) { this.emit({ e: 'denied', p }); return; }
    if (h.holding >= 0 || h.holdingProj >= 0) this.dropHeld(p);
    if (h.mode !== 'none') this.cancelMode(p);
    h.modePress = false;

    switch (slot) {
      case 'wheel': {
        const w = WEAPONS.wheel[tier as keyof typeof WEAPONS.wheel];
        const q = this.spawnProjectile('wheel', WORLD.gateX + 30, WORLD.groundY + 22 - w.radius, w.speed, 0);
        q.size = w.radius; q.damage = w.damage; q.pierce = true;
        this.startCooldown(slot, w.cooldown);
        this.emit({ e: 'wheel', size: w.radius });
        break;
      }
      case 'stomper':
        h.mode = 'stomper';
        break;
      case 'comet': {
        const q = this.spawnProjectile('comet', h.x, h.y, 0, 0);
        const w = WEAPONS.comet[tier as 'comet1'];
        q.size = w.radius; q.damage = w.damage; q.heldBy = p;
        h.holdingProj = q.id;
        h.mode = 'comet';
        break;
      }
      case 'horn':
        h.mode = 'horn';
        break;
      case 'bolter': {
        const w = WEAPONS.bolter[tier as keyof typeof WEAPONS.bolter];
        const targets = s.enemies
          .filter((e) => !e.dead && !e.hidden && e.st !== 'held' && e.st !== 'hooked')
          .sort((a, b) => a.x - b.x)
          .slice(0, w.bolts);
        if (targets.length === 0) { this.emit({ e: 'denied', p }); return; }
        for (let i = 0; i < w.bolts; i++) {
          const t = targets[i % targets.length];
          const aimY = t.y - ENEMIES[t.type].height * 0.5;
          const dx = t.x - WORLD.roof.x;
          const dy = aimY - WORLD.roof.y;
          const d = Math.hypot(dx, dy) || 1;
          const speed = 1250;
          const q = this.spawnProjectile('roofBolt', WORLD.roof.x + i * 3, WORLD.roof.y, (dx / d) * speed, (dy / d) * speed);
          q.damage = w.damage; q.pierce = w.pierce; q.size = 8;
        }
        this.startCooldown(slot, w.cooldown);
        this.emit({ e: 'bolters' });
        break;
      }
    }
  }

  private fireHorn(p: number, x: number, y: number) {
    const s = this.s;
    const h = s.hands[p];
    h.mode = 'none';
    const id = s.meta.hornEquipped;
    if (!id || s.cooldowns.horn > 0) { this.emit({ e: 'denied', p }); return; }
    const w = WEAPONS.horn[id as keyof typeof WEAPONS.horn];
    this.startCooldown('horn', w.cooldown);
    if (w.kind === 'blast') {
      this.emit({ e: 'mortar', x, y });
      this.blast(x, y, w.radius, w.damage, p);
    } else if (w.kind === 'freeze') {
      this.emit({ e: 'freeze', x, y, radius: w.radius });
      for (const e of s.enemies) {
        if (e.dead || e.st === 'held' || e.st === 'hooked' || e.st === 'flee') continue;
        if (e.type === 'siegeCart' || e.crow) continue;
        if (Math.hypot(e.x - x, e.y - ENEMIES[e.type].height * 0.5 - y) > w.radius + ENEMIES[e.type].radius) continue;
        this.freeze(e, p);
      }
    } else {
      this.emit({ e: 'bellows', x, halfWidth: w.halfWidth });
      this.addFlame(x, w.halfWidth, w.flameSeconds);
    }
  }

  private freeze(e: Enemy, p: number) {
    if (e.st === 'float') {
      // Whatever kept it in the air is ice now: it drops and shatters.
      e.st = 'air';
      e.frozenHeld = true;
      e.vx = 0; e.vy = 0;
      e.thrownBy = p;
      return;
    }
    e.st = 'frozen';
    e.t = BEHAVIOUR.frozen.seconds;
    e.vx = 0; e.vy = 0;
    e.y = this.groundOf(e);
    e.shieldOn = false;
    e.hidden = false;
  }

  private shatter(e: Enemy, p: number) {
    this.emit({ e: 'shatter', x: e.x, y: e.y - 30 });
    this.kill(e, 'shatter', p);
  }

  private fireStomper(p: number, x: number, vy: number) {
    const s = this.s;
    const h = s.hands[p];
    h.mode = 'none';
    const tier = this.tierOf('stomper');
    if (!tier || s.cooldowns.stomper > 0) { this.emit({ e: 'denied', p }); return; }
    const w = WEAPONS.stomper[tier as keyof typeof WEAPONS.stomper];
    this.startCooldown('stomper', w.cooldown);
    const q = this.spawnProjectile('slab', clamp(x, WORLD.gateX + w.halfWidth * 0.3, WORLD.width), -180, 0, Math.max(2200, vy));
    q.size = w.halfWidth; q.damage = w.damage; q.heldBy = -1;
  }

  private launchComet(q: Projectile) {
    const tier = this.tierOf('comet');
    if (!tier) return;
    const w = WEAPONS.comet[tier as 'comet1'];
    const bonus = clamp(q.charge / WEAPONS.comet.fullChargePath, 0, 1) * WEAPONS.comet.maxChargeBonus;
    q.size = w.radius * (1 + bonus);
    q.damage = w.damage * (1 + bonus);
    q.t = 0;
    q.landed = false;
    this.startCooldown('comet', w.cooldown);
    this.emit({ e: 'shoot', x: q.x, y: q.y, kind: 'comet' });
  }

  private spawnProjectile(kind: ProjectileKind, x: number, y: number, vx: number, vy: number): Projectile {
    const q: Projectile = {
      id: this.s.nextId++, kind, x, y, vx, vy, rot: 0, t: 0, size: 10, damage: 0,
      heldBy: -1, charge: 0, pierce: false, hit: [], landed: false,
    };
    this.s.projectiles.push(q);
    return q;
  }

  private addFlame(x: number, halfWidth: number, dur: number) {
    this.s.flames.push({ id: this.s.nextId++, x, halfWidth, t: dur, dur });
    this.emit({ e: 'flame', x, halfWidth });
  }

  /** Area damage. p is the responsible player for score; -1 for none. */
  private blast(x: number, y: number, radius: number, damage: number, p: number) {
    this.emit({ e: 'explosion', x, y, radius });
    for (const e of [...this.s.enemies]) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - ENEMIES[e.type].height * 0.5 - y);
      if (d <= radius + ENEMIES[e.type].radius) this.hurt(e, damage, 'blast', p);
    }
  }

  private hurt(e: Enemy, amount: number, cause: DeathCause, p: number) {
    if (e.dead) return;
    e.hp -= amount;
    if (e.hp <= 1e-6) this.kill(e, cause, p);
  }

  private kill(e: Enemy, cause: DeathCause, p: number) {
    if (e.dead) return;
    const s = this.s;
    e.dead = true;
    for (const q of e.heldBy) if (s.hands[q]) s.hands[q].holding = -1;
    e.heldBy = [];
    const def = ENEMIES[e.type];
    const diff = DIFFICULTIES[s.meta.difficulty];
    let gold = Math.round(def.gold * diff.gold);
    const score = Math.round(def.score * (1 + (s.day - 1) * 0.1));
    if (cause === 'cauldron' || cause === 'eagle') {
      gold += ECONOMY.offeringGold;
      s.offerings += 1;
      s.dayOfferings += 1;
    }
    s.gold += gold;
    s.dayGold += gold;
    s.dayKills += 1;
    s.dayScore += score;
    this.emit({ e: 'death', id: e.id, x: e.x, y: e.y, etype: e.type, cause, gold, p });
    if (e.type === 'bomber' && e.armed && (cause === 'impact' || cause === 'blast')) {
      const b = BEHAVIOUR.bomb;
      this.blast(e.x, e.y - 40, b.blastRadius, b.blastDamage, p);
    }
  }

  private damageGate(amount: number, x: number, y: number, etype: EnemyType) {
    const s = this.s;
    if (s.gateHp <= 0) return;
    const scaled = amount * DIFFICULTIES[s.meta.difficulty].damage * (1 + (s.day - 1) * DAY.damageGrowth);
    s.gateHp = Math.max(0, s.gateHp - scaled);
    this.emit({ e: 'gateHit', x, y, amount: scaled, etype });
  }

  // ---------------------------------------------------------------------------
  // Shop and flow
  // ---------------------------------------------------------------------------

  canBuy(id: string): boolean {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || this.owns(id)) return false;
    if (item.requires && !this.owns(item.requires)) return false;
    return this.s.gold >= item.gold && this.s.offerings >= item.offerings;
  }

  private buy(p: number, id: string) {
    const s = this.s;
    if (s.phase !== 'intermission') return;
    if (!this.canBuy(id)) { this.emit({ e: 'denied', p }); return; }
    const item = SHOP_ITEMS.find((i) => i.id === id)!;
    s.gold -= item.gold;
    s.offerings -= item.offerings;
    s.meta.owned.push(id);
    if (item.tab === 'horns') s.meta.hornEquipped = id;
    if (item.tab === 'gates') {
      s.gateMax = GATE_HP[id];
      s.gateHp = s.gateMax;
    }
    this.touchMeta();
    this.emit({ e: 'buy', p, item: id, name: item.name });
  }

  private equip(id: string) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || item.tab !== 'horns' || !this.owns(id)) return;
    this.s.meta.hornEquipped = id;
    this.touchMeta();
  }

  private setReady(p: number, ready: boolean) {
    const s = this.s;
    if (s.phase !== 'intermission') return;
    s.meta.ready[p] = ready;
    this.touchMeta();
    const everyone = s.hands.every((h, i) => !h.connected || s.meta.ready[i]);
    if (everyone) this.startDay(s.day + 1);
  }

  private currentGateId(): string {
    return ['gate4', 'gate3', 'gate2', 'gate1', 'gate0'].find((g) => this.owns(g)) ?? 'gate0';
  }

  private startDay(day: number) {
    const s = this.s;
    s.day = day;
    s.dayT = 0;
    s.phase = 'banner';
    s.phaseT = DAY.bannerSeconds;
    s.gateMax = GATE_HP[this.currentGateId()];
    s.gateHp = day === 1 ? s.gateMax : Math.min(s.gateMax, s.gateHp + s.gateMax * ECONOMY.gateRefill);
    s.enemies = [];
    s.projectiles = [];
    s.flames = [];
    s.perchBusy = 0;
    s.dayKills = 0; s.dayGold = 0; s.dayOfferings = 0; s.dayScore = 0;
    for (const slot of WEAPON_SLOTS) { s.cooldowns[slot] = 0; s.cooldownMax[slot] = 0; }
    for (const h of s.hands) { h.mode = 'none'; h.holding = -1; h.holdingProj = -1; }
    s.spawned = 0;
    s.spawnQueue = buildDayPlan(day, s.meta.difficulty, s.meta.names.length, this.tuning.spawnRate, this.rng);
    s.meta.ready = s.meta.ready.map(() => false);
    s.meta.newTipTypes = newTypesOnDay(day).filter((t) => !s.seenTypes.includes(t));
    s.seenTypes.push(...s.meta.newTipTypes);
    this.touchMeta();
    this.emit({ e: 'dayStart', day });
  }

  private endDay(win: boolean) {
    const s = this.s;
    const gatePct = s.gateMax > 0 ? Math.round((100 * s.gateHp) / s.gateMax) : 0;
    const bonus = win ? Math.round(s.dayScore * (gatePct / 400)) : 0;
    s.dayScore += bonus;
    s.meta.totalScore += s.dayScore;
    s.meta.totalKills += s.dayKills;
    s.meta.lastDay = {
      day: s.day, kills: s.dayKills, goldEarned: s.dayGold, offeringsEarned: s.dayOfferings, score: s.dayScore, gatePct,
    };
    this.touchMeta();
  }

  // ---------------------------------------------------------------------------
  // Step
  // ---------------------------------------------------------------------------

  step() {
    const s = this.s;
    if (s.paused) return;
    s.tick++;
    switch (s.phase) {
      case 'banner':
        s.phaseT -= DT;
        if (s.phaseT <= 0) s.phase = 'battle';
        break;
      case 'battle':
        s.dayT += DT;
        this.tickCooldowns();
        this.spawn();
        this.updateWorld();
        if (s.gateHp <= 0) {
          s.phase = 'defeat';
          s.phaseT = DAY.endBannerSeconds + 0.8;
          for (let p = 0; p < s.hands.length; p++) this.dropHeld(p);
          this.emit({ e: 'defeat' });
        } else if (s.dayT >= DAY.seconds) {
          s.phase = 'victory';
          s.phaseT = DAY.endBannerSeconds;
          for (let p = 0; p < s.hands.length; p++) this.dropHeld(p);
          for (const e of s.enemies) this.makeFlee(e);
          this.emit({ e: 'victory' });
        }
        break;
      case 'victory':
        this.updateWorld();
        s.phaseT -= DT;
        if (s.phaseT <= 0) { this.endDay(true); s.phase = 'intermission'; this.touchMeta(); }
        break;
      case 'defeat':
        this.updateWorld();
        s.phaseT -= DT;
        if (s.phaseT <= 0) { this.endDay(false); s.phase = 'gameover'; this.touchMeta(); }
        break;
      case 'intermission':
      case 'gameover':
        break;
    }
    s.rngState = this.rng.state;
  }

  private tickCooldowns() {
    const s = this.s;
    for (const slot of WEAPON_SLOTS) {
      if (s.cooldowns[slot] > 0) {
        s.cooldowns[slot] -= DT;
        if (s.cooldowns[slot] <= 0) {
          s.cooldowns[slot] = 0;
          this.emit({ e: 'weaponReady', slot });
        }
      }
    }
    if (s.perchBusy > 0) s.perchBusy -= DT;
  }

  private spawn() {
    const s = this.s;
    let alive = s.enemies.length;
    while (s.spawned < s.spawnQueue.length && s.spawnQueue[s.spawned].t <= s.dayT && alive < DAY.maxAlive) {
      this.spawnEnemy(s.spawnQueue[s.spawned].type);
      s.spawned++;
      alive++;
    }
  }

  spawnEnemy(type: EnemyType, x = WORLD.spawnX + this.rng.range(0, 30)): Enemy {
    const s = this.s;
    const def = ENEMIES[type];
    const lane = this.rng.range(WORLD.laneMin, WORLD.laneMax);
    const hp = def.hp * (1 + (s.day - 1) * DAY.hpGrowth);
    const e: Enemy = {
      id: s.nextId++, type, st: 'walk', x, y: WORLD.groundY + lane, vx: 0, vy: 0, rot: 0, rotV: 0, lane,
      hp, maxHp: hp, tugLimit: 0, t: 0, strikeT: def.strikeEvery * this.rng.range(0.3, 1), heldBy: [], grabOffX: 0, grabOffY: 0,
      shieldOn: false, cycleT: this.rng.range(0.3, 2.5), hidden: false, armed: type === 'bomber', crow: false,
      kegFuse: 0, altitude: 0, thrownBy: -1, dead: false, frozenHeld: false,
    };
    if (type === 'balloonist') {
      e.st = 'float';
      e.altitude = this.rng.range(BEHAVIOUR.balloon.altitudeMin, BEHAVIOUR.balloon.altitudeMax);
      e.y = this.groundOf(e) - e.altitude;
      e.strikeT = BEHAVIOUR.balloon.dropEvery;
    }
    if (type === 'pogo') {
      e.st = 'hop';
      e.vy = -this.rng.range(0.8, 1.05) * BEHAVIOUR.pogo.hopSpeed;
    }
    s.enemies.push(e);
    return e;
  }

  private groundOf(e: Enemy): number { return WORLD.groundY + e.lane; }

  private speedOf(e: Enemy): number {
    const s = this.s;
    return ENEMIES[e.type].speed * this.tuning.walkSpeed * DIFFICULTIES[s.meta.difficulty].speed * (1 + (s.day - 1) * DAY.speedGrowth);
  }

  private makeFlee(e: Enemy) {
    if (e.dead) return;
    e.shieldOn = false;
    e.hidden = false;
    e.kegFuse = 0;
    if (e.st === 'air' || e.st === 'hooked' || e.st === 'held') return;
    e.st = 'flee';
    if (!e.crow && e.type !== 'balloonist') e.y = this.groundOf(e);
  }

  private updateWorld() {
    const s = this.s;
    const list = s.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.dead) this.updateEnemy(e);
    }
    this.updateProjectiles();
    this.updateFlames();
    s.enemies = s.enemies.filter((e) => !e.dead && !(e.st === 'flee' && e.x > WORLD.spawnX + 40));
    s.projectiles = s.projectiles.filter((q) => q.t >= 0);
  }

  private updateCycles(e: Enemy) {
    if (e.type !== 'hexer' && e.type !== 'shade') return;
    e.cycleT -= DT;
    if (e.cycleT > 0) return;
    if (e.type === 'hexer') {
      e.shieldOn = !e.shieldOn;
      e.cycleT = e.shieldOn ? BEHAVIOUR.hexerShield.on : BEHAVIOUR.hexerShield.off;
      if (e.shieldOn) this.emit({ e: 'shieldUp', x: e.x, y: e.y - 40 });
    } else {
      e.hidden = !e.hidden;
      e.cycleT = e.hidden ? BEHAVIOUR.shade.hidden : BEHAVIOUR.shade.visible;
    }
  }

  private updateEnemy(e: Enemy) {
    if (e.kegFuse > 0) {
      e.kegFuse -= DT;
      if (e.kegFuse <= 0) {
        e.kegFuse = 0;
        const b = BEHAVIOUR.bomb;
        this.kill(e, 'blast', e.thrownBy);
        this.blast(e.x, e.y - 30, b.blastRadius, b.blastDamage, e.thrownBy);
        return;
      }
    }
    switch (e.st) {
      case 'walk': this.updateWalk(e); break;
      case 'attack': this.updateAttack(e); break;
      case 'hop': this.updateHop(e); break;
      case 'float': this.updateFloat(e); break;
      case 'held': this.updateHeld(e); break;
      case 'air': this.updateAir(e); break;
      case 'stun':
        e.t -= DT;
        this.updateCycles(e);
        if (e.t <= 0) this.afterStun(e);
        break;
      case 'frozen':
        e.t -= DT;
        if (e.t <= 0) this.afterStun(e);
        break;
      case 'hooked':
        this.updateHooked(e);
        break;
      case 'flee':
        e.x += this.speedOf(e) * 1.9 * DT;
        break;
    }
    if (e.type === 'yeti' && e.heldBy.length === 1 && e.st !== 'held') this.updateTug(e);
  }

  private afterStun(e: Enemy) {
    e.rot = 0;
    e.t = 0;
    e.frozenHeld = false;
    e.y = this.groundOf(e);
    if (e.type === 'pogo') { e.st = 'hop'; e.vy = -BEHAVIOUR.pogo.hopSpeed; return; }
    if (e.crow) { e.st = 'float'; return; }
    e.st = 'walk';
  }

  private updateWalk(e: Enemy) {
    this.updateCycles(e);
    const def = ENEMIES[e.type];
    let v = this.speedOf(e);
    if (e.type === 'yeti' && e.heldBy.length > 0) v *= BEHAVIOUR.yeti.slowWhileHeld;
    e.x -= v * DT;
    const range = e.armed || e.type !== 'bomber' ? def.range : 24;
    if (e.x <= WORLD.gateX + range) {
      e.x = WORLD.gateX + range;
      e.st = 'attack';
    }
  }

  private updateAttack(e: Enemy) {
    this.updateCycles(e);
    e.strikeT -= DT;
    if (e.strikeT > 0) return;
    const def = ENEMIES[e.type];
    e.strikeT = def.strikeEvery;
    const gx = WORLD.gateX + 6;
    const gy = e.y - 50;
    switch (e.type) {
      case 'bomber':
        if (e.armed) { this.lobBomb(e); return; }
        break;
      case 'slinger': {
        this.lob('stone', e, def.strike, 0.85);
        return;
      }
      case 'siegeCart': {
        const q = this.spawnProjectile('bolt', e.x - 40, e.y - 58, -760, 0);
        q.damage = def.strike;
        this.emit({ e: 'shoot', x: q.x, y: q.y, kind: 'bolt' });
        return;
      }
    }
    this.emit({ e: 'strike', x: e.x, y: e.y, etype: e.type });
    this.damageGate(e.crow ? 6 : def.strike, gx, gy, e.type);
  }

  private lobBomb(e: Enemy) {
    const q = this.lob('bomb', e, BEHAVIOUR.bomb.gateDamage, 1.05);
    q.t = BEHAVIOUR.bomb.fuse;
    this.emit({ e: 'throwKeg', x: q.x, y: q.y });
  }

  /** Throws a ballistic projectile that lands at the gate after `flight` seconds. */
  private lob(kind: ProjectileKind, e: Enemy, damage: number, flight: number): Projectile {
    const g = this.tuning.gravity;
    const sx = e.x - 12;
    const sy = e.y - 70;
    const tx = WORLD.gateX + 8;
    const ty = e.y - 60;
    const q = this.spawnProjectile(kind, sx, sy, (tx - sx) / flight, (ty - sy - 0.5 * g * flight * flight) / flight);
    q.damage = damage;
    q.size = kind === 'bomb' ? 16 : 7;
    if (kind === 'stone') this.emit({ e: 'shoot', x: sx, y: sy, kind });
    return q;
  }

  private updateHop(e: Enemy) {
    const def = ENEMIES.pogo;
    e.vy += this.tuning.gravity * DT;
    e.y += e.vy * DT;
    e.x -= this.speedOf(e) * DT;
    e.rot = Math.sin(e.y * 0.02) * 0.12;
    const ground = this.groundOf(e);
    if (e.x <= WORLD.gateX + def.range + 34) e.x = WORLD.gateX + def.range + 34;
    if (e.y < ground || e.vy < 0) return;
    e.y = ground;
    if (e.x <= WORLD.gateX + def.range + 34) {
      this.emit({ e: 'strike', x: e.x, y: e.y, etype: e.type });
      this.damageGate(def.strike, WORLD.gateX + 6, e.y - 50, e.type);
    }
    e.vy = -BEHAVIOUR.pogo.hopSpeed * this.rng.range(0.85, 1.05);
  }

  private updateFloat(e: Enemy) {
    const s = this.s;
    if (e.crow) {
      const targetY = this.groundOf(e) - BEHAVIOUR.crow.altitude + Math.sin(s.tick * 0.14 + e.id) * 16;
      e.y += (targetY - e.y) * 0.08;
      const tx = WORLD.gateX + 26;
      if (e.x > tx) e.x -= BEHAVIOUR.crow.speed * DT;
      else this.strikeFloating(e, 1.0, 6);
      return;
    }
    const def = ENEMIES.balloonist;
    e.y = this.groundOf(e) - e.altitude + Math.sin(s.tick * 0.03 + e.id) * 10;
    if (e.x > WORLD.gateX + def.range) { e.x -= this.speedOf(e) * DT; return; }
    e.strikeT -= DT;
    if (e.strikeT <= 0) {
      e.strikeT = BEHAVIOUR.balloon.dropEvery;
      const q = this.spawnProjectile('bomb', e.x, e.y + 30, -30, 60);
      q.t = BEHAVIOUR.bomb.fuse + 2;
      q.size = 14;
      q.damage = def.strike;
      this.emit({ e: 'throwKeg', x: q.x, y: q.y });
    }
  }

  private strikeFloating(e: Enemy, every: number, dmg: number) {
    e.strikeT -= DT;
    if (e.strikeT > 0) return;
    e.strikeT = every;
    this.emit({ e: 'strike', x: e.x, y: e.y, etype: e.type });
    this.damageGate(dmg, WORLD.gateX + 6, e.y, e.type);
  }

  private updateHeld(e: Enemy) {
    const s = this.s;
    const hands = e.heldBy.map((p) => s.hands[p]);
    if (hands.length === 0) { e.st = 'air'; return; }
    let tx = 0;
    let ty = 0;
    for (const h of hands) { tx += h.x; ty += h.y; }
    tx = tx / hands.length + e.grabOffX;
    ty = ty / hands.length + e.grabOffY;
    const k = this.tuning.holdSpring;
    const c = 2 * Math.sqrt(k) * 0.72;
    e.vx += (k * (tx - e.x) - c * e.vx) * DT;
    e.vy += (k * (ty - e.y) - c * e.vy) * DT;
    e.x += e.vx * DT;
    e.y += e.vy * DT;
    e.x = clamp(e.x, WORLD.gateX + 10, WORLD.rightWallX - 10);
    const ground = this.groundOf(e);
    if (e.y > ground) { e.y = ground; e.vy = Math.min(0, e.vy); }
    e.rot += (clamp(e.vx / 900, -0.8, 0.8) - e.rot) * 0.2;
  }

  /** A single hand on a yeti can only drag it a little. */
  private updateTug(e: Enemy) {
    const s = this.s;
    const h = s.hands[e.heldBy[0]];
    if (!h) return;
    const pull = clamp((h.x - e.x) * 2, -BEHAVIOUR.yeti.tugSpeed, BEHAVIOUR.yeti.tugSpeed);
    // The limit creeps forward, so holding on slows a yeti but cannot stop it for good.
    e.tugLimit -= this.speedOf(e) * 0.5 * DT;
    e.x = Math.max(WORLD.gateX + ENEMIES.yeti.range, Math.min(e.tugLimit, e.x + pull * DT));
  }

  private updateAir(e: Enemy) {
    const def = ENEMIES[e.type];
    e.vy += this.tuning.gravity * DT;
    e.x += e.vx * DT;
    e.y += e.vy * DT;
    e.rot += e.rotV * DT;

    if (this.owns('cauldron') && e.vy > 0) {
      const { x, halfWidth } = WORLD.cauldron;
      if (Math.abs(e.x - x) < halfWidth && e.y >= this.groundOf(e) - 26 && e.type !== 'siegeCart') {
        this.emit({ e: 'splash', x, y: WORLD.groundY, etype: e.type });
        this.kill(e, 'cauldron', e.thrownBy);
        return;
      }
    }

    if (e.x < WORLD.gateX + def.radius * 0.5) {
      e.x = WORLD.gateX + def.radius * 0.5;
      const sp = Math.abs(e.vx);
      if (sp >= this.tuning.lethalImpact * 1.1) {
        this.landLethal(e, sp);
        return;
      }
      this.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed: sp, etype: e.type, lethal: false });
      e.vx = sp * 0.35;
    }
    if (e.x > WORLD.rightWallX) { e.x = WORLD.rightWallX; e.vx = -Math.abs(e.vx) * 0.4; }

    const ground = this.groundOf(e);
    if (e.y < ground) return;
    e.y = ground;
    const sp = Math.hypot(e.vy, e.vx * 0.4);
    if (e.frozenHeld) {
      this.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed: sp, etype: e.type, lethal: true });
      this.shatter(e, e.thrownBy);
      return;
    }
    const lethalAt = e.crow ? this.tuning.lethalImpact * 0.4 : this.tuning.lethalImpact;
    if (sp >= lethalAt) {
      this.landLethal(e, sp);
      return;
    }
    this.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed: sp, etype: e.type, lethal: false });
    e.vy = -e.vy * 0.3;
    e.vx *= 0.5;
    e.rotV *= 0.5;
    if (Math.abs(e.vy) < 130) {
      e.vy = 0; e.vx = 0; e.rot = 0; e.rotV = 0;
      e.st = 'stun';
      e.t = BEHAVIOUR.stunSeconds;
      e.y = ground;
    }
  }

  private landLethal(e: Enemy, speed: number) {
    this.emit({ e: 'impact', id: e.id, x: e.x, y: e.y, speed, etype: e.type, lethal: true });
    if (e.type === 'crowcaller' && !e.crow) {
      e.crow = true;
      e.st = 'float';
      e.y = this.groundOf(e) - 30;
      e.vx = 0; e.vy = 0; e.rot = 0; e.rotV = 0;
      this.emit({ e: 'crow', x: e.x, y: e.y });
      return;
    }
    if (this.tuning.knockOthers) this.knockAround(e, speed);
    this.kill(e, 'impact', e.thrownBy);
  }

  private knockAround(src: Enemy, speed: number) {
    for (const o of this.s.enemies) {
      if (o === src || o.dead || o.type === 'siegeCart' || o.type === 'yeti') continue;
      if (o.st !== 'walk' && o.st !== 'attack') continue;
      if (Math.abs(o.x - src.x) > 60) continue;
      o.st = 'air';
      o.vx = Math.sign(o.x - src.x || 1) * 120;
      o.vy = -clamp(speed * 0.3, 120, 300);
      o.rotV = this.rng.range(-6, 6);
    }
  }

  private updateHooked(e: Enemy) {
    const before = e.t;
    e.t -= DT;
    e.rot = Math.sin(e.t * 9) * 0.25;
    if (before > 0.7 && e.t <= 0.7) this.emit({ e: 'eagle', x: e.x, y: e.y, id: e.id });
    if (e.t <= 0) this.kill(e, 'eagle', e.thrownBy);
  }

  private isGrounded(e: Enemy): boolean {
    return e.st === 'walk' || e.st === 'attack' || e.st === 'stun' || e.st === 'frozen' || e.st === 'flee'
      || (e.st === 'hop' && e.y > this.groundOf(e) - 120);
  }

  private updateProjectiles() {
    const s = this.s;
    const g = this.tuning.gravity;
    const groundLine = WORLD.groundY + 22;
    for (const q of [...s.projectiles]) {
      switch (q.kind) {
        case 'bomb': this.updateBomb(q); break;
        case 'stone':
        case 'bolt':
          if (q.kind === 'stone') q.vy += g * DT;
          q.x += q.vx * DT;
          q.y += q.vy * DT;
          q.rot += 0.25;
          if (q.x <= WORLD.gateX + 8) {
            this.damageGate(q.damage, WORLD.gateX + 6, q.y, q.kind === 'stone' ? 'slinger' : 'siegeCart');
            q.t = -1;
          }
          break;
        case 'wheel':
          q.x += q.vx * DT;
          q.rot += (q.vx / q.size) * DT;
          for (const e of [...s.enemies]) {
            if (e.dead || q.hit.includes(e.id) || !this.isGrounded(e)) continue;
            if (Math.abs(e.x - q.x) > q.size + ENEMIES[e.type].radius * 0.6) continue;
            q.hit.push(e.id);
            this.hurt(e, q.damage, 'crush', -1);
          }
          if (q.x > WORLD.width + 140) q.t = -1;
          break;
        case 'slab':
          q.y += q.vy * DT;
          if (q.y >= groundLine - 30) {
            this.emit({ e: 'slam', x: q.x, y: groundLine, halfWidth: q.size });
            for (const e of [...s.enemies]) {
              if (e.dead || !this.isGrounded(e)) continue;
              if (Math.abs(e.x - q.x) <= q.size + ENEMIES[e.type].radius * 0.5) this.hurt(e, q.damage, 'crush', -1);
            }
            q.t = -1;
          }
          break;
        case 'comet':
          this.updateComet(q);
          break;
        case 'roofBolt':
          this.updateRoofBolt(q);
          break;
      }
    }
  }

  private updateBomb(q: Projectile) {
    const s = this.s;
    const b = BEHAVIOUR.bomb;
    q.t -= DT;
    const fused = q.t <= 0;
    if (q.heldBy >= 0) {
      const h = s.hands[q.heldBy];
      if (h) { q.x = h.x; q.y = h.y; }
    } else if (!q.landed) {
      q.vy += this.tuning.gravity * DT;
      q.x += q.vx * DT;
      q.y += q.vy * DT;
      q.rot += 0.2;
      const ground = WORLD.groundY + 20;
      if (q.x <= WORLD.gateX + 8) {
        this.explodeBomb(q);
        return;
      }
      if (q.y >= ground) {
        q.y = ground;
        if (q.x < WORLD.gateX + 70) { this.explodeBomb(q); return; }
        if (q.vy > 300) { q.vy = -q.vy * 0.25; q.vx *= 0.5; } else { q.landed = true; q.vx = 0; q.vy = 0; }
      }
    }
    if (fused) {
      if (q.heldBy >= 0) {
        const h = s.hands[q.heldBy];
        if (h) h.holdingProj = -1;
        q.heldBy = -1;
      }
      this.explodeBomb(q, b.blastRadius);
    }
  }

  private explodeBomb(q: Projectile, radius = BEHAVIOUR.bomb.blastRadius) {
    q.t = -1;
    if (q.x < WORLD.gateX + 90) this.damageGate(q.damage || BEHAVIOUR.bomb.gateDamage, WORLD.gateX + 6, q.y, 'bomber');
    this.blast(q.x, q.y, radius, BEHAVIOUR.bomb.blastDamage, -1);
  }

  private updateComet(q: Projectile) {
    const s = this.s;
    if (q.heldBy >= 0) {
      const h = s.hands[q.heldBy];
      if (!h) { q.t = -1; return; }
      if (h.down) q.charge += Math.hypot(h.x - q.x, h.y - q.y);
      q.x = h.x; q.y = h.y;
      q.t += DT;
      if (q.t > WEAPONS.comet.idleCancelSeconds) {
        h.holdingProj = -1;
        h.mode = 'none';
        q.t = -1;
      }
      return;
    }
    if (q.t < 0) return;
    q.vy += this.tuning.gravity * DT;
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.rot += 0.3;
    const ground = WORLD.groundY + 22;
    if (q.y >= ground || q.x <= WORLD.gateX) {
      q.t = -1;
      this.blast(q.x, Math.min(q.y, ground), q.size, q.damage, -1);
      const tier = this.tierOf('comet');
      if (tier) this.addFlame(q.x, q.size * 0.8, WEAPONS.comet[tier as 'comet1'].flameSeconds);
    } else if (q.x > WORLD.rightWallX) {
      q.t = -1;
    }
  }

  private updateRoofBolt(q: Projectile) {
    q.x += q.vx * DT;
    q.y += q.vy * DT;
    q.t += DT;
    for (const e of [...this.s.enemies]) {
      if (e.dead || e.hidden || q.hit.includes(e.id) || e.st === 'held') continue;
      const def = ENEMIES[e.type];
      if (Math.abs(q.x - e.x) > def.radius + 6) continue;
      if (q.y < e.y - def.height || q.y > e.y) continue;
      q.hit.push(e.id);
      this.hurt(e, q.damage, 'bolt', -1);
      if (!q.pierce) { q.t = -1; return; }
    }
    if (q.y > WORLD.groundY + 30 || q.x > WORLD.width + 80 || q.t > 2.5) q.t = -1;
  }

  private updateFlames() {
    const s = this.s;
    for (const f of s.flames) {
      f.t -= DT;
      for (const e of [...s.enemies]) {
        if (e.dead || !this.isGrounded(e)) continue;
        if (Math.abs(e.x - f.x) <= f.halfWidth) this.hurt(e, WEAPONS.flameDps * DT, 'fire', -1);
      }
    }
    s.flames = s.flames.filter((f) => f.t > 0);
  }
}
