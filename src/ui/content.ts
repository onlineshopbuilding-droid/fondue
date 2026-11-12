/** Text-only screens, kept apart from the UI logic so they are easy to edit. */
export interface HelpSlide {
  title: string;
  icon: string;
  text: string;
}

export const HELP_SLIDES: HelpSlide[] = [
  { title: 'Hold the gate', icon: 'king', text: 'The mice and rats of the valley want the King\'s cheese back. Their knights march down the road toward his gate. Reach in with your finger and stop them.' },
  { title: 'Grab and fling', icon: 'handClosed', text: 'Touch a raider to grab it. Swipe up fast and let go to throw it. It is beaten when it lands hard, so a quick flick skyward is enough.' },
  { title: 'Heavy raiders', icon: 'dust', text: 'Heavy raiders fly shorter for the same swipe. A Yeti needs two players lifting together, or a hand of tier 3. Lift a raider high and just let go: the fall does the rest.' },
  { title: 'Keg Haulers', icon: 'bomb', text: 'Lift a Keg Hauler and shake it a few times. The keg comes loose, falls and bursts on the raiders below.' },
  { title: 'Offerings', icon: 'cauldronBack', text: 'Between days the market opens at the keep: tap a place on it to buy there with gold. Throw raiders into the Great Cauldron behind the keep and they melt into cheese, or fling them onto the Eagle Perch in the top right. Each one pays an offering.' },
  { title: 'Weapons', icon: 'iconCastle', text: 'Weapons sit in five slots on the keep. Just tap a weapon to fire it; it picks its own target. A ring shows it reloading. When the ring is gone, it is ready.' },
  { title: 'Campaign', icon: 'iconComet', text: 'One hundred levels, each a few days long. Every level starts fresh with an oak gate and empty slots. Win the last day to earn stars and unlock new weapons and slots.' },
  { title: 'Stars and the armoury', icon: 'star', text: 'Spend stars in the armoury. Weapon tiers and a stronger hand stay with you for every later level. In a level you only buy the weapon into its slot.' },
  { title: 'Endless', icon: 'iconStomper', text: 'No last day. Every weapon starts on tier 1 and you upgrade it with gold and offerings along the way. How long can you hold?' },
  { title: 'Know your enemy', icon: 'iconFrost', text: 'Tap Siege Carts again and again. Hexers are untouchable while their bubble is up. Every new raider is explained the first time it shows up.' },
];

/** Shown once per profile when the cauldron or the hook first stands on the keep. */
export const STATION_TIPS: Record<string, string> = {
  cauldron: 'The Great Cauldron stands behind the keep. Throw raiders into it: each one melts into cheese for an offering.',
  perch: 'Fling a raider onto the hook in the top right, or carry it there. The eagle pays an offering.',
};

/** Shown once per profile when a weapon first stands in a slot. */
export const weaponTip = (name: string) => `${name} is on the keep. Just tap it to fire.`;

/** Shown once per profile at the start of the first fight. */
export const FIRST_FIGHT_TIP = 'Hold the gate until the sun has set and the last raider is gone. Gold buys things in the market between days.';

export const LOADING_TIPS: string[] = [
  'A flick does not need to be big. It needs to be quick.',
  'When the sun sets no more raiders come, but the ones on the road fight to the end.',
  'The cauldron can only melt one raider at a time.',
  'Offerings early on pay for the great things later.',
  'A bomb in the air can be caught and thrown back.',
  'Lift a Keg Hauler over a crowd and shake it: the keg falls and bursts below.',
  'Frozen raiders can be picked up too.',
  'Weapons recharge for everyone at once. Agree who fires.',
  'Heavy raiders fly shorter. A stronger hand from the armoury helps.',
  'Weapons recharge on their own. Tap them often.',
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
