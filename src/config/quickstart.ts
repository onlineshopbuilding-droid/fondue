/**
 * Developer quick start: drops a run on a later day with roughly what a player would own by then.
 * Measured from the Mid bot on Medium (day 30 from Mid on Easy, which still gets there), see docs/balance.md.
 * Quick-start runs do not count for the scores.
 */
export interface QuickStart {
  day: number;
  gold: number;
  offerings: number;
  owned: string[];
  hornEquipped: string | null;
}

export const QUICK_STARTS: QuickStart[] = [
  {
    day: 10,
    gold: 850,
    offerings: 40,
    owned: ['gate1', 'cauldron', 'perch', 'wheel1', 'comet1', 'comet2', 'stomper1', 'mortar'],
    hornEquipped: 'mortar',
  },
  {
    day: 20,
    gold: 2100,
    offerings: 45,
    owned: [
      'gate1', 'gate2', 'cauldron', 'perch', 'wheel1', 'wheel2', 'wheel3', 'comet1', 'comet2', 'comet3',
      'stomper1', 'stomper2', 'stomper3', 'mortar', 'frost', 'bellows', 'bolter1',
    ],
    hornEquipped: 'bellows',
  },
  {
    day: 30,
    gold: 15000,
    offerings: 100,
    owned: [
      'gate1', 'gate2', 'gate3', 'cauldron', 'perch', 'wheel1', 'wheel2', 'wheel3', 'comet1', 'comet2', 'comet3',
      'stomper1', 'stomper2', 'stomper3', 'mortar', 'frost', 'bellows', 'bolter1', 'bolter2', 'bolter3',
    ],
    hornEquipped: 'bellows',
  },
];

export const quickStartFor = (day: number): QuickStart | null => QUICK_STARTS.find((q) => q.day === day) ?? null;
