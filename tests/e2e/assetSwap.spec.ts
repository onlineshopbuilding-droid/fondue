import { crc32, deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { waitForGame } from './helpers';

/**
 * Any asset can be swapped for an image file by name. These tests start the game with
 * `?asset=rig:grunt:body=<file>` and read the pixels of the textures the game really uses: the
 * swapped one must be the replacement picture, its neighbours must be the built-in art.
 * The picture is made here and served by the test, so no test file is ever part of the game.
 */

const SWAPPED = 'rig:grunt:body';
const UNTOUCHED = 'rig:grunt:head';

/** A PNG of one flat colour, built by hand so the test needs no file in the repo. */
function flatPng(size: number, [r, g, b]: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head.set([8, 6, 0, 0, 0], 8); // 8 bit, RGBA
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 4)]);
  for (let x = 0; x < size; x++) row.set([r, g, b, 255], 1 + x * 4);
  const pixels = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}

interface Probe {
  /** Size of the texture the game uses, in texture pixels. */
  width: number;
  height: number;
  /** Share of pixels that are opaque magenta (255, 0, 255). */
  magenta: number;
  /** True if the texture is pixel for pixel what the built-in SVG gives at this size. */
  sameAsBuiltIn: boolean;
  /** Expected size: the entry's world size times the figure texture scale of 2. */
  expectedWidth: number;
  expectedHeight: number;
}

/** Reads a figure part's texture out of the running game and compares it with its built-in SVG. */
const probe = (page: Page, name: string) => page.evaluate(async (key): Promise<Probe> => {
  const app = (window as any).__fondue;
  const [, rig, partName] = key.split(':');
  const art = app.art.rigs[rig].parts.find((p: any) => p.name === partName).art as { svg: string; w: number; h: number };
  const source = app.game.textures.get(key).getSourceImage() as HTMLCanvasElement;
  const used = source.getContext('2d')!.getImageData(0, 0, source.width, source.height).data;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art.svg)}`; });
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const builtIn = ctx.getImageData(0, 0, c.width, c.height).data;
  let magenta = 0;
  let same = true;
  for (let i = 0; i < used.length; i += 4) {
    if (used[i] === 255 && used[i + 1] === 0 && used[i + 2] === 255 && used[i + 3] === 255) magenta++;
    if (used[i] !== builtIn[i] || used[i + 1] !== builtIn[i + 1] || used[i + 2] !== builtIn[i + 2] || used[i + 3] !== builtIn[i + 3]) same = false;
  }
  return {
    width: source.width, height: source.height, magenta: magenta / (used.length / 4), sameAsBuiltIn: same,
    expectedWidth: Math.ceil(art.w * 2), expectedHeight: Math.ceil(art.h * 2),
  };
}, name);

test('an asset named in the address is replaced by the image file, the others stay as they are', async ({ page }) => {
  // The file exists only for this test: the game asks for it under public/assets/, the test answers.
  let served = 0;
  await page.route('**/assets/test/magenta.png', (route) => { served++; return route.fulfill({ contentType: 'image/png', body: flatPng(16, [255, 0, 255]) }); });
  await page.goto(`/?asset=${encodeURIComponent(`${SWAPPED}=/assets/test/magenta.png`)}`);
  await waitForGame(page, { allArt: false });
  expect(served).toBe(1);

  const swapped = await probe(page, SWAPPED);
  // The replacement fills the entry's own box: same texture size as the built-in art, all magenta.
  expect([swapped.width, swapped.height]).toEqual([swapped.expectedWidth, swapped.expectedHeight]);
  expect(swapped.magenta).toBe(1);
  expect(swapped.sameAsBuiltIn).toBe(false);

  const untouched = await probe(page, UNTOUCHED);
  expect(untouched.magenta).toBe(0);
  expect(untouched.sameAsBuiltIn).toBe(true);
});

test('without the parameter the same texture is the built-in art', async ({ page }) => {
  await page.goto('/');
  await waitForGame(page, { allArt: false });
  const body = await probe(page, SWAPPED);
  expect(body.sameAsBuiltIn).toBe(true);
  expect(body.magenta).toBe(0);
});

test('an image that cannot be loaded falls back to the built-in art and warns', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.route('**/assets/test/missing.png', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }));
  await page.goto(`/?asset=${encodeURIComponent(`${SWAPPED}=/assets/test/missing.png`)}`);
  await waitForGame(page, { allArt: false });
  const body = await probe(page, SWAPPED);
  expect(body.sameAsBuiltIn).toBe(true);
  expect(warnings.some((w) => w.includes(SWAPPED) && w.includes('/assets/test/missing.png'))).toBe(true);
});
