/**
 * Judges a level's challenges on the counts of the finished run (A2, cheese 4 and 5). Pure: no
 * state of its own, so tests, bots and the reward use the same rule.
 */
import type { ChallengeDef } from '../config/worlds/types';
import type { RunStatsData } from '../sim/rules';

const num = (v: number | string | undefined): number => (typeof v === 'number' ? v : Number(v) || 0);

/** How far a challenge is: the count reached and the count asked for. */
export function challengeProgress(c: ChallengeDef, stats: RunStatsData): { have: number; need: number } {
  const need = num(c.params.n);
  const by = (rec: Record<string, number>, key: string) => rec[key] ?? 0;
  let have = 0;
  switch (c.template) {
    case 'throwKills': have = by(stats.killsByCause, 'impact'); break;
    case 'throws': have = stats.throws; break;
    case 'killType': have = by(stats.throwKillsByType ?? {}, String(c.params.type)); break;
    case 'kegBlasts': have = stats.kegBlasts; break;
    case 'kegsShaken': have = stats.kegsShaken; break;
    case 'weaponShots': have = by(stats.weaponShots, String(c.params.weapon)); break;
    case 'cauldron': have = by(stats.killsByCause, 'cauldron'); break;
    case 'eagle': have = by(stats.killsByCause, 'eagle'); break;
    default: have = 0;
  }
  return { have, need };
}

/** A challenge is met when its count reached what it asks. Unknown templates are never met. */
export function challengeDone(c: ChallengeDef, stats: RunStatsData): boolean {
  const { have, need } = challengeProgress(c, stats);
  return need > 0 && have >= need;
}

/** Both challenges of a level at once. */
export function challengesDone(list: readonly ChallengeDef[], stats: RunStatsData): [boolean, boolean] {
  return [!!list[0] && challengeDone(list[0], stats), !!list[1] && challengeDone(list[1], stats)];
}
