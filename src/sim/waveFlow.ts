// Part of the simulation: the course of a level from its banner through the waves to its end.
import type { EnemyType } from '../config/enemies';
import { DT } from '../config/field';
import { CASTLE_TIERS } from '../config/keep';
import { WAVES } from '../config/waves';
import { waveSeed } from './plan';
import { Rng } from './rng';
import type { SimContext } from './context';

/**
 * The course of a level: a short banner (raiders already walk), then wave after wave. A wave's
 * arrivals come at their times; once all are out, a short pause follows, and the next wave starts
 * when the pause is over or soon after nobody is left alive. The field is never quiet for long (B2).
 * The run is won when the last wave has fully arrived and every raider is gone; lost when the gate falls.
 */
export class WaveFlow {
  constructor(private ctx: SimContext) {}

  setPaused(p: number, paused: boolean) {
    const s = this.ctx.s;
    if (s.phase === 'gameover' || s.phase === 'runWon') return;
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
    if (s.phase === 'gameover' || s.phase === 'runWon') return;
    s.paused = true;
    s.meta.pausedBy = reason;
    this.ctx.touchMeta();
  }

  /** Freezes or releases the whole simulation without a pause window (tutorial). */
  setHold(hold: boolean) { this.ctx.s.hold = hold; }

  /** Starts the level (at its first wave, or at a resumed one). */
  startLevel(wave: number, gateHp: number) {
    const s = this.ctx.s;
    s.phase = 'banner';
    s.phaseT = WAVES.bannerSeconds;
    s.gateMax = CASTLE_TIERS[this.ctx.loadout.gateTier]?.hp ?? CASTLE_TIERS[0].hp;
    s.gateHp = gateHp > 0 ? Math.min(gateHp, s.gateMax) : s.gateMax;
    s.enemies = [];
    s.projectiles = [];
    s.zones = [];
    s.perchBusy = 0;
    s.potBusy = 0;
    s.potMax = 0;
    this.ctx.weapons.resetForDay();
    for (const h of s.hands) { h.holding = -1; h.holdingProj = -1; }
    this.startWave(wave, WAVES.firstWaveDelay);
  }

  /** Begins a wave. `delay` holds back its first arrival (the very first wave of a level). */
  startWave(wave: number, delay = 0) {
    const s = this.ctx.s;
    const rules = this.ctx.rules;
    s.wave = wave;
    s.waveT = -delay;
    s.waveDone = false;
    s.pauseT = 0;
    s.emptyT = 0;
    s.spawned = 0;
    // The plan comes from a random stream of its own, so it never depends on the fights before.
    const plan = this.ctx.planner.plan(wave, { seed: s.seed, players: rules.players }, new Rng(waveSeed(s.seed, wave)));
    s.spawnQueue = plan.entries;
    s.pauseAfter = plan.pauseAfter;
    const types = [...new Set(plan.entries.map((e) => e.type))] as EnemyType[];
    const newTypes = types.filter((t) => !s.seenTypes.includes(t));
    s.seenTypes.push(...newTypes);
    s.meta.wave = { landscape: plan.landscape, night: plan.night, boss: plan.boss, newTypes, wave, lastWave: rules.lastWave };
    this.ctx.touchMeta();
    this.ctx.emit({ e: 'waveStart', wave });
  }

  private get ended(): boolean { return this.ctx.s.phase === 'runWon'; }

  private get isLastWave(): boolean {
    const last = this.ctx.rules.lastWave;
    return last !== null && this.ctx.s.wave >= last;
  }

  /** The run is over: the result goes into Meta, where every device reads it for its own reward. */
  private finishRun(won: boolean) {
    const s = this.ctx.s;
    if (won) {
      // Holding the gate well pays a score bonus.
      const share = s.gateMax > 0 ? s.gateHp / s.gateMax : 0;
      s.meta.totalScore += Math.round(s.meta.totalScore * share * 0.25);
    }
    s.meta.result = {
      runId: this.ctx.rules.runId, won, devRun: s.meta.devRun, names: [...s.meta.names], wave: s.wave,
      score: s.meta.totalScore, kills: s.meta.totalKills,
      gateShare: s.gateMax > 0 ? Math.max(0, s.gateHp) / s.gateMax : 0,
      stats: JSON.parse(JSON.stringify(s.stats)),
    };
    s.phase = won ? 'runWon' : 'gameover';
    for (let p = 0; p < s.hands.length; p++) this.ctx.hands.dropHeld(p);
    this.ctx.touchMeta();
    if (won) this.ctx.emit({ e: 'runWon' });
  }

  /** The wave clock: arrivals, the pause, the empty-field rule, the next wave, the win. */
  private stepWaves() {
    const s = this.ctx.s;
    s.runT += DT;
    s.waveT += DT;
    this.ctx.spawner.spawn();
    const alive = s.enemies.length;
    if (!s.waveDone && s.spawned >= s.spawnQueue.length) {
      s.waveDone = true;
      s.pauseT = 0;
      this.ctx.stats.waveCleared();
    }
    if (alive === 0 && s.waveT >= 0) s.emptyT += DT;
    else s.emptyT = 0;
    if (s.waveDone) {
      if (this.isLastWave) {
        if (alive === 0) this.finishRun(true);
        return;
      }
      s.pauseT += DT;
      if (s.pauseT >= s.pauseAfter || s.emptyT >= WAVES.clearDelay) this.startWave(s.wave + 1);
    } else if (s.emptyT >= WAVES.clearDelay) {
      // Nobody is alive and the next arrival is still far off: it comes now.
      const next = s.spawnQueue[s.spawned];
      if (next && next.t > s.waveT) s.waveT = next.t;
      s.emptyT = 0;
    }
  }

  step() {
    const s = this.ctx.s;
    if (s.paused || s.hold) return;
    s.tick++;
    switch (s.phase) {
      case 'banner':
      case 'battle':
        // Raiders already walk under the banner.
        if (s.phase === 'banner') {
          s.phaseT -= DT;
          if (s.phaseT <= 0) s.phase = 'battle';
        }
        this.ctx.weapons.tick();
        this.ctx.stations.tick();
        this.stepWaves();
        if (this.ended) break;
        this.updateWorld();
        if (s.gateHp <= 0) {
          s.phase = 'defeat';
          s.phaseT = WAVES.endBannerSeconds;
          for (let p = 0; p < s.hands.length; p++) this.ctx.hands.dropHeld(p);
          this.ctx.emit({ e: 'defeat' });
        }
        break;
      case 'defeat':
        this.updateWorld();
        s.phaseT -= DT;
        if (s.phaseT <= 0) this.finishRun(false);
        break;
      case 'gameover':
      case 'runWon':
        break;
    }
    s.rngState = this.ctx.rng.state;
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
    const out = this.ctx.entryX + 40;
    s.enemies = s.enemies.filter((e) => !e.dead && !(e.st === 'flee' && e.x > out));
    s.projectiles = s.projectiles.filter((q) => q.t >= 0);
  }
}
