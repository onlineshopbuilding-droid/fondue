/**
 * Experiment switches: one entry per mechanic where old and new should be compared. Adding a
 * switch here is enough to make it appear in the developer menu; the host's values apply in co-op.
 * Read a value in the rules with `sim.flag('id')`.
 */
export interface FlagDef {
  id: string;
  label: string;
  hint: string;
  options: { value: string; label: string }[];
  value: string;
}

export const FLAG_DEFS: FlagDef[] = [
  {
    id: 'secondHand',
    label: 'Second hand on the laptop',
    hint: 'Right mouse button = second hand (C9): alone, or pressed while the left button holds, to grab two raiders. Like every switch, it makes runs developer runs.',
    options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],
    value: 'off',
  },
];

/** Switch id of the simulated second hand (F2/C9). The hand code reads `flags[SECOND_HAND_FLAG] === 'on'`. */
export const SECOND_HAND_FLAG = 'secondHand';

/** True when the developer switch simulates a second hand on the laptop. */
export const secondHandSimulated = (flags: Readonly<Partial<Flags>> | null | undefined): boolean => flags?.[SECOND_HAND_FLAG] === 'on';

export type Flags = Record<string, string>;

export function defaultFlags(): Flags {
  return Object.fromEntries(FLAG_DEFS.map((f) => [f.id, f.value]));
}

/** Known switches only, each with a value that still exists. */
export function cleanFlags(stored?: Partial<Flags> | null): Flags {
  const out = defaultFlags();
  for (const f of FLAG_DEFS) {
    const v = stored?.[f.id];
    if (v !== undefined && f.options.some((o) => o.value === v)) out[f.id] = v;
  }
  return out;
}
