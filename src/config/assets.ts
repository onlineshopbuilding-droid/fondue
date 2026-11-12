/**
 * Swaps single pieces of art for image files (PNG or WebP) without touching game logic or scenes.
 *
 * How to use it:
 * 1. Look up the asset's name, size and anchor in docs/GRAFIK-AUSTAUSCHEN.md (e.g. `rig:grunt:body`).
 * 2. Put the image into `public/assets/`, e.g. `public/assets/grunt-body.png`. Vite serves `public/`
 *    as it is, in development and in the built game.
 * 3. Add a line below: `'rig:grunt:body': assetUrl('grunt-body.png'),`
 *
 * Always build the URL with `assetUrl`: it starts at `import.meta.env.BASE_URL`, so the file is also
 * found on GitHub Pages, where the game lives under `/fondue/`.
 *
 * The image is drawn into the same box as the built-in art (width x height in world pixels), and the
 * anchor stays where it was. If the file cannot be loaded, the game warns in the console and shows
 * the built-in art instead.
 *
 * For a quick try without editing this file, add `?asset=<name>=<url>` to the address (may be given
 * several times), e.g. `?asset=rig:grunt:body=/assets/grunt-body.png`.
 */

/** URL of a file in `public/assets/`, correct under any base path. */
export const assetUrl = (file: string): string => `${import.meta.env.BASE_URL}assets/${file}`;

/** Asset name -> URL of the image shown instead of the built-in art. Empty in the normal game. */
export const ASSET_OVERRIDES: Record<string, string> = {};
