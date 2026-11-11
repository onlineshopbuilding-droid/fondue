import type { EnemyType } from '../config/enemies';
import { ECONOMY } from '../config/economy';
import { DT, fieldEntry } from '../config/field';
import { GATES } from '../config/keep';
import { DAY } from '../config/waves';
import { daySeed } from './plan';
import { Rng } from './rng';
import type { SimContext } from './context';

/**
 * The course of a run: banner, fight, nightfall, the market in between, and how it ends
 * (the gate falls, or the last day is won). It also steps everything on the field during a fight.
 */
export class DayFlow {
  constructor(private ctx: SimContext) {}

  startDayIfAllReady() {
    const s = this.ctx.s;
    if (s.phase !== 'intermission') return;
    const present = s.hands.filter((h) => h.connected);
    if (present.length > 0 && s.hands.every((h, i) => !h.connected || s.meta.ready[i])) this.startDay(s.day + 1);
  }

  setPaused(p: number, paused: boolean) {
    const s = this.ctx.s;
    if (s.phase === 'gameover' || s.phase === 'runWon' || s.phase === 'intermission') return;
    s.paused = paused;
    s.meta.pausedBy = paused ? (s.meta.names[p] ?? 'Someone') : null;
    if (!paused) this.dropReleasedDuringPause();
    this.ctx.touchMeta();
  }

  /** A button let go during a pause must not count as a throw; the enemy just drops afterwards. */
  dropReleasedDuringPause() {
    this.ctx.s.hands.forEach((h, p) => {
      if (!h.down && (h.holding >= 0 || h.holdingProj >= 0)) this.ctx.hands.dropHeld(p);
    });
  }

  /** Pause caused by a lost connection rather than a player. */
  pauseForDisconnect(reason: string) {
    const s = this.ctx.s;
    if (s.phase === 'gameover' || s.phase === 'runWon' || s.phase === 'intermission') return;
    s.paused = true;
    s.meta.pausedBy = reason;
    this.ctx.touchMeta();
  }

  /** Freezes or releases the whole simulation without a pause window (tutorial). */
  setHold(hold: boolean) { this.ctx.s.hold = hold; }

  setReady(p: number, ready: boolean) {
    const s = this.ctx.s;
    if (s.phase !== 'intermission') return;
    s.meta.ready[p] = ready;
    this.ctx.touchMeta();
    this.startDayIfAllReady();
  }

  startDay(day: number) {
    const s = this.ctx.s;
    const rules = this.ctx.rules;
    s.day = day;
    s.dayT = 0;
    s.phase = 'banner';
    s.phaseT = DAY.bannerSeconds;
    s.gateMax = GATES[this.ctx.loadout.gateTier].hp;
    s.gateHp = s.gateHp <= 0 ? s.gateMax : Math.min(s.gateMax, s.gateHp + s.gateMax * ECONOMY.gateRefill);
    s.enemies = [];
    s.projectiles = [];
    s.zones = [];
    s.perchBusy = 0;
    s.potBusy = 0;
    s.potMax = 0;
    s.nightfall = false;
    s.dayKills = 0; s.dayGold = 0; s.dayOfferings = 0; s.dayScore = 0;
    this.ctx.weapons.resetForDay();
    for (const h of s.hands) { h.holding = -1; h.holdingProj = -1; }
    s.spawned = 0;

    // The plan comes from a random stream of its own, so it never depends on the fights before.
    const plan = this.ctx.planner.plan(day, { seed: s.seed, players: rules.players }, new Rng(daySeed(s.seed, day)));
    s.spawnQueue = plan.entries;
    const types = [...new Set(plan.entries.map((e) => e.type))] as EnemyType[];
    const newTypes = types.filter((t) => !s.seenTypes.includes(t));
    s.seenTypes.push(...newTypes);
    s.meta.today = { landscape: plan.landscape, night: plan.night, boss: plan.boss, newTypes, seconds: plan.seconds };
    s.meta.ready = s.meta.ready.map(() => false);
    this.ctx.touchMeta();
    this.ctx.emit({ e: 'dayStart', day });
  }

