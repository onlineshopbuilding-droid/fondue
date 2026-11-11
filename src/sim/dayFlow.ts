import { ENEMIES, ENEMY_TYPES } from '../config/enemies';
import { DAY } from '../config/waves';
import { DT, fieldEntry } from '../config/world';
import { ECONOMY, GATE_HP, WEAPON_SLOTS } from '../config/shop';
import { quickStartFor } from '../config/quickstart';
import { buildDayPlan, newTypesOnDay } from './spawn';
import type { SimContext } from './context';

/**
 * The course of a day: banner, fight, nightfall, the market in between, and the end of a run.
 * It also steps everything that lives on the field while a fight is on.
 */
export class DayFlow {
  constructor(private ctx: SimContext) {}

  applyQuickStart(q: NonNullable<ReturnType<typeof quickStartFor>>) {
    const s = this.ctx.s;
    s.meta.quickStart = q.day;
    s.meta.owned.push(...q.owned);
    s.meta.hornEquipped = q.hornEquipped;
    s.gold = q.gold;
    s.offerings = q.offerings;
    // Nobody needs the tips for everything that appeared on the skipped days.
    s.seenTypes = ENEMY_TYPES.filter((t) => ENEMIES[t].firstDay < q.day);
  }

  startDayIfAllReady() {
    const s = this.ctx.s;
    if (s.phase !== 'intermission') return;
    const present = s.hands.filter((h) => h.connected);
    if (present.length > 0 && s.hands.every((h, i) => !h.connected || s.meta.ready[i])) this.startDay(s.day + 1);
  }

  setPaused(p: number, paused: boolean) {
    const s = this.ctx.s;
    if (s.phase === 'gameover' || s.phase === 'intermission') return;
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
    if (this.ctx.s.phase === 'gameover' || this.ctx.s.phase === 'intermission') return;
    this.ctx.s.paused = true;
    this.ctx.s.meta.pausedBy = reason;
    this.ctx.touchMeta();
  }

  setReady(p: number, ready: boolean) {
    const s = this.ctx.s;
    if (s.phase !== 'intermission') return;
    s.meta.ready[p] = ready;
    this.ctx.touchMeta();
    this.startDayIfAllReady();
  }

  startDay(day: number) {
    const s = this.ctx.s;
    s.day = day;
    s.dayT = 0;
    s.phase = 'banner';
    s.phaseT = DAY.bannerSeconds;
    s.gateMax = GATE_HP[this.ctx.economy.currentGateId()];
    s.gateHp = day === 1 ? s.gateMax : Math.min(s.gateMax, s.gateHp + s.gateMax * ECONOMY.gateRefill);
    s.enemies = [];
    s.projectiles = [];
    s.flames = [];
    s.perchBusy = 0;
    s.potBusy = 0;
    s.potMax = 0;
    s.nightfall = false;
    s.dayKills = 0; s.dayGold = 0; s.dayOfferings = 0; s.dayScore = 0;
    for (const slot of WEAPON_SLOTS) { s.cooldowns[slot] = 0; s.cooldownMax[slot] = 0; }
    for (const h of s.hands) { h.mode = 'none'; h.holding = -1; h.holdingProj = -1; }
    s.spawned = 0;
    s.spawnQueue = buildDayPlan(day, s.meta.difficulty, s.meta.names.length, this.ctx.tuning.spawnRate, this.ctx.rng);
    s.meta.ready = s.meta.ready.map(() => false);
    s.meta.newTipTypes = newTypesOnDay(day).filter((t) => !s.seenTypes.includes(t));
    s.seenTypes.push(...s.meta.newTipTypes);
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
    this.ctx.touchMeta();
  }

  step() {
    const s = this.ctx.s;
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
        this.ctx.spawner.spawn();
        this.updateWorld();
        if (s.gateHp <= 0) {
          s.phase = 'defeat';
          s.phaseT = DAY.endBannerSeconds + 0.8;
          for (let p = 0; p < s.hands.length; p++) this.ctx.hands.dropHeld(p);
          this.ctx.emit({ e: 'defeat' });
        } else if (s.dayT >= DAY.seconds) {
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
        if (s.phaseT <= 0) { this.endDay(true); s.phase = 'intermission'; this.ctx.touchMeta(); }
        break;
      case 'defeat':
        this.updateWorld();
        s.phaseT -= DT;
        if (s.phaseT <= 0) { this.endDay(false); s.phase = 'gameover'; this.ctx.touchMeta(); }
        break;
      case 'intermission':
      case 'gameover':
        break;
    }
    s.rngState = this.ctx.rng.state;
  }

  tickCooldowns() {
    const s = this.ctx.s;
    for (const slot of WEAPON_SLOTS) {
      if (s.cooldowns[slot] > 0) {
        s.cooldowns[slot] -= DT;
        if (s.cooldowns[slot] <= 0) {
          s.cooldowns[slot] = 0;
          this.ctx.emit({ e: 'weaponReady', slot });
        }
      }
    }
    if (s.perchBusy > 0) s.perchBusy = Math.max(0, s.perchBusy - DT);
    if (s.potBusy > 0) s.potBusy = Math.max(0, s.potBusy - DT);
  }

  updateWorld() {
    const s = this.ctx.s;
    const list = s.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.dead) this.ctx.enemies.updateEnemy(e);
    }
    this.ctx.projectiles.updateProjectiles();
    this.ctx.combat.updateFlames();
    s.enemies = s.enemies.filter((e) => !e.dead && !(e.st === 'flee' && e.x > fieldEntry(s.meta.fieldW) + 40));
    s.projectiles = s.projectiles.filter((q) => q.t >= 0);
  }
}
