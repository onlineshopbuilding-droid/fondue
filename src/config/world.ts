/** Fixed world geometry. The keep stands at the left edge, raiders come from the right. */
export const WORLD = {
  /** Field width of a 16:9 screen; the real width is decided per game, see FIELD. */
  width: 1280,
  height: 720,
  /** Feet line of the back-most lane. Lanes add a small offset for depth. */
  groundY: 610,
  /** X of the gate's outer face. */
  gateX: 185,
  /** Enemies appear here on a field of the base width. */
  spawnX: 1330,
  /** Thrown enemies bounce off an invisible wall here on a field of the base width. */
  rightWallX: 1285,
  /** Depth lanes: pixels added to groundY. */
  laneMin: 0,
  laneMax: 44,
  /** The pot on the road (experiment "in front"). */
  cauldron: { x: 345, halfWidth: 58 },
  /** The pot on the keep (experiment "behind"): where its rim is, and how far it pulls things in. */
  cauldronBack: { x: 290, rimY: 456, snapRadius: 92, assistRadius: 190 },
  /** The hook hangs from the top edge, this far left of the field's right end. x is for the base width. */
  perch: { x: 1110, insetRight: 170, hookY: 262, snapRadius: 104 },
  /** Where each weapon sits on the keep: centre of its art, aim origin, centre of its grip zone. */
  slots: {
    comet: { x: 46, y: 282 },
    bolter: { x: 136, y: 272 },
    stomper: { x: 46, y: 392 },
    horn: { x: 146, y: 410 },
    wheel: { x: 52, y: 590 },
  },
  /** A press on the keep may reach this far right of it, never onto the road in front of the gate. */
  slotZoneMaxX: 183,
  /** Radius of a weapon's grip zone in world units, widened on small screens. */
  slotHitRadius: 52,
} as const;

/**
 * Field width. The host's screen decides it at the start of a game and both players get the same
 * field. Enemies walk proportionally faster on a wider field, so the walk to the gate takes the
 * same time everywhere and a wide phone gains no breathing room.
 */
export const FIELD = {
  min: 1280,
  max: 1760,
  /** Enemies start this far beyond the wall and hurry onto the field, out of everyone's sight. */
  offstageRun: 260,
  offstageSpeed: 1200,
};

/** Right-hand wall of a field. */
export const fieldWall = (fieldW: number) => fieldW + 5;
/** Where enemies step onto a field. */
export const fieldEntry = (fieldW: number) => fieldW + 50;
/** Field width for a screen of this aspect ratio. */
export const fieldForAspect = (aspect: number) => Math.round(Math.max(FIELD.min, Math.min(FIELD.max, WORLD.height * aspect)));
/** X of the eagle hook on a field. */
export const perchX = (fieldW: number) => fieldW - WORLD.perch.insetRight;
/** Keeps the time from the field's edge to the gate the same on every field width. */
export const fieldSpeedFactor = (fieldW: number) => (fieldEntry(fieldW) - WORLD.gateX) / (fieldEntry(WORLD.width) - WORLD.gateX);

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/** Figures are drawn this much larger than their art, and enemy sizes in config already include it. */
export const CHAR_SCALE = 1.18;
