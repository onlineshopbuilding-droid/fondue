/**
 * Shared palette and small SVG writers for hand-drawn environment art (props and the castle).
 */
import { svg, type Art } from './types';

export const INK = '#2b2118';
export const TEAL = '#2f7f7a';
export const TEALD = '#1f5a5c';
export const RUST = '#b5502e';
export const RUSTD = '#853820';
export const MUST = '#dfa22d';
export const MUSTL = '#f3cb5e';
export const CREAM = '#f3e6c8';
export const FOREST = '#3f6b45';
export const PLUM = '#6b3a5e';
export const WOOD = '#9a6a3c';
export const WOODD = '#6e4626';
export const WOODL = '#bb8c56';
export const STONE = '#9a9484';
export const STONED = '#756f63';
export const STONEL = '#bfb9a6';
export const IRON = '#4b4f55';
export const IRONL = '#777d83';
export const RED = '#b3282d';
export const REDL = '#d9534a';
export const GLOW = '#9ff5ea';
export const WHITE = '#fbfaf6';
export const GOLD = '#c98a2b';
export const GOLDD = '#8e5a22';

// Small SVG writers. Shapes inherit their outline from the enclosing ink() group.
export const ink = (b: string, w = 3.5) =>
  `<g stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${b}</g>`;
export const r = (x: number, y: number, w: number, h: number, f: string, rx = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
export const c = (x: number, y: number, rad: number, f: string) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"/>`;
export const e = (x: number, y: number, rx: number, ry: number, f: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
export const p = (d: string, f: string) => `<path d="${d}" fill="${f}"/>`;
/** An open line. */
export const l = (d: string, w?: number, col?: string) =>
  `<path d="${d}" fill="none"${w ? ` stroke-width="${w}"` : ''}${col ? ` stroke="${col}"` : ''}/>`;
/** A shape with no outline, for highlights. */
export const n = (d: string, f: string, o = 1) => `<path d="${d}" fill="${f}" stroke="none"${o < 1 ? ` opacity="${o}"` : ''}/>`;
/** A stroke with no ink, for highlights and carved lines. */
export const hl = (d: string, col: string, w = 2.5, o = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o < 1 ? ` opacity="${o}"` : ''}/>`;
/** Draws shapes twice so that overlapping pieces merge under one shared outline. */
export const blob = (shapes: string, f: string, w = 3.5, col = INK) =>
  `<g fill="${col}" stroke="${col}" stroke-width="${w * 2}" stroke-linejoin="round">${shapes}</g><g fill="${f}">${shapes}</g>`;
export const art = (w: number, h: number, px: number, py: number, b: string): Art => ({ svg: svg(w, h, b), w, h, px, py });
export const centred = (w: number, h: number, b: string) => art(w, h, w / 2, h / 2, b);

export function starPoints(cx: number, cy: number, outer: number, inner: number, count: number, rotDeg = -90): string {
  const out: string[] = [];
  for (let i = 0; i < count * 2; i++) {
    const a = ((rotDeg + (i * 180) / count) * Math.PI) / 180;
    const rad = i % 2 === 0 ? outer : inner;
    out.push(`${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${out.join('L')}Z`;
}
