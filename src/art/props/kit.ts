/**
 * Small drawing helpers for free-floating props: padded boxes, circle and arc paths, crescent shading, rivets, twinkles.
 * Free-floating pieces keep a clean margin to the edge of their box; the light comes from the upper left.
 */
import { INK, IRONL, WHITE, centred } from '../draw';
import * as sh from '../shade';

/** Centred art in a box `padX`/`padY` larger on each side: same drawn size and centre, clean margin. */
export const fxPad = (w: number, h: number, padX: number, padY: number, b: string) =>
  centred(w + padX * 2, h + padY * 2, `<g transform="translate(${padX} ${padY})">${b}</g>`);
export const fxCirc = (cx: number, cy: number, rad: number) =>
  `M${cx - rad} ${cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
export const fxEll = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
export const fxRect = (x: number, y: number, w: number, h: number, rad: number) =>
  `M${x + rad} ${y}H${x + w - rad}A${rad} ${rad} 0 0 1 ${x + w} ${y + rad}V${y + h - rad}A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h}` +
  `H${x + rad}A${rad} ${rad} 0 0 1 ${x} ${y + h - rad}V${y + rad}A${rad} ${rad} 0 0 1 ${x + rad} ${y}Z`;
/** Point on a circle, for rings of joints, rivets and ticks. */
export const fxAt = (cx: number, cy: number, rad: number, a: number) => `${sh.r1(cx + Math.cos(a) * rad)} ${sh.r1(cy + Math.sin(a) * rad)}`;
/** Arc along a circle from angle a0 to a1 (radians, clockwise). */
export const fxArc = (cx: number, cy: number, rad: number, a0: number, a1: number) =>
  `M${fxAt(cx, cy, rad, a0)}A${rad} ${rad} 0 0 1 ${fxAt(cx, cy, rad, a1)}`;
/** Crescent shading for a group of plain shapes that merge into one form, like `blob`. */
export const fxShade = (shapes: string, dx: number, dy: number, fill: string, o = 1) => {
  const id = sh.uid('fm');
  return (
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000">` +
    `<g fill="#fff" stroke="none">${shapes}</g><g fill="#000" stroke="none" transform="translate(${dx} ${dy})">${shapes}</g></mask>` +
    `<g fill="${fill}" stroke="none" mask="url(#${id})"${o < 1 ? ` opacity="${o}"` : ''}>${shapes}</g>`
  );
};
/** An iron rivet with a glint. */
export const fxRivet = (x: number, y: number, rad = 1.6) =>
  `<circle cx="${x}" cy="${y}" r="${rad}" fill="${IRONL}" stroke="${INK}" stroke-width="${sh.r1(rad * 0.6)}"/>` +
  `<circle cx="${sh.r1(x - rad * 0.35)}" cy="${sh.r1(y - rad * 0.35)}" r="${sh.r1(rad * 0.4)}" fill="${WHITE}" stroke="none" opacity=".85"/>`;
/** A small four-point twinkle. */
export const fxTwinkle = (x: number, y: number, s: number, col = WHITE, o = 1) => {
  const k = s * 0.2;
  return sh.paint(
    `M${x} ${y - s}Q${x + k} ${y - k} ${x + s} ${y}Q${x + k} ${y + k} ${x} ${y + s}Q${x - k} ${y + k} ${x - s} ${y}Q${x - k} ${y - k} ${x} ${y - s}Z`,
    col,
    o,
  );
};
/** Shading offset (dx, dy) seen from inside a group rotated by `deg`, so light stays upper left. */
export const fxRot = (dx: number, dy: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [sh.r1(dx * Math.cos(a) + dy * Math.sin(a)), sh.r1(-dx * Math.sin(a) + dy * Math.cos(a))];
};
