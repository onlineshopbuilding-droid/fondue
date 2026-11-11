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
  /**
   * The Great Cauldron stands behind the road on a small mound beside the keep. Raiders only get in
   * when thrown: x and rimY are the middle of its rim, snapRadius catches what is let go or flies
   * close by, and a throw headed for it within assistRadius is bent into it.
   */
  cauldron: { x: 318, rimY: 468, snapRadius: 92, assistRadius: 190, headingCos: 0.6 },
  /** The hook hangs from the top edge, this far left of the field's right end. x is for the base width. */
  perch: { x: 1110, insetRight: 170, hookY: 262, snapRadius: 104, flySnapRadius: 66, assistRadius: 170, headingCos: 0.9 },
  /** A press on the keep may reach this far right of it, never onto the road in front of the gate. */
  slotZoneMaxX: 183,
  /** Radius of a weapon's grip zone in world units, widened on small screens. */
  slotHitRadius: 52,
} as const;

/**
 * Field width. The host's screen decides it at the start of a game and both players get the same
 * field. Enemies walk faster on a wider field, so that a wide phone gains no breathing room. They
 * make up only part of the extra distance: at full compensation, fast raiders on a wide field were
 * so much harder to hit that the balance bots lost a third of their days (docs/balance.md).
 */
export const FIELD = {
  min: 1280,
  max: 1760,
  /** Enemies start this far beyond the wall and hurry onto the field, out of everyone's sight. */
  offstageRun: 260,
  offstageSpeed: 1200,
  /** 0: the same speed on every field. 1: the same walking time to the gate on every field. */
  speedCompensation: 0.5,
};

/** Right-hand wall of a field. */
export const fieldWall = (fieldW: number) => fieldW + 5;
/** Where enemies step onto a field. */
export const fieldEntry = (fieldW: number) => fieldW + 50;
/** Field width for a screen of this aspect ratio. */
export const fieldForAspect = (aspect: number) => Math.round(Math.max(FIELD.min, Math.min(FIELD.max, WORLD.height * aspect)));
/** X of the eagle hook on a field. */
export const perchX = (fieldW: number) => fieldW - WORLD.perch.insetRight;
/** How much faster raiders walk on this field than on the base width. */
export const fieldSpeedFactor = (fieldW: number) => 1 + ((fieldEntry(fieldW) - WORLD.gateX) / (fieldEntry(WORLD.width) - WORLD.gateX) - 1) * FIELD.speedCompensation;

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/** Figures are drawn this much larger than their art, and enemy sizes in config already include it. */
export const CHAR_SCALE = 1.18;
