/**
 * Progression through src/modes/progress.ts: unlocking with cheese, tiers with gold (tier 7 also
 * Raider Crests), the tier cap, wearing weapons (tiers stay), cheese paid once, and reload.
 */
import { describe, expect, it } from 'vitest';
import { CHEESE } from '../../src/config/currencies';
import { CASTLE_TIERS, STATIONS } from '../../src/config/keep';
import { HANDS } from '../../src/config/hand';
import { CREST_COST, TIER_MAX, WEAPON_TIER_GOLD } from '../../src/config/tiers';
import { WEAPONS } from '../../src/config/weapons';
import { CAMPAIGN } from '../../src/modes';
import {
  addCrests, addGold, applyLevelCheese, buy, cheeseMask, completeTutorial, equip, levelCheese, quote, unlockWeapon,
} from '../../src/modes/progress';
import { slotRole, tierCap, weaponGoldScale, weaponRole } from '../../src/modes/unlocks';
import { MemoryProfileStore, PROFILE_KEY, Profile } from '../../src/profile';

const W = 'fondue';
const RICH = 10_000_000;

async function fresh(store = new MemoryProfileStore()): Promise<Profile> {
  return Profile.load(store);
}

function winLevels(p: Profile, upTo: number): void {
  for (let l = 1; l <= upTo; l++) p.markLevelDone(W, l);
}

/** A weapon of the slow slot (slot 1), for equip tests. */
const slowWeapons = WEAPONS.filter((w) => w.enabled && weaponRole(w) === slotRole(1));

describe('tutorial and the Rolling Wheel (C4)', () => {
  it('a fresh profile owns nothing; after the tutorial exactly the Rolling Wheel, worn in slot 0, free', async () => {
    const p = await fresh();
    expect(p.data.keep.weapons).toEqual({});
    completeTutorial(p, W);
    expect(p.data.keep.weapons).toEqual({ wheel: { tier: 1 } });
    expect(p.data.keep.loadout).toEqual(['wheel', null, null, null, null]);
    expect(p.data.wallet).toEqual({ cheese: 0, gold: 0, crests: 0 });
    completeTutorial(p, W);
    expect(Object.keys(p.data.keep.weapons)).toEqual(['wheel']);
  });
});

