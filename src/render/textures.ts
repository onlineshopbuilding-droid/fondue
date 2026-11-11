import Phaser from 'phaser';
import type { Art } from '../art/types';
import { assetsOfGroup, BOOT, KEEP_STAGES, LAND_NAMES, type AssetEntry, type AssetGroup, type LandName } from '../art/registry';

// Names and scales live in the asset directory; scenes keep importing them from here.
export { TEX_SCALE, LAND_SCALE, CLOUD_SCALE, partKey, propKey, landscapeKey, cloudKey } from '../art/registry';

/** Loads a picture from `src` and draws it into a canvas of the art's size times `scale`. */
function draw(src: string, art: Art, scale: number, what: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // An image file from another site may only become a texture if that site allows it.
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(art.w * scale);
      canvas.height = Math.ceil(art.h * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error(`Could not rasterise ${what} (${art.w}x${art.h})`));
    img.src = src;
  });
}

/**
 * Turns one asset into a canvas. With `art.image` set, that file is drawn into the same box as the
 * SVG (w x h x scale); if it cannot be loaded, the built-in SVG is used and a warning is logged.
 */
async function rasterise({ name, art, scale }: AssetEntry): Promise<HTMLCanvasElement> {
  if (art.image) {
    try {
      return await draw(art.image, art, scale, `image ${art.image}`);
    } catch {
      console.warn(`Asset ${name}: image ${art.image} could not be loaded, using the built-in art`);
    }
  }
  return draw(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(art.svg)}`, art, scale, `art ${name}`);
}

/** Soft ground shadow under figures: a cool, dark contact core inside a wide falloff. */
function shadowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 40;
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.translate(64, 20);
  ctx.scale(1, 0.3);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 62);
  g.addColorStop(0, 'rgba(30,22,38,0.66)');
  g.addColorStop(0.35, 'rgba(30,22,38,0.5)');
  g.addColorStop(0.7, 'rgba(30,22,38,0.18)');
  g.addColorStop(1, 'rgba(30,22,38,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

/** Fireball: ragged flame tongues around a glowing ball with a white-hot core. */
function burstCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  // Fixed tongue lengths, so every explosion has the same hand-drawn shape (it is rotated in game).
  const reach = [118, 96, 124, 104, 112, 92, 120, 100, 110];
  ctx.fillStyle = 'rgba(236,112,44,0.55)';
  ctx.beginPath();
  reach.forEach((r, i) => {
    const a = (i / reach.length) * Math.PI * 2;
    const b = a + Math.PI / reach.length;
    const e = a + (Math.PI * 2) / reach.length;
    if (i === 0) ctx.moveTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60);
    ctx.quadraticCurveTo(128 + Math.cos(a) * r * 0.8, 128 + Math.sin(a) * r * 0.8, 128 + Math.cos(b) * r, 128 + Math.sin(b) * r);
    ctx.quadraticCurveTo(128 + Math.cos(e) * r * 0.75, 128 + Math.sin(e) * r * 0.75, 128 + Math.cos(e) * 60, 128 + Math.sin(e) * 60);
  });
  ctx.fill();
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 116);
  g.addColorStop(0, 'rgba(255,253,236,1)');
  g.addColorStop(0.2, 'rgba(255,238,160,1)');
  g.addColorStop(0.45, 'rgba(255,186,64,0.95)');
  g.addColorStop(0.72, 'rgba(226,92,36,0.6)');
  g.addColorStop(1, 'rgba(120,30,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 116, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** Shock ring: a crisp bright rim with a soft glow fading inwards. White, so callers can tint it. */
function ringCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 64, 128, 128, 125);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.88, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 125, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 128, 115, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

const LANDS = LAND_NAMES;
/** The landscape a game starts in; only this one is needed before the menu shows. */
const FIRST_LAND: LandName = 'meadow';
/** A group loaded in the background: a landscape with its props, or the bigger keep stages. */
type Group = Exclude<AssetGroup, typeof BOOT>;

const ready = new Set<Group>();
let queue: Group[] = [];
let loading = false;

/** True once a landscape's textures exist, so it can be shown. */
export function landscapeReady(land: string): boolean {
  return ready.has(land as Group);
}

/** True once the keep stages beyond the first exist. */
export function keepStagesReady(): boolean {
  return ready.has(KEEP_STAGES);
}

/** Moves a group to the front of the background queue, because it is wanted now. */
function want(group: Group) {
  if (ready.has(group) || !queue.includes(group)) return;
  queue = [group, ...queue.filter((l) => l !== group)];
}
/** True once the background queue is through: every landscape and keep stage exists. */
export function allArtReady(): boolean {
  return ready.has(KEEP_STAGES) && LANDS.every((l) => ready.has(l));
}
export const wantLandscape = (land: string) => want(land as Group);
export const wantKeepStages = () => want(KEEP_STAGES);

async function addAll(tex: Phaser.Textures.TextureManager, jobs: AssetEntry[]) {
  await Promise.all(jobs.map((asset) => rasterise(asset).then((c) => { tex.addCanvas(asset.name, c); })));
}

/** Pause between two background textures, so input, frames and co-op messages get through. */
const BACKGROUND_GAP_MS = 40;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Loads the remaining groups while the player is already in the menu or the first day. One texture
 * at a time with a pause in between: started all at once, a group kept the page busy for seconds on
 * slow machines, long enough to drop a co-op link or swallow a long press.
 */
async function loadRest(tex: Phaser.Textures.TextureManager) {
  if (loading) return;
  loading = true;
  while (queue.length > 0) {
    const group = queue.shift()!;
    try {
      for (const asset of assetsOfGroup(group)) {
        tex.addCanvas(asset.name, await rasterise(asset));
        await pause(BACKGROUND_GAP_MS);
      }
      ready.add(group);
    } catch (e) {
      // The game keeps showing what it has; better than broken art.
      console.error(`Art group ${group} could not be prepared`, e);
    }
    await pause(120);
  }
  loading = false;
}

/**
 * Turns all art of the asset directory into GPU textures. Called once at boot. Rasterising detailed SVG takes a while on
 * phones, so only what the first landscape needs is made before the game starts; the other three
 * landscapes and the bigger keep stages follow in the background (`landscapeReady`, `keepStagesReady`).
 */
export async function buildTextures(game: Phaser.Game): Promise<void> {
  const tex = game.textures;
  // Figures, props without a group and clouds, then the first landscape with its props.
  await addAll(tex, [...assetsOfGroup(BOOT), ...assetsOfGroup(FIRST_LAND)]);
  ready.add(FIRST_LAND);
  tex.addCanvas('fx:shadow', shadowCanvas());
  tex.addCanvas('fx:burst', burstCanvas());
  tex.addCanvas('fx:ring', ringCanvas());
  // Keep stages first: a gate can be bought after day 1, the next landscape comes on day 4.
  queue = [KEEP_STAGES, ...LANDS.filter((l) => l !== FIRST_LAND)];
  void loadRest(tex);
}
