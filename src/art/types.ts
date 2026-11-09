/**
 * Art is plain SVG text kept in TypeScript modules. At boot every piece is rasterised once into a
 * texture, so the game never draws live SVG. To replace a figure, edit or swap its module.
 */
export interface Art {
  /** Complete <svg ...>...</svg> markup with explicit width, height and viewBox. */
  svg: string;
  /** Size in world pixels. */
  w: number;
  h: number;
  /** Rotation pivot in art pixels, measured from the top-left. */
  px: number;
  py: number;
}

export type Anim =
  | 'body' // bobs with the walk cycle
  | 'head' // bobs, tilts while held
  | 'legFront' | 'legBack' // swing in opposite phase
  | 'armFront' | 'armBack' // swing; flail while held
  | 'static' // only follows the root
  | 'spin'; // constantly rotates (e.g. a balloon's propeller)

export interface RigPart {
  /** Name unique within the rig. */
  name: string;
  art: Art;
  /** Joint position relative to the feet origin; x to the right, y up is negative. */
  x: number;
  y: number;
  anim: Anim;
}

/** Characters face LEFT in their art, because they walk toward the keep on the left. */
export interface CharacterRig {
  /** Drawn in array order: first is furthest back. */
  parts: RigPart[];
}

export function svg(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}
