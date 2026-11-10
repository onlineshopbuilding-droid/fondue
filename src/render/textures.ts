import Phaser from 'phaser';
import type { Art, CharacterRig } from '../art/types';
import { RIGS } from '../art/characters';
import { PROPS } from '../art/props';
import { CLOUDS, LANDSCAPE_ART } from '../art/landscapes';

/** Texture pixels per world pixel. Characters stay sharp when the game is scaled up. */
export const TEX_SCALE = 2;

/**
 * Texture pixels per world pixel for the landscape layers. Nearer layers are sharper; the far ones
 * may stay a little soft, like distance. Larger values cost memory: four landscapes are kept loaded.
 */
export const LAND_SCALE = { far: 1, mid: 1.25, near: 1.5, ground: 2 } as const;
export const CLOUD_SCALE = 1.5;

function rasterise(art: Art, scale: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(art.w * scale);
      canvas.height = Math.ceil(art.h * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error(`Could not rasterise art (${art.w}x${art.h})`));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art.svg)}`;
  });
}

export const partKey = (rig: string, part: string) => `rig:${rig}:${part}`;
export const propKey = (name: string) => `prop:${name}`;
export const landscapeKey = (land: string, layer: string) => `land:${land}:${layer}`;
export const cloudKey = (i: number) => `cloud:${i}`;

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

type LandName = keyof typeof LANDSCAPE_ART;
const LANDS = Object.keys(LANDSCAPE_ART) as LandName[];
/** The landscape a game starts in; only this one is needed before the menu shows. */
const FIRST_LAND: LandName = 'meadow';
/** Group of the bigger keep stages, which only matter once a gate has been bought. */
const KEEP_STAGES = 'keepStages';
type Group = LandName | typeof KEEP_STAGES;

/**
 * Which background group a prop belongs to: a landscape for its dressing (`foot_marsh`,
 * `keepWeather_snowpine_2`), the keep stages 1 to 4 with their window glow, or none (made at boot).
 */
function groupOfProp(name: string): Group | null {
  for (const land of LANDS) if (name.endsWith(`_${land}`) || name.includes(`_${land}_`)) return land;
  if (/^keep(Glow)?[1-9]$/.test(name)) return KEEP_STAGES;
  return null;
}

/** Everything a group needs: a landscape's four strips plus its props, or the keep stages. */
function groupJobs(group: Group): [string, Art, number][] {
  const list: [string, Art, number][] = [];
  if (group !== KEEP_STAGES) {
    const layers = LANDSCAPE_ART[group];
    for (const layer of ['far', 'mid', 'near', 'ground'] as const) list.push([landscapeKey(group, layer), layers[layer], LAND_SCALE[layer]]);
  }
  for (const [name, art] of Object.entries(PROPS)) if (groupOfProp(name) === group) list.push([propKey(name), art, TEX_SCALE]);
  return list;
}

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
export const wantLandscape = (land: string) => want(land as Group);
export const wantKeepStages = () => want(KEEP_STAGES);

async function addAll(tex: Phaser.Textures.TextureManager, jobs: [string, Art, number][]) {
  await Promise.all(jobs.map(([key, art, scale]) => rasterise(art, scale).then((c) => { tex.addCanvas(key, c); })));
}

/** Loads the remaining groups one after another while the player is already in the menu. */
async function loadRest(tex: Phaser.Textures.TextureManager) {
  if (loading) return;
  loading = true;
  while (queue.length > 0) {
    const group = queue.shift()!;
    try {
      await addAll(tex, groupJobs(group));
      ready.add(group);
    } catch (e) {
      // The game keeps showing what it has; better than broken art.
      console.error(`Art group ${group} could not be prepared`, e);
    }
    // Let a few frames through between landscapes, so the menu never stutters.
    await new Promise((r) => setTimeout(r, 120));
  }
  loading = false;
}

/**
 * Turns all art into GPU textures. Called once at boot. Rasterising detailed SVG takes a while on
 * phones, so only what the first landscape needs is made before the game starts; the other three
 * landscapes and the bigger keep stages follow in the background (`landscapeReady`, `keepStagesReady`).
 */
export async function buildTextures(game: Phaser.Game): Promise<void> {
  const tex = game.textures;
  const jobs: [string, Art, number][] = [];
  for (const [name, rig] of Object.entries(RIGS) as [string, CharacterRig][]) {
    for (const part of rig.parts) jobs.push([partKey(name, part.name), part.art, TEX_SCALE]);
  }
  for (const [name, art] of Object.entries(PROPS)) if (groupOfProp(name) === null) jobs.push([propKey(name), art, TEX_SCALE]);
  CLOUDS.forEach((art, i) => jobs.push([cloudKey(i), art, CLOUD_SCALE]));
  jobs.push(...groupJobs(FIRST_LAND));
  await addAll(tex, jobs);
  ready.add(FIRST_LAND);
  tex.addCanvas('fx:shadow', shadowCanvas());
  tex.addCanvas('fx:burst', burstCanvas());
  tex.addCanvas('fx:ring', ringCanvas());
  // Keep stages first: a gate can be bought after day 1, the next landscape comes on day 4.
  queue = [KEEP_STAGES, ...LANDS.filter((l) => l !== FIRST_LAND)];
  void loadRest(tex);
}
