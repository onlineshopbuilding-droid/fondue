import { describe, expect, it } from 'vitest';
import { WEAPONS, firesOnItsOwn } from '../../src/config/weapons';
import { weaponTip } from '../../src/ui/content';

describe('first-use tip of a weapon', () => {
  it('says how each weapon fires: tapped, on its own, or on its own with a tap for a burst', () => {
    for (const def of WEAPONS) {
      const tip = weaponTip(def);
      expect(tip.startsWith(`${def.name} is on the keep.`)).toBe(true);
      if (def.slot !== 'passive') expect(tip, def.id).toContain('Just tap it to fire');
      else if (firesOnItsOwn(def)) {
        expect(tip, def.id).toContain('fires on its own, no tap needed');
        expect(tip, def.id).not.toContain('tap it');
      } else expect(tip, def.id).toContain('fires on its own; tap it for a quick burst');
    }
  });

  it('covers the passive weapons the check found wrong', () => {
    for (const id of ['bolter', 'bell', 'catapult', 'hive']) {
      const def = WEAPONS.find((w) => w.id === id)!;
      expect(weaponTip(def)).not.toContain('Just tap it');
    }
    expect(weaponTip(WEAPONS.find((w) => w.id === 'sentry')!)).toContain('tap it for a quick burst');
  });
});
