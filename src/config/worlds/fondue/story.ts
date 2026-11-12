/**
 * All story texts of the Fondue world: the King, the tutorial hints, the campaign lines, bosses, enemy popups, lobby remarks and the storybook.
 * Every text in this file can be changed freely; the game only reads it.
 */
import type { EnemyType } from '../../enemies';

/** The King who summoned the player and owns all the cheese. */
export const KING: { name: string; title: string } = {
  name: "King Fridolin the Gooey",
  title: "Keeper of All the Cheese",
};

/** What the King says in the prelude while the first raiders walk in. */
export const PRELUDE_LINES: string[] = [
  "The mice are after my fondue!",
  "Stop them, whoever you are!",
];

/** Short tutorial hints, at most eight words each. */
export const TUTORIAL_HINTS: {
  grab: string;
  fling: string;
  wellDone: string;
  cauldronMarket: string;
  cauldronThrow: string;
  lobbyWelcome: string;
} = {
  grab: "Grab a mouse knight and fling it up!",
  fling: "Swipe up fast and let go!",
  wellDone: "Splendid! The cheese is safe. Keep going!",
  cauldronMarket: "Throw mice in my cauldron: more cheese!",
  cauldronThrow: "Fling mice into the cauldron behind the castle.",
  lobbyWelcome: "Welcome inside my castle, dear helper!",
};

/** Names of the 100 campaign levels; index 0 is level 1. */
export const LEVEL_NAMES: string[] = [
  // Act 1: Meadow, summer. The mice are a joke.
  "Pot Helmets",
  "Downhill Wheel",
  "Kegs on the Road",
  "Crumbs at the Gate",
  "Summer Siege",
  "Sticky Situation",
  "Hoofbeats",
  "Meadow Muddle",
  "The Stampede",
  "Bigpot's Charge",
  // Act 2: up the canyon road. The mice get organised.
  "Thinking Caps",
  "Boing",
  "Up the Pass",
  "Pogo Party",
  "Canyon Echoes",
  "Forks Out",
  "Amber Bubbles",
  "Moonless Pass",
  "Falling Leaves",
  "The Big Keg",
  // Act 3: canyon into the marsh. Autumn rain.
  "Banners Up",
  "Keg Rain",
  "Pebble Storm",
  "Chilly Toes",
  "Last of the Canyon",
  "Into the Marsh",
  "Night Croak",
  "Cuckoo!",
  "Wheels in the Mud",
  "Horns at Dawn",
  // Act 4: marsh into the snow. It gets tight.
  "A Scout Squeaks",
  "Soggy Boots",
  "Eagle Eyes",
  "The Heavy Day",
  "Dragon Breath",
  "Marsh Gas Balloons",
  "Close Call",
  "Air Raid",
  "First Snow",
  "The Great Bubble",
  // Act 5: winter in Snowpine. The letter.
  "Counting Slowly",
  "A White Flag",
  "Sledge Charge",
  "Shadows in the Pines",
  "Thunder Peal",
  "Midnight Nibbles",
  "Darkest Night",
  "Snowed In",
  "Rumbling Ground",
  "Caravan of Carts",
  // Act 6: spring in the canyon. Crows join.
  "Thaw",
  "Black Feathers",
  "The Letter, Opened",
  "Spoon Thieves",
  "Spiky Welcome",
  "Day of Crows",
  "Lost Catapult",
  "Royal Sock",
  "Calling the Mountains",
  "Sky Admiral",
  // Act 7: summer marsh. The Yeti only wants cheese.
  "Giant Footprints",
  "Heavy Lifting",
  "Green Marsh",
  "Crossed-Out Reply",
  "The Sniffing Yeti",
  "Swamp Lanterns",
  "A Spoonful Offered",
  "Promises",
  "Big Sister",
  "Twice the Fur",
  // Act 8: back to the home meadow. Cracks in the King.
  "Campfire Songs",
  "The Spyglass",
  "Hop and Gallop",
  "Reed Rafts",
  "Leaving the Marsh",
  "Home Meadow",
  "Hay Bales",
  "A Crumb Dropped",
  "Whisker Whispers",
  "Night of Whispers",
  // Act 9: the tunnel and the count.
  "A Year of War",
  "Strange Silence",
  "The Tunnel",
  "Cellar Squeaks",
  "Lanterns Out",
  "Sticky Diggers",
  "Counting Wheels",
  "Crows Gathering",
  "Second Winter",
  "Wings Over Snowpine",
  // Act 10: everyone comes. The greatest fondue.
  "Everyone Comes",
  "The Old Letter",
  "Little Banners",
  "Hungry Yetis",
  "Everything at Once",
  "Quiet Snow",
  "Crumbtail's Horn",
  "Last Firewood",
  "The Extra Slice",
  "The Greatest Fondue",
];

