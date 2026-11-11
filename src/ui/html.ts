// Small HTML building blocks shared by the screens: escaping, art as image addresses and the
// standard back button. Screens build their markup as strings, so everything dynamic goes through `esc`.
import { RIGS } from '../art/characters';
import { PROPS } from '../art/props';
import type { EnemyType } from '../config/enemies';

/** Makes any text safe to place inside HTML or an attribute. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A prop drawing as an address an <img> can show. */
export const artUri = (name: string) => svgUri(PROPS[name].svg);

const rigCache = new Map<string, string>();

/** A whole raider, its parts put together in their resting pose, as an address an <img> can show. */
export function rigUri(type: EnemyType): string {
  const cached = rigCache.get(type);
  if (cached) return cached;
  const parts = RIGS[type].parts;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of parts) {
    x0 = Math.min(x0, p.x - p.art.px); y0 = Math.min(y0, p.y - p.art.py);
    x1 = Math.max(x1, p.x - p.art.px + p.art.w); y1 = Math.max(y1, p.y - p.art.py + p.art.h);
  }
  const w = Math.ceil(x1 - x0); const h = Math.ceil(y1 - y0);
  const images = parts.map((p) => `<image href="${svgUri(p.art.svg)}" x="${p.x - p.art.px - x0}" y="${p.y - p.art.py - y0}" width="${p.art.w}" height="${p.art.h}"/>`).join('');
  const uri = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${images}</svg>`);
  rigCache.set(type, uri);
  return uri;
}

/** Leads back to the main menu from any menu page. */
export const BACK_BUTTON = '<button class="secondary" data-a="main">Back</button>';

/**
 * The bottom line of a page: going back on the left, going on on the right. Every screen and
 * dialog uses this order.
 */
export const navRow = (back: string, forward = '') => `<div class="row navrow"><div class="nav-back">${back}</div><div class="nav-forward">${forward}</div></div>`;
