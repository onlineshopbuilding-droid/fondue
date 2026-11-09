/** Fixed world geometry. The keep stands on the left, raiders come from the right. */
export const WORLD = {
  width: 1280,
  height: 720,
  /** Feet line of the back-most lane. Lanes add a small offset for depth. */
  groundY: 610,
  /** X of the gate's outer face. */
  gateX: 185,
  /** Enemies appear here. */
  spawnX: 1330,
  /** Thrown enemies bounce off an invisible wall here. */
  rightWallX: 1285,
  /** Depth lanes: pixels added to groundY. */
  laneMin: 0,
  laneMax: 44,
  cauldron: { x: 345, halfWidth: 58 },
  perch: { x: 505, hookY: 490, snapRadius: 90 },
  roof: { x: 95, y: 250 },
} as const;

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/** Figures are drawn this much larger than their art, and enemy sizes in config already include it. */
export const CHAR_SCALE = 1.18;