/** One story sentence per level, shown on its victory screen; index 0 is level 1. */
export const LEVEL_STORY: string[] = [
  // Act 1
  "The mice wear soup pots as helmets, and the King finds it adorable.",
  "A stone wheel joins the wall, and the first mice learn that roads go downhill.",
  "Kegs that go boom: the mice are taking this more seriously than the King hoped.",
  "Every mouse you fling squeaks the same word on the way up: cheese!",
  "After a small feast, the King counted the cheese twice, just in case.",
  "A little fondue went on the road, and the King cried about the waste all evening.",
  "Goats from the high pastures joined the mice, and goats stop for nobody.",
  "The mice drew a battle plan in the dirt, then argued about it until sunset.",
  "A whole herd of goats charged at once, and the gate only creaked a little.",
  "Sir Hubert Bigpot came down very hard, and the mice went home to think.",
  // Act 2
  "The mice came back with maps, drums and a marching song, which is never good.",
  "Some mice have strapped springs to their boots and now bounce over their friends.",
  "Now the army marches up the canyon road, so the King unpacked his great-grandfather's alphorn.",
  "Nothing but bouncing bandits all day: the King got seasick just watching.",
  "In the canyon every squeak echoes, so the army sounds twice as big.",
  "You may borrow the King's giant fondue forks, as long as you promise to wash them.",
  "Hexers float in amber bubbles, and the King says that is cheating.",
  "They tried to sneak up the pass in the dark, but you heard their armour clank.",
  "The first autumn leaves fell, and the King ordered a bigger pot for winter.",
  "Old Barrelbelly is down, and the King has stopped calling the mice adorable.",
  // Act 3
  "The mice now march under a banner: a wheel of cheese with one small bite missing.",
  "So many kegs today that the canyon still smells of smoke and toasted whiskers.",
  "Slingers fire pebbles from far out: the King has a bump to prove it.",
  "Down from the attic came the Frost Horn, and the mice got very chilly toes.",
  "With the canyon cleared, the scouts report something worse on the way: rain.",
  "Rain turned the land into a marsh, and the marsh mice have joined the war.",
  "A night attack in the fog, and the frogs croaked for the wrong side.",
  "The King's old cuckoo clock now stops mice in their tracks, though it still runs late.",
  "Marsh rats built a siege cart, too heavy to lift, so you tapped it to splinters.",
  "Countess Hornhoof's goats scattered across the marsh, and a comet now waits at the shrine.",
  // Act 4
  "A captured scout squeaked that the army is led by Duchess Crumbtail herself.",
  "Everyone has soggy boots, and the King says royal socks are not for sharing.",
  "An eagle now watches from the new perch, and the mice keep looking up nervously.",
  "Siege cart after siege cart rolled out of the mist, and your tapping finger is sore.",
  "With a roar the Dragon Bellows woke, and the whole marsh smelled of toast.",
  "Balloons full of marsh gas: now the mice attack from the sky as well.",
  "The gate cracked today, and for one quiet moment the King stopped humming.",
  "Balloons filled the sky like cheese bubbles, and every single one came down.",
  "Winter came early, and mice in fur cloaks marched out of the snowy pines.",
  "Granny Bubblewick's great bubble finally burst, and the new Roof Bolter covers the whole sky.",
  // Act 5
  "Again the King counted his cheese, and for the first time he counted slowly.",
  "A mouse brought a letter under a white flag, and the King hid it unread.",
  "Goat riders came down the hill on sledges today, which is frankly unfair.",
  "Shades slip between the pines, and you can only catch them when they show.",
  "Lightning from the Storm Bell jumped from helmet to helmet across the forest.",
  "Someone nibbled the royal cheese in the night, and the King blames everyone except himself.",
  "The longest night of the year, full of Shades, and you did not blink once.",
  "The castle is snowed in, and the King now eats fondue for breakfast, lunch and supper.",
  "Deep rumbling shakes the ground, and scouts say the mice are building something big.",
  "The caravan lies in pieces, and a marmot with a crossbow has joined the tower.",
  // Act 6
  "Spring is here, and the army is back in the canyon, bigger than before.",
  "The mice made friends with the canyon crows, and a beaten Crowcaller comes back with wings.",
  "At last the King read the letter, went very quiet, and ordered more bread.",
  "Crows stole three spoons and the King's second-best crown today.",
  "Spikes now cover the gate, and the rats who knock on it wish they had not.",
  "So many crows that noon looked like midnight, and every one had to be caught twice.",
  "Up the pass the rats hauled a catapult, and it rolled all the way back.",
  "The King found a mouse hole in the cellar and stuffed it with a royal sock.",
  "Far up the mountains, the mice blew a horn, and something big blew back.",
  "Admiral Puffington landed in the river, and the Ember Beacon now makes every throw go boom.",
  // Act 7
  "A Yeti has joined the mice, and it is only here because they promised it cheese.",
  "Lifting a Yeti takes two hands, or one very strong one, and a lot of grunting.",
  "Summer turned the marsh green and buzzing, and the mice marched through it singing.",
  "Late into the night the King wrote a reply to the letter, crossing out every word.",
  "In the middle of the battle, the Yeti stopped to sniff the air near the kitchen.",
  "At night the marsh glowed with mouse lanterns, a hundred tiny lights on the move.",
  "The King held out one spoonful of fondue, and the Yeti almost changed sides.",
  "Still, the mice promised the Yeti a whole wheel, so it stayed with them, sighing.",
  "The Yeti went home for one day and came back with its sister.",
  "Both Yetis limped off with sore backsides, and the King's fondue now glows like gold.",
  // Act 8
  "By their campfires the mice sang sad songs tonight, and the King listened from the wall.",
  "Duchess Crumbtail was seen on the hill, watching you through a tiny spyglass.",
  "Only bouncers and riders today: the whole road went up and down like a drum.",
  "The marsh mice crossed on reed rafts, and the King admitted, quietly, that they are clever.",
  "Beaten in the marsh, the mice turn toward the meadow they call home.",
  "Back on the meadow where it all started, the mice fight harder than ever.",
  "Behind the hay bales the mice waited, then charged when the cuckoo stopped calling.",
  "The King dropped a crumb for a tired mouse, then said it was an accident.",
  "Rumours say the Shades are planning something for the darkest night of autumn.",
  "Whisper Whitewhisker vanished one last time, and you caught him the moment he reappeared.",
  // Act 9
  "A whole year of war, and the King's pot is still not full enough for him.",
  "Not one squeak all day, and quiet mice are always planning something.",
  "The mice dug a tunnel under the meadow, aiming straight for the cheese cellar.",
  "You heard squeaking under the floor, and the King hugged the biggest cheese wheel tightly.",
  "In the dark, the attack on the gate was only a trick to cover the digging.",
  "Into the tunnel went the leftover fondue, and the diggers came out very sticky.",
  "Counting the cheese, the King found that he had eaten more than the mice ever stole.",
  "Scouts report crows gathering in the north, more than anyone can count.",
  "Winter returned to the pines, and the whole sky over the forest turned black with wings.",
  "Lord Rookfeather fell twice, as crowcallers do, and his swarm flew home to roost.",
  // Act 10
  "Every mouse, rat, goat and crow in the land is marching toward the castle now.",
  "All night long the King sat reading the old letter, again and again.",
  "Across the snow, a thousand little banners flutter, each one with a bite missing.",
  "Back come the Yetis for the cheese they were promised, and they look hungry.",
  "Everything the army had came at once, and the gate is still standing, somehow.",
  "Snow fell softly, and both sides rested, too tired even to squeak.",
  "Duchess Crumbtail blew her horn, and every mouse in the land answered.",
  "Down to its last firewood, the castle keeps the fondue pot bubbling anyway.",
  "On the final night, the King cut one extra slice of bread and would not explain.",
  "The army is beaten, the fondue is perfect, and the Duchess got the extra slice.",
];

