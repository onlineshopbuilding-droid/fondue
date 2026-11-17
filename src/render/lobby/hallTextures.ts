// Makes the lobby pictures of one castle tier (group LOBBY_HALLS of the asset directory) when the
// hall of that tier is first shown, so boot only pays for the tier the player has.
import type Phaser from 'phaser';
import { lobbyKey } from '../../art/lobby';
import { ASSETS, type AssetEntry } from '../../art/registry';
import { hallArtNames } from './layout';

function draw(src: string, entry: AssetEntry): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(entry.art.w * entry.scale);
      canvas.height = Math.ceil(entry.art.h * entry.scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error(`Could not rasterise ${entry.name}`));
    img.src = src;
  });
}

/** One asset as a canvas: its image file if it has one (and it loads), else its SVG. */
async function rasterise(entry: AssetEntry): Promise<HTMLCanvasElement> {
  if (entry.art.image) {
    try { return await draw(entry.art.image, entry); } catch { console.warn(`Asset ${entry.name}: image could not be loaded, using the built-in art`); }
  }
  return draw(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(entry.art.svg)}`, entry);
}

const pending = new Map<number, Promise<void>>();

/** Makes the textures of the hall at `tier` (once); resolves when all exist. */
export function ensureHall(tex: Phaser.Textures.TextureManager, tier: number): Promise<void> {
  let job = pending.get(tier);
  if (!job) {
    const entries = hallArtNames(tier).map((n) => ASSETS[lobbyKey(n)]).filter((e) => e && !tex.exists(e.name));
    job = Promise.all(entries.map((e) => rasterise(e).then((c) => { if (!tex.exists(e.name)) tex.addCanvas(e.name, c); }))).then(() => undefined);
    job.catch((e) => { console.error(`Lobby hall ${tier} could not be prepared`, e); pending.delete(tier); });
    pending.set(tier, job);
  }
  return job;
}