describe('quote and buy', () => {
  it('weapon tiers 2..6 cost gold that rises each tier; tier 7 also costs Raider Crests', async () => {
    const p = await fresh();
    completeTutorial(p, W);
    p.setHandTier(1); // a cheat is fine here, it only marks the profile
    addGold(p, RICH);
    addCrests(p, CREST_COST);
    p.edit((d) => { d.keep.stations.perch = 1; }); // the perch lifts the tier cap to 7
    const scale = weaponGoldScale(WEAPONS.find((w) => w.id === 'wheel')!);
    let last = 0;
    for (let tier = 2; tier <= TIER_MAX; tier++) {
      const q = quote(p, { kind: 'weapon', id: 'wheel' }, W);
      expect(q.allowed).toBe(true);
      expect(q.toTier).toBe(tier);
      expect(q.price.gold).toBe(Math.round(WEAPON_TIER_GOLD[tier - 1] * scale));
      expect(q.price.gold).toBeGreaterThan(last);
      expect(q.price.crests).toBe(tier === TIER_MAX ? CREST_COST : 0);
      last = q.price.gold;
      expect(buy(p, { kind: 'weapon', id: 'wheel' }, W).allowed).toBe(true);
    }
    expect(p.weaponTier('wheel')).toBe(TIER_MAX);
    expect(p.data.wallet.crests).toBe(0);
    expect(quote(p, { kind: 'weapon', id: 'wheel' }, W).reason).toBe('max');
  });

  it('castle and hand prices rise every tier, tier 7 needs crests, and the shop sees before/after values', async () => {
    for (const kind of ['castle', 'hand'] as const) {
      const table = kind === 'castle' ? CASTLE_TIERS : HANDS;
      expect(table).toHaveLength(TIER_MAX);
      for (let i = 1; i < table.length; i++) expect(table[i].gold).toBeGreaterThan(table[i - 1].gold);
      expect(table[TIER_MAX - 1].crests).toBeGreaterThan(0);
      for (let i = 0; i < TIER_MAX - 1; i++) expect(table[i].crests).toBe(0);

      const p = await fresh();
      addGold(p, RICH);
      winLevels(p, 50);
      const q = quote(p, { kind }, W);
      expect(q.fromTier).toBe(1);
      expect(q.toTier).toBe(2);
      expect(q.after).toBeGreaterThan(q.before);
      expect(buy(p, { kind }, W).allowed).toBe(true);
      expect(kind === 'castle' ? p.data.keep.castleTier : p.data.keep.handTier).toBe(2);
    }
  });

  it('refuses without enough gold, and changes nothing', async () => {
    const p = await fresh();
    winLevels(p, 1);
    addGold(p, CASTLE_TIERS[1].gold - 1);
    const q = buy(p, { kind: 'castle' }, W);
    expect(q.allowed).toBe(false);
    expect(q.reason).toBe('gold');
    expect(p.data.keep.castleTier).toBe(1);
    expect(p.data.wallet.gold).toBe(CASTLE_TIERS[1].gold - 1);
  });

  it('tier 7 refuses without Raider Crests even with all the gold', async () => {
    const p = await fresh();
    addGold(p, RICH);
    p.edit((d) => { d.keep.stations.perch = 1; d.keep.castleTier = 6; });
    expect(quote(p, { kind: 'castle' }, W).reason).toBe('crests');
    addCrests(p, CASTLE_TIERS[6].crests);
    expect(buy(p, { kind: 'castle' }, W).allowed).toBe(true);
    expect(p.data.keep.castleTier).toBe(7);
  });

  it('the tier cap follows campaign progress: 3, then 4 after level 10, 5 after 25, 6 after 45, 7 only with the Eagle Perch', async () => {
    const p = await fresh();
    expect(tierCap(p, W)).toBe(3);
    winLevels(p, 10);
    expect(tierCap(p, W)).toBe(4);
    winLevels(p, 25);
    expect(tierCap(p, W)).toBe(5);
    winLevels(p, 45);
    expect(tierCap(p, W)).toBe(6);
    winLevels(p, 99);
    expect(tierCap(p, W)).toBe(6);
    p.edit((d) => { d.keep.stations.perch = 1; });
    expect(tierCap(p, W)).toBe(7);
  });

  it('endless gold cannot build past the cap of the campaign section', async () => {
    const p = await fresh();
    completeTutorial(p, W);
    addGold(p, RICH);
    buy(p, { kind: 'weapon', id: 'wheel' }, W);
    buy(p, { kind: 'weapon', id: 'wheel' }, W);
    expect(p.weaponTier('wheel')).toBe(3);
    const q = buy(p, { kind: 'weapon', id: 'wheel' }, W);
    expect(q.allowed).toBe(false);
    expect(q.reason).toBe('cap');
    expect(buy(p, { kind: 'hand' }, W).allowed).toBe(true);
    expect(buy(p, { kind: 'hand' }, W).allowed).toBe(true);
    expect(buy(p, { kind: 'hand' }, W).reason).toBe('cap');
  });

  it('weapons and stations unlock with cheese only once the campaign has reached them', async () => {
    const weapon = WEAPONS.find((w) => w.enabled && w.id !== 'wheel' && Number((w as { cheesePrice?: number }).cheesePrice ?? 0) > 0);
    expect(weapon).toBeDefined();
    const id = weapon!.id;
    const level = Number((weapon as { unlockLevel?: number }).unlockLevel ?? 0);
    const price = Number((weapon as { cheesePrice?: number }).cheesePrice ?? 0);
    const p = await fresh();
    p.edit((d) => { d.wallet.cheese = 500; });
    if (level > 0) {
      winLevels(p, level - 1);
      expect(quote(p, { kind: 'weapon', id }, W).reason).toBe('locked');
    }
    winLevels(p, level);
    const q = quote(p, { kind: 'weapon', id }, W);
    expect(q.action).toBe('unlock');
    expect(q.price).toEqual({ cheese: price, gold: 0, crests: 0 });
    expect(unlockWeapon(p, id, W)).toBe(true);
    expect(p.weaponTier(id)).toBe(1);
    expect(p.data.wallet.cheese).toBe(500 - price);

    expect(quote(p, { kind: 'station', id: 'cauldron' }, W).reason).toBe(STATIONS.cauldron.unlockLevel > level ? 'locked' : 'ok');
    winLevels(p, STATIONS.cauldron.unlockLevel);
    const s = buy(p, { kind: 'station', id: 'cauldron' }, W);
    expect(s.allowed).toBe(true);
    expect(s.price.cheese).toBe(STATIONS.cauldron.cheesePrice);
    expect(p.stationTier('cauldron')).toBe(1);
    addGold(p, RICH);
    expect(buy(p, { kind: 'station', id: 'cauldron' }, W).price.gold).toBe(STATIONS.cauldron.tiers[1].gold);
    expect(p.stationTier('cauldron')).toBe(2);
  });

  it('every purchase is saved at once, without waiting for the background save', async () => {
    const store = new MemoryProfileStore();
    const p = await fresh(store);
    winLevels(p, 1);
    addGold(p, CASTLE_TIERS[1].gold);
    buy(p, { kind: 'castle' }, W);
    // No await: flushSync wrote synchronously.
    expect(JSON.parse(store.entries.get(PROFILE_KEY)!).keep.castleTier).toBe(2);
  });
});