/** The boss of every tenth level: its name and one announcing line. */
export const BOSSES: Record<number, { name: string; line: string }> = {
  10: { name: "Sir Hubert Bigpot", line: "The biggest pot in the land, and a mouse under it." },
  20: { name: "Old Barrelbelly", line: "Old Barrelbelly hauls the biggest keg in the Alps, so shake hard." },
  30: { name: "Countess Hornhoof", line: "The Countess leads every goat in the valley, and she never brakes." },
  40: { name: "Granny Bubblewick", line: "Granny Bubblewick blows the biggest bubble you have ever seen." },
  50: { name: "The Rumble Caravan", line: "A whole train of siege carts: get your tapping finger ready." },
  60: { name: "Admiral Puffington", line: "Admiral Puffington commands the air fleet from the biggest balloon of all." },
  70: { name: "Flurry and Flake", line: "Two Yetis at once, and both of them smell the fondue." },
  80: { name: "Whisper Whitewhisker", line: "The biggest Shade of all comes out on the darkest night." },
  90: { name: "Lord Rookfeather", line: "Lord Rookfeather brings every crow in the north, then comes back himself." },
  100: { name: "Duchess Crumbtail", line: "Duchess Crumbtail herself leads the whole army in one last charge." },
};

/** The "New enemy" popup for each raider: what it does and how to beat it. */
export const ENEMY_POPUPS: Record<EnemyType, { title: string; text: string }> = {
  grunt: {
    title: "Pothelm",
    text: "A mouse knight with a pot for a helmet. Grab it and fling it high: what goes up comes down hard.",
  },
  bomber: {
    title: "Keg Hauler",
    text: "Keg Haulers throw bombs at the gate. Lift one and shake it until the keg drops off and blows up below.",
  },
  goatRider: {
    title: "Goat Rider",
    text: "Mice on goats charge fast. They are heavy and fly shorter, so grab them early and fling extra hard.",
  },
  pogo: {
    title: "Pogo Bandit",
    text: "Pogo Bandits bounce over the crowd on spring boots. Snatch them out of the air.",
  },
  hexer: {
    title: "Hexer",
    text: "A Hexer sits in an amber bubble you cannot grab. Wait for it to pop, then fling the Hexer.",
  },
  slinger: {
    title: "Slinger",
    text: "Slingers stop far out and pelt the gate with pebbles. Reach out, grab them and send them flying.",
  },
  siegeCart: {
    title: "Siege Cart",
    text: "Too heavy to lift! Tap a Siege Cart again and again until it falls apart.",
  },
  balloonist: {
    title: "Balloonist",
    text: "Balloonists float high and drop bombs on the gate. Grab one and pull it down hard.",
  },
  shade: {
    title: "Shade",
    text: "Shades fade in and out of sight. You can only grab one while you can see it.",
  },
  crowcaller: {
    title: "Crowcaller",
    text: "Beat a Crowcaller and it returns as a crow. Catch it a second time to finish the job.",
  },
  yeti: {
    title: "Yeti",
    text: "One normal hand can only drag a Yeti along. Lift it with two players, or with the strongest hand.",
  },
};

