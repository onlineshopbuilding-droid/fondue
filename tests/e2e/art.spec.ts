import { expect, test } from '@playwright/test';

/**
 * Every piece of art is rasterised into a texture of fixed size. A drawing that runs past its box is
 * cut off with a hard straight edge, which shows in game as soon as a limb swings. This test
 * rasterises the figures and the free-floating props and fails if anything touches the canvas edge.
 * Strips and the keep are left out: they are meant to run off an edge.
 */

const FREE_PROPS = [
  'handOpen', 'handClosed', 'reticle', 'wheel', 'comet', 'bomb', 'stone', 'shell', 'bolt', 'roofBolt',
  'gibHelmet', 'gibPlate', 'gibBoot', 'gibStick', 'coin', 'offering', 'drop1', 'dust', 'spark', 'star', 'shieldBubble',
];

test('no figure or free prop is cut off by its texture box', async ({ page }) => {
  // On GitHub the dev server serves the game under /fondue/ (vite.config.ts); it redirects / there.
  const root = await page.request.get('/', { maxRedirects: 0 });
  const base = root.status() >= 300 && root.status() < 400 ? new URL(root.headers().location, 'http://x').pathname : '/';
  // A plain module URL of the dev server: same origin, so modules can be imported, but no game boots.
  await page.goto(`${base}src/config/game.ts`);
  await page.setContent('<html><body></body></html>');
  const clips = await page.evaluate(async ([free, b]) => {
    // Loaded by the dev server inside the page; held in variables so TypeScript does not resolve them.
    const charsUrl = `${b}src/art/characters/index.ts`;
    const propsUrl = `${b}src/art/props.ts`;
    const { RIGS } = await import(/* @vite-ignore */ charsUrl);
    const { PROPS } = await import(/* @vite-ignore */ propsUrl);
    type A = { svg: string; w: number; h: number };
    const touches = async (art: A): Promise<string> => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('SVG does not load'));
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art.svg)}`;
      });
      const c = document.createElement('canvas');
      c.width = Math.ceil(art.w * 2);
      c.height = Math.ceil(art.h * 2);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const a = (x: number, y: number) => d[(y * c.width + x) * 4 + 3];
      const sides: string[] = [];
      let top = 0, bottom = 0, left = 0, right = 0;
      for (let x = 0; x < c.width; x++) { if (a(x, 0) > 40) top++; if (a(x, c.height - 1) > 40) bottom++; }
      for (let y = 0; y < c.height; y++) { if (a(0, y) > 40) left++; if (a(c.width - 1, y) > 40) right++; }
      if (top) sides.push('top'); if (bottom) sides.push('bottom'); if (left) sides.push('left'); if (right) sides.push('right');
      return sides.join(' ');
    };
    const found: string[] = [];
    for (const [name, rig] of Object.entries(RIGS) as [string, { parts: { name: string; art: A }[] }][]) {
      for (const p of rig.parts) {
        const s = await touches(p.art);
        if (s) found.push(`${name}.${p.name}: ${s}`);
      }
    }
    const props = PROPS as Record<string, A>;
    const names = [...(free as string[]),...Object.keys(props).filter((n) => n.startsWith('icon'))];
    for (const n of names) {
      if (!props[n]) { found.push(`${n}: missing`); continue; }
      const s = await touches(props[n]);
      if (s) found.push(`${n}: ${s}`);
    }
    return found;
  }, [FREE_PROPS, base] as const);
  expect(clips, 'Art that runs past its texture box').toEqual([]);
});
