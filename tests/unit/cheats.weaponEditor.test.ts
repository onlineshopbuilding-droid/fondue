/**
 * The weapon editor's override layer (F1): changed values reach the tier the simulation reads, can
 * be reset, exported as text and pasted back.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { weaponById } from '../../src/config/weapons';
import {
  editableFields, effectiveTier, hasWeaponOverrides, importOverrides, overrideCount, overridesAsText,
  resetWeaponOverrides, setWeaponOverride,
} from '../../src/sim/weapons/overrides';

const wheel = weaponById('wheel')!;

afterEach(() => resetWeaponOverrides());

describe('weapon overrides', () => {
  it('without changes the simulation reads the config row itself', () => {
    expect(effectiveTier(wheel, 1)).toBe(wheel.tiers[0]);
    expect(hasWeaponOverrides()).toBe(false);
  });

  it('lists only numeric fields as editable', () => {
    const fields = editableFields(wheel, 1);
    expect(fields).toContain('cooldown');
    expect(fields).toContain('damage');
    expect(fields).not.toContain('note');
  });

  it('a changed value reaches the effective tier, others stay', () => {
    expect(setWeaponOverride('wheel', 2, 'cooldown', 3)).toBe(true);
    expect(effectiveTier(wheel, 2).cooldown).toBe(3);
    expect(effectiveTier(wheel, 2).damage).toBe(wheel.tiers[1].damage);
    expect(effectiveTier(wheel, 1)).toBe(wheel.tiers[0]);
    expect(overrideCount()).toBe(1);
  });

  it('refuses unknown weapons, tiers, fields and switches', () => {
    expect(setWeaponOverride('nope', 1, 'cooldown', 1)).toBe(false);
    expect(setWeaponOverride('wheel', 8, 'cooldown', 1)).toBe(false);
    expect(setWeaponOverride('wheel', 1, 'note', 1)).toBe(false);
    expect(setWeaponOverride('wheel', 1, 'cooldown', Number.NaN)).toBe(false);
    expect(hasWeaponOverrides()).toBe(false);
  });

  it('setting the default value back removes the change; reset clears all', () => {
    setWeaponOverride('wheel', 1, 'damage', 999);
    setWeaponOverride('wheel', 1, 'damage', wheel.tiers[0].damage);
    expect(hasWeaponOverrides()).toBe(false);
    setWeaponOverride('wheel', 1, 'damage', 999);
    setWeaponOverride('wheel', 3, 'damage', 999);
    resetWeaponOverrides('wheel', 1);
    expect(overrideCount()).toBe(1);
    resetWeaponOverrides();
    expect(overrideCount()).toBe(0);
  });

  it('exports a readable list with JSON that imports back', () => {
    setWeaponOverride('wheel', 1, 'cooldown', 2);
    const text = overridesAsText();
    expect(text).toContain('Rolling Wheel (wheel) tier 1: cooldown 16 -> 2');
    resetWeaponOverrides();
    expect(importOverrides(text)).toBe(1);
    expect(effectiveTier(wheel, 1).cooldown).toBe(2);
    expect(() => importOverrides('no json here')).toThrow();
  });
});