/** Remarks the King drops in the lobby; the level range is the highest level beaten. */
export const KING_LOBBY_LINES: { minLevel: number; maxLevel: number; text: string }[] = [
  // Always
  { minLevel: 0, maxLevel: 100, text: "Ah, fondue. The finest thing that ever happened in a pot." },
  { minLevel: 0, maxLevel: 100, text: "Stir clockwise. Always clockwise. Counterclockwise is how wars start." },
  { minLevel: 0, maxLevel: 100, text: "Do not touch the big wheel by the fire. It knows me." },
  { minLevel: 0, maxLevel: 100, text: "You fling mice beautifully. Has anyone ever told you that?" },
  { minLevel: 0, maxLevel: 100, text: "Gold is lovely, but have you ever smelled melted cheese at dawn?" },
  { minLevel: 0, maxLevel: 100, text: "A king needs three things: a crown, a castle and a very big pot." },
  { minLevel: 0, maxLevel: 100, text: "If you drop your bread in the pot, you owe me a song." },
  { minLevel: 0, maxLevel: 100, text: "I counted the cheese this morning. Then I counted it again. Twice." },
  { minLevel: 0, maxLevel: 100, text: "Wipe your feet. This castle smells of cheese, and I like it that way." },
  { minLevel: 0, maxLevel: 100, text: "Have you tried the bread? Of course not, you are busy. Fling on!" },
  // Early days: the mice are a joke
  { minLevel: 0, maxLevel: 15, text: "Mice in armour! Have you ever seen anything so silly?" },
  { minLevel: 0, maxLevel: 12, text: "They will give up by teatime. Mice always do." },
  { minLevel: 0, maxLevel: 20, text: "Do not worry about the gate. It is a very sturdy gate. Mostly." },
  { minLevel: 0, maxLevel: 10, text: "Where did you come from, anyway? Never mind. Fling more mice." },
  { minLevel: 1, maxLevel: 30, text: "Every mouse in the cauldron is one more piece of cheese. Splendid!" },
  { minLevel: 3, maxLevel: 25, text: "Those kegs go boom. Shake them loose before they reach my door." },
  { minLevel: 7, maxLevel: 30, text: "The goats are on their side now? Goats used to like me." },
  { minLevel: 10, maxLevel: 40, text: "I found my old spell book again. No reason. Just tidying." },
  { minLevel: 10, maxLevel: 100, text: "Every day you hold the gate, the pot gets fuller. Glorious." },
  { minLevel: 12, maxLevel: 35, text: "Bouncing mice. Next they will fly. Ha! Imagine that." },
  // Canyon and marsh: the mice get organised
  { minLevel: 15, maxLevel: 45, text: "The canyon echoes so nicely. Fondue! Fondue! Fondue! Lovely." },
  { minLevel: 15, maxLevel: 100, text: "You are the best helper I ever summoned. The only one, actually." },
  { minLevel: 16, maxLevel: 60, text: "Use the forks if you must, but bring them back clean." },
  { minLevel: 20, maxLevel: 60, text: "The Gate Mortar is older than the cheese. Treat it gently." },
  { minLevel: 20, maxLevel: 50, text: "Autumn already? The pot needs to be bigger. Much bigger." },
  { minLevel: 25, maxLevel: 50, text: "Rain, rain, rain. At least the fondue stays warm." },
  { minLevel: 28, maxLevel: 100, text: "The cuckoo clock was a gift. Nobody remembers who gave it." },
  { minLevel: 30, maxLevel: 60, text: "These mice are organised now. Who taught them to organise?" },
  { minLevel: 33, maxLevel: 100, text: "The eagle on the perch is not ours. It just likes the view." },
  { minLevel: 36, maxLevel: 55, text: "Balloons! I said it as a joke. Who listens to my jokes?" },
  // Winter: small cracks
  { minLevel: 37, maxLevel: 50, text: "The gate cracked. It is fine. Everything is fine. Pass the bread." },
  { minLevel: 40, maxLevel: 70, text: "Will we win? Do not answer. Have some cheese. A small piece." },
  { minLevel: 42, maxLevel: 52, text: "What letter? There is no letter. Stop looking at my boot." },
  { minLevel: 44, maxLevel: 70, text: "I keep a candle lit at night. Against the Shades, of course." },
  { minLevel: 45, maxLevel: 100, text: "The Storm Bell makes my hair stand up. More than usual." },
  { minLevel: 48, maxLevel: 70, text: "Fondue for breakfast again. A king must keep his strength up." },
  { minLevel: 50, maxLevel: 100, text: "The marmot asked for a raise. I paid him in compliments." },
  // Spring and summer: crows, the letter, the Yeti
  { minLevel: 52, maxLevel: 90, text: "A crow stole my spoon. My favourite spoon. This is now personal." },
  { minLevel: 53, maxLevel: 80, text: "The letter says the cheese was theirs first. Letters say all sorts of things." },
  { minLevel: 55, maxLevel: 100, text: "Hedgehogs make excellent door guards, as long as you never knock." },
  { minLevel: 58, maxLevel: 85, text: "I stuffed a mouse hole with a royal sock. A clean one. Mostly." },
  { minLevel: 61, maxLevel: 80, text: "A Yeti! The mice promised it cheese. My cheese! The cheek." },
  { minLevel: 62, maxLevel: 100, text: "Lift a Yeti together, or find a stronger hand. I believe in you." },
  { minLevel: 67, maxLevel: 90, text: "It almost took the spoon. Imagine a Yeti on our side!" },
  { minLevel: 70, maxLevel: 100, text: "The Golden Fondue shines so brightly. Almost as bright as my smile." },
  // Late: the King softens
  { minLevel: 72, maxLevel: 99, text: "That Duchess has a very fine spyglass. And very fine manners, I hear." },
  { minLevel: 75, maxLevel: 100, text: "You have been here so long. Do you miss home? Wherever that is." },
  { minLevel: 78, maxLevel: 100, text: "I did not give that mouse a crumb. It fell. Crumbs fall." },
  { minLevel: 83, maxLevel: 90, text: "Something is digging under the cellar. Fling faster, please!" },
  { minLevel: 87, maxLevel: 100, text: "I may have eaten a little more cheese than I counted. A little." },
  { minLevel: 90, maxLevel: 99, text: "We are close now. I can smell victory. Or the pot. Same thing." },
  { minLevel: 95, maxLevel: 99, text: "When this is over, I might set an extra place. Might." },
  // After the final battle
  { minLevel: 100, maxLevel: 100, text: "We won! The fondue is perfect. Thank you, my friend." },
  { minLevel: 100, maxLevel: 100, text: "The Duchess likes the crust at the bottom best. So do I. We share." },
  { minLevel: 100, maxLevel: 100, text: "Somewhere out there, another king is hungry. I can feel it in my spoon." },
];

