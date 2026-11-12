/**
 * Timing of the lobby, the hall inside the keep: the camera move between the battlefield and the
 * hall, and how long things stay up there. Read by src/render/lobby/dive.ts and lobbyScene.ts.
 */
export const LOBBY_MOVE = {
  /** Seconds of the whole move, in or out. */
  seconds: 0.9,
  /** At the end of the dive the view is this fraction of its normal width (the gate fills the screen). */
  diveEnd: 0.09,
  /** The dive into the gate takes this first share of the move. */
  diveShare: 0.8,
  /** The hall fades in from this point of the move, over this share of it. */
  fadeFrom: 0.45,
  fadeShare: 0.4,
};

export const LOBBY_HALL = {
  /** How much closer the hall starts when it fades in (and ends when it fades out). */
  arriveZoom: 0.22,
  /** Seconds a remark of the King stays up. */
  lineSeconds: 5.5,
  /** Milliseconds of the little animations: the speech bubble popping up, the King's nod, a tapped station's bounce. */
  bubblePopMs: 180,
  kingNodMs: 90,
  stationBounceMs: 80,
};
