/**
 * How many castle tiers the art has, and how a tier (1 to 7, the castle = the gate) maps onto the
 * asset names. Tier N is drawn by `prop:keep<N-1>`, `prop:keepGlow<N-1>`, `prop:gate<N-1>`,
 * `prop:keepWest<N-1>` and `prop:keepWeather_snowpine_<N-1>`; the names start at 0 so that a
 * replacement picture made for an older build stage keeps its name (docs/GRAFIK-AUSTAUSCHEN.md).
 */
export const CASTLE_ART_TIERS = 7;

/** Clamps any tier number to 1..CASTLE_ART_TIERS (non-numbers count as tier 1). */
export function clampCastleTier(tier: number): number {
  if (!Number.isFinite(tier)) return 1;
  return Math.max(1, Math.min(CASTLE_ART_TIERS, Math.round(tier)));
}

/** Index of a tier's pictures in the asset names (0 to 6). */
export const castleArtIndex = (tier: number) => clampCastleTier(tier) - 1;
