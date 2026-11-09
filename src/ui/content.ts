/** Text-only screens, kept apart from the UI logic so they are easy to edit. */
export interface HelpSlide {
  title: string;
  icon: string;
  text: string;
}

export const HELP_SLIDES: HelpSlide[] = [
  { title: 'You are the hand', icon: 'handOpen', text: 'The raiders come down the road toward your gate. Reach in with your mouse or finger. No hero, no army, just your hand.' },
  { title: 'Grab and fling', icon: 'handClosed', text: 'Press on a raider to grab it. Swipe fast and let go to throw it. It dies when it lands hard, so a good flick skyward is enough.' },
  { title: 'Drop', icon: 'dust', text: 'Lift a raider well above the road and simply let go. A short drop only dazes it for a second.' },
  { title: 'Offerings', icon: 'cauldronBack', text: 'Gold buys upgrades at the Market between days. Throw raiders into the Great Cauldron and they melt into cheese, or fling them onto the Eagle Perch in the top right. Each one earns an offering, which the best upgrades cost.' },
  { title: 'Your keep', icon: 'iconCastle', text: 'Every weapon you buy is built into the keep, and every new gate makes the whole keep grow. A ring around a weapon shows it reloading. When the ring is gone, it is ready.' },
  { title: 'Wheels and Stompers', icon: 'iconStomper', text: 'Tap the Wheel at the foot of the wall and it rolls at once. Tap the Stomper on the wall, then tap where it should land.' },
  { title: 'Comets', icon: 'iconComet', text: 'Tap the shrine on the keep, then tap the spot on the road. The comet falls from the sky right there.' },
  { title: 'Aiming', icon: 'iconFrost', text: 'Crossbow and Gate Arms work like a sling. Press on the weapon, pull away from it towards the raiders, and let go. The dotted line shows where it goes. Pull further to shoot further, or move back to the weapon to cancel.' },
  { title: 'Know your enemy', icon: 'iconCastle', text: 'Tap Keg Haulers quickly to make them drop the keg. Tap Siege Carts again and again. Hexers are untouchable while their bubble is up. A Yeti needs two hands.' },
];

/** Shown once when a weapon first stands on the keep. */
export const WEAPON_TIPS: Record<string, string> = {
  wheel: 'Your Wheel waits at the foot of the wall. Tap it and it rolls.',
  stomper: 'Tap the Stomper on the wall, then tap where it should land.',
  comet: 'Tap the shrine on the keep, then tap the road to call the comet.',
  bolter: 'Press the crossbow on the tower, pull towards the raiders and let go.',
  horn: 'Press the weapon over the gate, pull away from it and let go.',
};

export const LOADING_TIPS: string[] = [
  'A flick does not need to be big. It needs to be quick.',
  'When the sun sets no more raiders come, but the ones on the road fight to the end.',
  'The cauldron can only melt one raider at a time.',
  'Offerings early on pay for the great upgrades later.',
  'A bomb in the air can be caught and thrown back.',
  'Throw a Keg Hauler into a crowd and watch.',
  'Frozen raiders can be picked up too.',
  'Weapons recharge for everyone at once. Agree who fires.',
  'Pull a crossbow further and its bolts fly faster and hit harder.',
  'Mortar shells fly high and land late. Aim ahead of fast raiders.',
  'Weapons recharge on their own. Use them often.',
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