  endDay(win: boolean) {
    const s = this.ctx.s;
    const gatePct = s.gateMax > 0 ? Math.round((100 * s.gateHp) / s.gateMax) : 0;
    const bonus = win ? Math.round(s.dayScore * (gatePct / 400)) : 0;
    s.dayScore += bonus;
    s.meta.totalScore += s.dayScore;
    s.meta.totalKills += s.dayKills;
    s.meta.lastDay = {
      day: s.day, kills: s.dayKills, goldEarned: s.dayGold, offeringsEarned: s.dayOfferings, score: s.dayScore, gatePct,
    };
    if (win) this.ctx.stats.dayCleared();
    this.ctx.touchMeta();
  }

  /** The run is over: the result goes into Meta, where every device reads it for its own reward. */
  private finishRun(won: boolean) {
    const s = this.ctx.s;
    s.meta.result = {
      runId: this.ctx.rules.runId, won, day: s.day, score: s.meta.totalScore, kills: s.meta.totalKills,
      stats: JSON.parse(JSON.stringify(s.stats)),
    };
    s.phase = won ? 'runWon' : 'gameover';
    this.ctx.touchMeta();
  }

  step() {
    const s = this.ctx.s;
    if (s.paused || s.hold) return;
    s.tick++;
    switch (s.phase) {
      case 'banner':
        s.phaseT -= DT;
        if (s.phaseT <= 0) s.phase = 'battle';
        break;
      case 'battle':
        s.dayT += DT;
        this.ctx.weapons.tick();
        this.ctx.stations.tick();
        this.ctx.spawner.spawn();
        this.updateWorld();
        if (s.gateHp <= 0) {
          s.phase = 'defeat';
          s.phaseT = DAY.endBannerSeconds + 0.8;
          for (let p = 0; p < s.hands.length; p++) this.ctx.hands.dropHeld(p);
          this.ctx.emit({ e: 'defeat' });
        } else if (s.dayT >= s.meta.today.seconds) {
          if (!s.nightfall) {
            s.nightfall = true;
            this.ctx.emit({ e: 'nightfall' });
          }
          const retreat = this.ctx.flag('dayEnd') === 'retreat';
          if (retreat || s.enemies.length === 0) {
            s.phase = 'victory';
            s.phaseT = DAY.endBannerSeconds;
            for (let p = 0; p < s.hands.length; p++) this.ctx.hands.dropHeld(p);
            if (retreat) for (const e of s.enemies) this.ctx.enemies.makeFlee(e);
            this.ctx.emit({ e: 'victory' });
          }
        }
        break;
      case 'victory':
        this.updateWorld();
        s.phaseT -= DT;
        if (s.phaseT <= 0) this.afterVictory();
        break;
      case 'defeat':
        this.updateWorld();
        s.phaseT -= DT;
        if (s.phaseT <= 0) { this.endDay(false); this.finishRun(false); }
        break;
      case 'intermission':
      case 'gameover':
      case 'runWon':
        break;
    }
    s.rngState = this.ctx.rng.state;
  }

  private afterVictory() {
    const s = this.ctx.s;
    const rules = this.ctx.rules;
    this.endDay(true);
    if (rules.lastDay !== null && s.day >= rules.lastDay) {
      this.finishRun(true);
      this.ctx.emit({ e: 'runWon' });
    } else if (rules.hasMarket) {
      s.phase = 'intermission';
      this.ctx.touchMeta();
    } else {
      this.startDay(s.day + 1);
    }
  }

  updateWorld() {
    const s = this.ctx.s;
    const list = s.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.dead) this.ctx.enemies.updateEnemy(e);
    }
    this.ctx.projectiles.updateProjectiles();
    this.ctx.zones.update();
    s.enemies = s.enemies.filter((e) => !e.dead && !(e.st === 'flee' && e.x > fieldEntry(s.meta.fieldW) + 40));
    s.projectiles = s.projectiles.filter((q) => q.t >= 0);
  }
}
