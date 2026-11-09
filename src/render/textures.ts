import Phaser from 'phaser';
import type { Art, CharacterRig } from '../art/types';
import { RIGS } from '../art/characters';
import { PROPS } from '../art/props';
import { CLOUDS, LANDSCAPE_ART } from '../art/landscapes';

/** Texture pixels per world pixel. Characters stay sharp when the game is scaled up. */
export const TEX_SCALE = 2;

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

function shadowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 40;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 20, 2, 64, 20, 62);
  g.addColorStop(0, 'rgba(30,20,10,0.55)');
  g.addColorStop(1, 'rgba(30,20,10,0)');
  ctx.save();
  ctx.scale(1, 40 / 128);
  ctx.translate(0, 44);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 20, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

function burstCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,250,210,1)');
  g.addColorStop(0.4, 'rgba(255,200,70,0.95)');
  g.addColorStop(0.75, 'rgba(230,90,30,0.7)');
  g.addColorStop(1, 'rgba(120,30,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

function ringCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = 'rgba(190,235,255,0.9)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

/** Turns all art into GPU textures. Called once at boot. */
export async function buildTextures(game: Phaser.Game): Promise<void> {
  const tex = game.textures;
  const jobs: Promise<void>[] = [];
  const add = (key: string, art: Art, scale: number) => {
    jobs.push(rasterise(art, scale).then((c) => { tex.addCanvas(key, c); }));
  };
  for (const [name, rig] of Object.entries(RIGS) as [string, CharacterRig][]) {
    for (const part of rig.parts) add(partKey(name, part.name), part.art, TEX_SCALE);
  }
  for (const [name, art] of Object.entries(PROPS)) add(propKey(name), art, TEX_SCALE);
  for (const [land, layers] of Object.entries(LANDSCAPE_ART)) {
    for (const layer of ['far', 'mid', 'near', 'ground'] as const) add(landscapeKey(land, layer), layers[layer], 1);
  }
  CLOUDS.forEach((art, i) => add(cloudKey(i), art, 1));
  await Promise.all(jobs);
  tex.addCanvas('fx:shadow', shadowCanvas());
  tex.addCanvas('fx:burst', burstCanvas());
  tex.addCanvas('fx:ring', ringCanvas());
}
