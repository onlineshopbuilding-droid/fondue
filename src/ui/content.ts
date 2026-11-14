/** Text-only screens, kept apart from the UI logic so they are easy to edit. */
import { firesOnItsOwn, type WeaponDef } from '../config/weapons';

export interface HelpSlide {
  title: string;
  icon: string;
  text: string;
}

export const HELP_SLIDES: HelpSlide[] = [
  { title: 'Hold the gate', icon: 'king', text: 'The mice and rats of the valley want the King’s cheese back. Their knights march down the road toward his gate. Reach in with your finger and stop them.' },
  { title: 'Grab and fling', icon: 'handClosed', text: 'Touch a raider to grab it. Swipe up fast and let go to throw it. It is beaten when it lands hard, so a quick flick skyward is enough.' },
  { title: 'Heavy raiders', icon: 'dust', text: 'Heavy raiders fly shorter for the same swipe. A Yeti needs a hand of tier 4, or two hands lifting together. Lift a raider high and just let go: the fall does the rest.' },
  { title: 'Keg Haulers', icon: 'bomb', text: 'Lift a Keg Hauler and shake it a few times. The keg comes loose, falls and bursts on the raiders below.' },
  { title: 'Waves', icon: 'iconComet', text: 'A level is one fight in waves: a few raiders, a short breath, then more. Win when every wave is beaten. If the gate falls, the level is lost, but the gold you earned stays yours.' },
  { title: 'Weapons and slots', icon: 'iconCastle', text: 'The keep has five slots: Damage, Slow, Gate, Support and Passive. Tap a weapon to fire it; it picks its own target. Passive weapons fire on their own. A ring shows the reload.' },
  { title: 'Cheese', icon: 'cheese', text: 'Every level has five cheese: win it, keep the gate above half, keep it above 90 %, and beat its two challenges. Each cheese counts once. Cheese unlocks new weapons and stations.' },
  { title: 'Gold and the Keep Shop', icon: 'coin', text: 'Gold from every level and endless run is yours to keep. Spend it in the Keep Shop on weapon tiers, the castle and your hand. Everything you build stays for every level.' },
  { title: 'Tier 7 and Raider Crests', icon: 'perchHook', text: 'Late in the campaign the Eagle Perch opens. Fling a raider onto its hook and the eagle leaves a Raider Crest. Every tier 7 needs crests on top of gold.' },
  { title: 'Endless', icon: 'iconStomper', text: 'Once all five slots are yours, endless opens: wave after wave with your own keep. No cheese there, but plenty of gold. How long can you hold?' },
  { title: 'Know your enemy', icon: 'iconFrost', text: 'Tap Siege Carts again and again. Hexers are untouchable while their bubble is up. Every new raider is explained the first time it shows up.' },
];

/** Shown once per profile when the cauldron or the hook first stands on the keep. */
export const STATION_TIPS: Record<string, string> = {
  cauldron: 'The Great Cauldron stands behind the keep. Throw a raider into it: it pays double gold.',
  perch: 'Fling a raider onto the hook in the top right. Aim well: the eagle leaves a Raider Crest.',
};

/**
 * Shown once per profile when a weapon first stands in a slot. It says how the weapon fires:
 * tapped (Damage, Slow, Gate, Support), on its own (passive weapons), or on its own with a tap for
 * a burst (the Marmot Sentry).
 */
export const weaponTip = (def: Pick<WeaponDef, 'name' | 'slot' | 'kind'>): string => {
  if (firesOnItsOwn(def as WeaponDef)) return `${def.name} is on the keep. It fires on its own, no tap needed.`;
  if (def.slot === 'passive') return `${def.name} is on the keep. It fires on its own; tap it for a quick burst.`;
  return `${def.name} is on the keep. Just tap it to fire.`;
};

/** Shown once per profile at the start of the first fight. */
export const FIRST_FIGHT_TIP = 'Hold the gate until the last wave is beaten. Gold you earn stays yours for the Keep Shop.';

export const LOADING_TIPS: string[] = [
  'A flick does not need to be big. It needs to be quick.',
  'Between two waves there is a short breath. Use it to get ready.',
  'The cauldron can only melt one raider at a time.',
  'Keep the gate above 90 % for an extra cheese.',
  'A bomb in the air can be caught and thrown back.',
  'Lift a Keg Hauler over a crowd and shake it: the keg falls and bursts below.',
  'Frozen raiders can be picked up too.',
  'Weapons recharge for everyone at once. Agree who fires.',
  'Heavy raiders fly shorter. A stronger hand from the Keep Shop helps.',
  'Weapons recharge on their own. Tap them often.',
  'Stuck on a level? Play it again or go endless: the gold stays yours.',
  'Each level has two challenges. Their cheese is worth coming back for.',
  'Swap weapons on the level card before you tap Play.',
];

export const CREDITS_HTML = `
<h3>Made by</h3>
<p>Tim &amp; Lenny, built with Claude Code</p>
<h3>Art, music and sound</h3>
<p>Original, drawn and synthesised in code for this game.</p>
<h3>Fonts</h3>
<p>Lilita One by Juan Montoreano (SIL OFL 1.1)<br>Nunito by Vernon Adams and contributors (SIL OFL 1.1)</p>
<h3>Libraries</h3>
<p>Phaser (MIT), PeerJS (MIT), ws (MIT), Vite (MIT), TypeScript (Apache 2.0), Vitest (MIT), Playwright (Apache 2.0)</p>
`;
