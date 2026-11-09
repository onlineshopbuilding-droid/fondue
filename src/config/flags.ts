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
    id: 'cauldron',
    label: 'Great Cauldron',
    hint: 'In front stands on the road. Behind hangs on the keep and catches what you throw at it.',
    options: [{ value: 'front', label: 'In front' }, { value: 'back', label: 'Behind' }],
    value: 'front',
  },
  {
    id: 'dayEnd',
    label: 'End of day',
    hint: 'Fight on keeps raiders on the field until they are dead. Retreat is the old rule.',
    options: [{ value: 'fight', label: 'Fight on' }, { value: 'retreat', label: 'Retreat' }],
    value: 'fight',
  },
];

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