/** Pages of the storybook in the lobby; a page opens once its level is beaten. */
export const STORYBOOK: { id: string; unlockLevel: number; title: string; text: string }[] = [
  {
    id: "king",
    unlockLevel: 0,
    title: "The King Who Loved Fondue",
    text:
      "Once upon a time, in a green valley high in the Alps, there lived King Fridolin the Gooey.\n\n" +
      "He had a castle, a crown and a very fine beard. But what he loved most in the whole world was fondue: a pot of melted cheese, a long fork and a cube of bread.\n\n" +
      "One summer he had a big idea. Perhaps the biggest idea a king ever had.",
  },
  {
    id: "cheese",
    unlockLevel: 1,
    title: "All the Land's Cheese",
    text:
      "The King wanted to make the greatest fondue of all time. For that, he needed cheese. All of it.\n\n" +
      "So his carts rolled into every village and every dairy. They took the round wheels and the square blocks, the young cheese and the old. They even took the little pieces hidden in mouse holes.\n\n" +
      "Soon the castle cellar was full to the ceiling, and the valley was empty.",
  },
  {
    id: "mice",
    unlockLevel: 5,
    title: "Knights with Whiskers",
    text:
      "The King had not thought about the mice. Nobody ever does.\n\n" +
      "The mice and rats of the valley had lived on those little pieces of cheese for a hundred winters. Now their holes were empty and their tummies were rumbling.\n\n" +
      "So they did something no mouse had ever done. They put pots on their heads, picked up spoons for swords and became knights. Their plan was simple: march to the castle and take the cheese back.",
  },
  {
    id: "summoned",
    unlockLevel: 10,
    title: "Whoever You Are",
    text:
      "Here is a secret the King has not told you.\n\n" +
      "The night before the first attack, he could not sleep. He climbed to the top of the tower with a dusty old spell book and read the longest spell in it, the one that calls a helper from very far away.\n\n" +
      "He wished for someone with a strong, quick hand. And then you were there.\n\n" +
      "He was too polite to ask where you came from. That is why he calls you 'whoever you are'.",
  },
  {
    id: "canyon",
    unlockLevel: 15,
    title: "Up the Canyon Road",
    text:
      "When the first army failed, the mice did not give up. They went home and thought very hard.\n\n" +
      "They asked the mountain goats for help, and the goats said yes, because goats love a good charge. They tied springs to their boots. They practised marching up the canyon road in step.\n\n" +
      "The King dusted off his great-grandfather's alphorn. 'They will stop soon,' he said. They did not stop.",
  },
  {
    id: "bangs",
    unlockLevel: 20,
    title: "Bubbles and Bangs",
    text:
      "Down in the canyon lived mice who knew old tricks. Some could blow bubbles of amber so hard that nothing could get through them. Others built kegs that went off with a bang.\n\n" +
      "The biggest keg of all belonged to Old Barrelbelly, a rat so round he rolled more than he walked.\n\n" +
      "When he fell, the King stopped laughing at the mice. He started counting his cheese instead, every evening, twice.",
  },
  {
    id: "marsh",
    unlockLevel: 26,
    title: "The Marsh Mice",
    text:
      "Then came the autumn rains, and the land before the castle turned into a marsh.\n\n" +
      "The marsh mice and the water rats had always kept to themselves. But they had lost their cheese too. They came out of the reeds with long lances and wooden carts so heavy that no hand could lift them.\n\n" +
      "Now the army had three parts: meadow, canyon and marsh. And all three wanted the same thing.",
  },
  {
    id: "duchess",
    unlockLevel: 31,
    title: "Duchess Crumbtail",
    text:
      "Every army has a leader, and this one was led by Duchess Crumbtail.\n\n" +
      "She was small, even for a mouse. She wore a thimble for a helmet and carried a darning needle for a sword. She was clever, she was brave, and she always said please and thank you, even in battle.\n\n" +
      "The King had heard of her. 'A duchess,' he grumbled. 'Of mice. Whatever next?'",
  },
  {
    id: "crack",
    unlockLevel: 37,
    title: "The Crack in the Gate",
    text:
      "One day, in the middle of the marsh war, the gate cracked. It was only a small crack, but everyone heard it.\n\n" +
      "That evening the King did not hum while he stirred the pot. He stood at the window for a long time, looking at the little campfires of the mouse army.\n\n" +
      "'They are very many,' he said quietly. Then he cut himself an extra big piece of bread, and felt a little better.",
  },
  {
    id: "letter",
    unlockLevel: 42,
    title: "The Letter in the Boot",
    text:
      "In the first snow of winter, a mouse walked up to the gate waving a white handkerchief. She carried a letter, sealed with a drop of wax.\n\n" +
      "The King took the letter, bowed politely, and closed the gate.\n\n" +
      "He did not open it. He did not burn it either. He folded it very small and hid it in his left boot, where it stayed for a long, long time.",
  },
  {
    id: "winter",
    unlockLevel: 46,
    title: "A Winter Indoors",
    text:
      "Winter in the pine forest was long and dark. Snow piled up to the windows, and strange mice called Shades slipped between the trees, there one moment and gone the next.\n\n" +
      "The King stayed inside by the pot. Fondue for breakfast, fondue for lunch, fondue for supper.\n\n" +
      "Somehow the cheese in the cellar kept getting smaller. The King blamed the mice. The mice, for once, were not to blame.",
  },
  {
    id: "letterRead",
    unlockLevel: 53,
    title: "What the Letter Said",
    text:
      "In spring, the King finally pulled the letter out of his boot. It was a bit smelly, but still readable.\n\n" +
      "'Dear King,' it said. 'The cheese you took was our winter store. We have no other food. Please give back what you do not need. Yours politely, Duchess Crumbtail.'\n\n" +
      "The King read it three times. Then he folded it again and put it in his pocket, closer to his heart than his boot.",
  },
  {
    id: "crows",
    unlockLevel: 56,
    title: "Friends with Feathers",
    text:
      "The crows of the canyon had never liked the King. He once chased them out of his cherry trees.\n\n" +
      "So when the mice offered to share their last crumbs with them, the crows joined the army. Some mice learned to call them with a whistle. If you beat such a Crowcaller, a crow flies back in its place.\n\n" +
      "The crows also stole spoons. Nobody had asked them to. They just liked it.",
  },
  {
    id: "yeti",
    unlockLevel: 61,
    title: "The Yeti Who Wanted Cheese",
    text:
      "High above the snowline lives the Yeti. It is enormous, shaggy and gentle, and it has one weakness: cheese.\n\n" +
      "The mice climbed all the way up and made it a promise. 'Help us,' they said, 'and you will get a whole wheel.'\n\n" +
      "The Yeti does not care about kings or castles. It does not even care about winning. It just wants that wheel, and maybe a little bread.",
  },
  {
    id: "spoonful",
    unlockLevel: 67,
    title: "One Spoonful",
    text:
      "In the middle of a battle, the Yeti stopped and sniffed. The smell of the King's fondue drifted over the wall.\n\n" +
      "The King had an idea. He leaned out of a window and held out one single spoonful.\n\n" +
      "The Yeti came closer. It looked at the spoon. It looked back at the mice. For a long moment, nobody moved.\n\n" +
      "Then it remembered its promise, sighed a very big sigh, and walked back to its friends.",
  },
  {
    id: "spyglass",
    unlockLevel: 72,
    title: "The Spyglass",
    text:
      "Duchess Crumbtail watched every battle from the hill, through a tiny brass spyglass.\n\n" +
      "She did not watch the King. She watched you. She saw how you flung her knights high but never meanly, and how they always limped home in the evening, grumbling but whole.\n\n" +
      "'That helper is not wicked,' she told her captains. 'Just on the wrong side of the gate. For now.'",
  },
  {
    id: "crumb",
    unlockLevel: 78,
    title: "A Crumb by Accident",
    text:
      "Back on the home meadow, a young mouse knight sat down by the gate, too tired to march another step.\n\n" +
      "The King saw him from the wall. He looked left. He looked right. Then a crumb of cheese fell from his hand, right in front of the mouse.\n\n" +
      "'An accident,' the King told everyone. 'Crumbs fall.' But he was smiling a little, and he did not know why.",
  },
  {
    id: "tunnel",
    unlockLevel: 83,
    title: "The Tunnel",
    text:
      "The mice had learned that the gate was too strong. So Duchess Crumbtail tried something new: she dug.\n\n" +
      "While the army made noise at the front, the diggers tunnelled under the meadow, straight toward the cheese cellar.\n\n" +
      "The King heard squeaking under his feet. In a panic, he poured leftover fondue into the tunnel. The diggers came out sticky, cross and smelling wonderful.",
  },
  {
    id: "count",
    unlockLevel: 87,
    title: "The Count",
    text:
      "After the tunnel, the King decided to count every piece of cheese in the cellar. It took three days.\n\n" +
      "When he was done, he sat down on a wheel and did the sums again.\n\n" +
      "The mice had taken a few crumbs. The King himself, nibbling a little here and a little there, had eaten forty wheels.\n\n" +
      "He did not tell anyone. But he did stop nibbling. Mostly.",
  },
  {
    id: "everyone",
    unlockLevel: 91,
    title: "Everyone Comes",
    text:
      "The second winter came to the pine forest, and with it came everyone.\n\n" +
      "Meadow mice and canyon mice, marsh rats and Shades, goats and crows, and two Yetis who still had not got their wheel. Duchess Crumbtail had called them all for the last great charge.\n\n" +
      "The King stood next to you on the wall. 'Whatever happens,' he said, 'thank you for coming, whoever you are.'",
  },
  {
    id: "fondue",
    unlockLevel: 100,
    title: "The Greatest Fondue",
    text:
      "The last charge broke against the gate, and the army sat down in the snow, tired and beaten.\n\n" +
      "That evening, the greatest fondue of all time bubbled in the castle. The King took the first bite and closed his eyes. It was perfect.\n\n" +
      "Then he opened the gate. He set an extra place for Duchess Crumbtail and cut her the extra slice of bread. Outside, the Yetis finally got their wheel.\n\n" +
      "Some say he gave the valley some cheese back. Not all of it. But some.",
  },
  {
    id: "elsewhere",
    unlockLevel: 100,
    title: "Another Kingdom",
    text:
      "And you? Your work here was done. The spell that brought you began to fade, as old spells do.\n\n" +
      "But far away, in another land, another king sat by a cold window. He had collected every piece of his own favourite food, and now someone wanted it back.\n\n" +
      "He opened a dusty book and began to read a very long spell.\n\n" +
      "Somewhere, a helper was about to be called.",
  },
];
