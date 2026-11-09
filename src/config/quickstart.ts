/**
 * Developer quick start: drops a run on a later day with roughly what a player would own by then.
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
    gold: 1400,
    offerings: 10,
    owned: ['gate1', 'cauldron', 'wheel1', 'comet1', 'mortar', 'perch'],
    hornEquipped: 'mortar',
  },
  {
    day: 20,
    gold: 3800,
    offerings: 30,
    owned: ['gate1', 'gate2', 'cauldron', 'perch', 'wheel1', 'wheel2', 'comet1', 'comet2', 'stomper1', 'stomper2', 'mortar', 'frost', 'bolter1'],
    hornEquipped: 'frost',
  },
  {
    day: 30,
    gold: 9000,
    offerings: 60,
    owned: [
      'gate1', 'gate2', 'gate3', 'cauldron', 'perch', 'wheel1', 'wheel2', 'wheel3', 'comet1', 'comet2', 'comet3',
      'stomper1', 'stomper2', 'stomper3', 'mortar', 'frost', 'bellows', 'bolter1', 'bolter2',
    ],
    hornEquipped: 'bellows',
  },
];

export const quickStartFor = (day: number): QuickStart | null => QUICK_STARTS.find((q) => q.day === day) ?? null;
