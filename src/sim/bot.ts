import { ENEMIES } from '../config/enemies';
import { DT, WORLD } from '../config/world';
import type { WeaponSlot } from '../config/shop';
import type { Sim } from './sim';
import type { Enemy } from './types';

export interface BotSkill {
  name: string;
  /** Seconds per grab-and-throw. */
  actionTime: number;
  /** Chance a throw is botched and only drops the enemy. */
  missRate: number;
  /** Chance that a throw goes into the cauldron when one is owned. */
  offeringRate: number;
  /** Seconds between weapon uses. */
  weaponEvery: number;
}

export const BOT_SKILLS: Record<string, BotSkill> = {
  beginner: { name: 'Beginner', actionTime: 1.5, missRate: 0.3, offeringRate: 0.1, weaponEvery: 12 },
  average: { name: 'Average', actionTime: 0.95, missRate: 0.15, offeringRate: 0.2, weaponEvery: 6 },
  pro: { name: 'Pro', actionTime: 0.6, missRate: 0.05, offeringRate: 0.3, weaponEvery: 2.5 },
};

const WISHLIST = [
  'cauldron', 'gate1', 'wheel1', 'comet1', 'mortar', 'stomper1', 'perch', 'gate2', 'comet2', 'wheel2', 'stomper2', 'bolter1',
  'frost', 'gate3', 'comet3', 'stomper3', 'wheel3', 'bolter2', 'bellows', 'gate4', 'bolter3',
];

/** A scripted player that uses the same commands as a person, for headless balance runs. */
export class Bot {
  private t = 0;
  private weaponT = 0;
  private shopped = -1;

  constructor(private p: number, private skill: BotSkill, private rand: () => number) {}

  tick(sim: Sim) {
    const s = sim.s;
    if (s.phase === 'intermission') {
      if (this.shopped !== s.day) {
        this.shopped = s.day;
        this.shop(sim);
        sim.command({ k: 'ready', p: this.p, ready: true });
      }
      return;
    }
    if (s.phase !== 'battle') return;
    this.t -= DT;
    this.weaponT -= DT;
    if (this.weaponT <= 0 && this.useWeapon(sim)) {
      this.weaponT = this.skill.weaponEvery;
      this.t = Math.max(this.t, this.skill.actionTime * 0.5);
      return;
    }
    if (this.t > 0) return;
    this.t = this.skill.actionTime * (0.8 + this.rand() * 0.4);
    this.act(sim);
  }

  private shop(sim: Sim) {
    for (const id of WISHLIST) {
      if (sim.owns(id)) continue;
      if (sim.canBuy(id)) sim.command({ k: 'buy', p: this.p, item: id });
    }
  }

  private targets(sim: Sim): Enemy[] {
    return sim.s.enemies
      .filter((e) => !e.dead && !e.hidden && !e.shieldOn && e.heldBy.length === 0 && e.st !== 'hooked' && e.st !== 'flee' && e.st !== 'air' && e.type !== 'yeti')
      .sort((a, b) => a.x - b.x);
  }

  private act(sim: Sim) {
    const list = this.targets(sim);
    // Carts in range get clicked to pieces first.
    const cart = list.find((e) => e.type === 'siegeCart' && e.st === 'attack');
    const e = cart ?? list.find((q) => q.type !== 'siegeCart' && q.x < WORLD.width);
    if (!e) return;
    const def = ENEMIES[e.type];
    const hx = e.x;
    const hy = e.y - def.height * 0.5;
    sim.setHand(this.p, hx, hy);
    sim.command({ k: 'press', p: this.p, x: hx, y: hy });
    if (e.type === 'siegeCart') {
      sim.command({ k: 'release', p: this.p, x: hx, y: hy, vx: 0, vy: 0 });
      return;
    }
    if (this.rand() < this.skill.missRate) {
      sim.setHand(this.p, hx + 20, hy - 30);
      sim.command({ k: 'release', p: this.p, x: hx + 20, y: hy - 30, vx: 0, vy: 40 });
      return;
    }
    if (sim.owns('cauldron') && this.rand() < this.skill.offeringRate) {
      const cx = WORLD.cauldron.x;
      sim.setHand(this.p, cx, 400);
      sim.command({ k: 'release', p: this.p, x: cx, y: 400, vx: 0, vy: 0 });
      return;
    }
    // Moved far enough to count as a throw rather than a tap.
    sim.setHand(this.p, hx, hy - 60);
    sim.command({ k: 'release', p: this.p, x: hx, y: hy - 60, vx: 0, vy: -1400 });
  }

  private crowd(sim: Sim): { x: number; n: number } {
    let best = { x: 800, n: 0 };
    for (const e of sim.s.enemies) {
      if (e.dead || e.x > WORLD.width - 20) continue;
      const n = sim.s.enemies.filter((o) => Math.abs(o.x - e.x) < 110 && !o.dead).length;
      if (n > best.n) best = { x: e.x, n };
    }
    return best;
  }

  private useWeapon(sim: Sim): boolean {
    const s = sim.s;
    const c = this.crowd(sim);
    const ready = (slot: WeaponSlot) => sim.tierOf(slot) !== null && s.cooldowns[slot] <= 0;
    if (s.enemies.length < 3) return false;
    const p = this.p;
    if (ready('wheel')) { sim.command({ k: 'activate', p, slot: 'wheel' }); return true; }
    if (ready('bolter')) { sim.command({ k: 'activate', p, slot: 'bolter' }); return true; }
    if (ready('stomper') && c.n >= 3) {
      sim.command({ k: 'activate', p, slot: 'stomper' });
      sim.setHand(p, c.x, 300);
      sim.command({ k: 'press', p, x: c.x, y: 300 });
      sim.command({ k: 'release', p, x: c.x, y: 340, vx: 0, vy: 1500 });
      return true;
    }
    if (ready('horn') && c.n >= 2) {
      sim.command({ k: 'activate', p, slot: 'horn' });
      sim.setHand(p, c.x, 560);
      sim.command({ k: 'press', p, x: c.x, y: 560 });
      sim.command({ k: 'release', p, x: c.x, y: 560, vx: 0, vy: 0 });
      return true;
    }
    if (ready('comet') && c.n >= 2) {
      sim.command({ k: 'activate', p, slot: 'comet' });
      sim.setHand(p, c.x, 500);
      sim.command({ k: 'press', p, x: c.x, y: 500 });
      sim.command({ k: 'release', p, x: c.x, y: 500, vx: 0, vy: 400 });
      return true;
    }
    return false;
  }
}
