/**
 * Keeps count during a run: kills by cause and type, kegs, weapon shots, gate damage, crests, waves.
 * Rewards and challenges are rules on these numbers, so the simulation only counts.
 */
import type { EnemyType } from '../config/enemies';
import type { SimContext } from './context';
import type { DeathCause } from './types';

export class RunStats {
  constructor(private ctx: SimContext) {}

  private get d() { return this.ctx.s.stats; }

  kill(type: EnemyType, cause: DeathCause, byKeg: boolean) {
    const d = this.d;
    d.kills++;
    d.killsByCause[cause] = (d.killsByCause[cause] ?? 0) + 1;
    d.killsByType[type] = (d.killsByType[type] ?? 0) + 1;
    if (cause === 'impact') d.throwKillsByType[type] = (d.throwKillsByType[type] ?? 0) + 1;
    if (byKeg) d.kegBlastKills++;
  }

  gold(amount: number) { this.d.goldEarned += amount; }
  crests(amount: number) { this.d.crestsEarned += amount; }
  kegShaken() { this.d.kegsShaken++; }
  /** A keg went up among the raiders (shaken loose, thrown back, or carried by a raider who died). */
  kegBlast() { this.d.kegBlasts++; }
  weaponFired(id: string) { this.d.weaponShots[id] = (this.d.weaponShots[id] ?? 0) + 1; }
  gateDamaged(amount: number) { this.d.gateDamage += amount; }
  thrown() { this.d.throws++; }
  waveCleared() { this.d.wavesCleared++; }
}