describe('equip (A1)', () => {
  it('a weapon keeps its tier after taking it off, wearing it again, a level change and a reload', async () => {
    const store = new MemoryProfileStore();
    const p = await fresh(store);
    completeTutorial(p, W);
    p.setWeaponTier('wheel', 3);
    expect(equip(p, 0, null, W)).toBe(true);
    expect(p.data.keep.loadout[0]).toBeNull();
    expect(p.weaponTier('wheel')).toBe(3);
    expect(equip(p, 0, 'wheel', W)).toBe(true);
    expect(p.weaponTier('wheel')).toBe(3);

    // A level is played and won: the run starts with the worn weapon at its tier.
    const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, { names: ['A'], fieldW: 1280, handTiers: [1] });
    expect(setup.start.loadout.slotWeapon[0]).toBe('wheel');
    expect(setup.start.loadout.weaponTier.wheel).toBe(3);
    CAMPAIGN.reward({ runId: setup.rules.runId, won: true, devRun: false, names: ['A'], day: 1, score: 1, kills: 1, stats: setup.start.stats }, setup.rules, p, 'solo');
    expect(p.weaponTier('wheel')).toBe(3);

    await p.flush();
    const again = await Profile.load(store);
    expect(again.weaponTier('wheel')).toBe(3);
    expect(again.data.keep.loadout[0]).toBe('wheel');
  });

  it('only an owned weapon of the slot’s role fits an open slot; it moves instead of being worn twice', async () => {
    const p = await fresh();
    completeTutorial(p, W);
    expect(equip(p, 1, 'wheel', W)).toBe(false); // wrong role
    expect(equip(p, 0, 'not-a-weapon', W)).toBe(false);
    expect(equip(p, 9, null, W)).toBe(false);
    const slow = slowWeapons[0];
    expect(slow).toBeDefined();
    p.setWeaponTier(slow.id, 2);
    expect(equip(p, 1, slow.id, W)).toBe(false); // slot 1 is not open yet
    winLevels(p, 20);
    expect(equip(p, 1, slow.id, W)).toBe(true);
    expect(p.data.keep.loadout[1]).toBe(slow.id);
    expect(p.data.keep.loadout.filter((id) => id === slow.id)).toHaveLength(1);
  });
});

describe('cheese (A2)', () => {
  it('builds the mask from the end of a level: win, gate above 50 % and 90 %, two challenges; nothing when lost', () => {
    expect(cheeseMask({ won: false, gateShare: 1, challenges: [true, true] })).toBe(0);
    expect(cheeseMask({ won: true, gateShare: 0.5 })).toBe(1);
    expect(cheeseMask({ won: true, gateShare: 0.6 })).toBe(3);
    expect(cheeseMask({ won: true, gateShare: 0.95, challenges: [true, true] })).toBe(31);
    expect(cheeseMask({ won: true, gateShare: 0.95, challenges: [false, true] })).toBe(23);
  });

  it('pays each of the five cheese of a level only once', async () => {
    const p = await fresh();
    expect(applyLevelCheese(p, W, 4, 0b00011)).toBe(2);
    expect(applyLevelCheese(p, W, 4, 0b00011)).toBe(0);
    expect(applyLevelCheese(p, W, 4, 0b00111)).toBe(1);
    expect(applyLevelCheese(p, W, 4, 0b11111)).toBe(2);
    expect(applyLevelCheese(p, W, 4, 0b11111)).toBe(0);
    expect(levelCheese(p, W, 4)).toBe(31);
    expect(p.data.wallet.cheese).toBe(5);
    expect(p.data.earned.cheese).toBe(5);
    expect(applyLevelCheese(p, W, 5, 0b11111)).toBe(CHEESE.perLevel);
    expect(p.data.earned.cheese).toBe(10);
  });

  it('earned cheese equals the set bits of all levels, even after spending', async () => {
    const p = await fresh();
    for (let l = 1; l <= 100; l++) applyLevelCheese(p, W, l, l % 32);
    let bits = 0;
    for (const mask of Object.values(p.data.worlds[W].cheese)) for (let b = 0; b < 5; b++) if (mask & (1 << b)) bits++;
    expect(p.data.earned.cheese).toBe(bits);
    expect(p.data.earned.cheese).toBeLessThanOrEqual(CHEESE.total);
  });

  it('a replayed campaign level pays no cheese twice', async () => {
    const p = await fresh();
    const env = { names: ['A'], fieldW: 1280, handTiers: [1] };
    for (let i = 0; i < 2; i++) {
      const setup = CAMPAIGN.buildRun(p, { world: W, level: 1 }, env);
      CAMPAIGN.reward({ runId: setup.rules.runId, won: true, devRun: false, names: ['A'], day: 1, score: 1, kills: 1, stats: setup.start.stats }, setup.rules, p, 'solo');
    }
    expect(p.data.wallet.cheese).toBe(1);
  });
});
