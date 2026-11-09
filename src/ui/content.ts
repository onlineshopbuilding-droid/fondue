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
  { title: 'Offerings', icon: 'cauldronBack', text: 'Gold buys upgrades at the Market between days. Buy the Great Cauldron and drop raiders into it, or buy the Eagle Perch and hang them on the hook. Each one earns an offering, which the best upgrades cost.' },
  { title: 'Wheels and Stompers', icon: 'iconStomper', text: 'Tap a weapon icon, or press 1 to 5 on a keyboard. A Wheel rolls at once. For a Stomper, tap its icon, then press where it should land and let go.' },
  { title: 'Comets', icon: 'iconComet', text: 'Tap the icon and the comet is in your hand. Press, swing it around, let go. The more you swing, the bigger the blast.' },
  { title: 'Gate Arms', icon: 'iconFrost', text: 'Tap the icon, press and move to aim, let go to fire. A tap on a frozen raider shatters it. Tap the icon again to put a weapon away.' },
  { title: 'Know your enemy', icon: 'iconCastle', text: 'Tap Keg Haulers quickly to make them drop the keg. Tap Siege Carts again and again. Hexers are untouchable while their bubble is up. A Yeti needs two hands.' },
];

export const LOADING_TIPS: string[] = [
  'A flick does not need to be big. It needs to be quick.',
  'Offerings early on pay for the great upgrades later.',
  'A bomb in the air can be caught and thrown back.',
  'Throw a Keg Hauler into a crowd and watch.',
  'Frozen raiders can be picked up too.',
  'Weapons recharge for everyone at once. Agree who fires.',
  'Swing a comet before you let go.',
  'Mortar shells take a moment to land. Aim ahead of fast raiders.',
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
