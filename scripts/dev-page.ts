/**
 * Builds the developer overview, one self-contained HTML file, from the repo's configuration and
 * documents. GitHub Actions runs it after the game build; the v0.3 page is published at /fondue/next/dev/.
 *   npm run dev-page                  writes dist/dev/index.html
 *   node scripts/dev-page.ts <folder> writes <folder>/index.html
 * The page itself is made in scripts/dev-page/page.ts.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Patterns that must never reach the public page: e-mail addresses and local file paths. */
const PRIVATE: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?/gi,
  /\b[A-Z]:\\[^\s<"'`|)]*/g,
  /(?:\/Users|\/home)\/[^\s<"'`|)]+/g,
];

/** Removes anything private from the page and reports what was removed. */
export function scrub(html: string): { html: string; removed: string[] } {
  const removed: string[] = [];
  let out = html;
  for (const re of PRIVATE) {
    // Inline fonts (base64) and pictures (URI-encoded) contain neither '@' nor '\', so they pass untouched.
    out = out.replace(re, (m) => {
      removed.push(m);
      return '[entfernt]';
    });
  }
  return { html: out, removed };
}

function version(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unbekannt';
  }
}

async function main() {
  const outDir = resolve(process.argv[2] ?? join(root, 'dist', 'dev'));
  // The page module imports the game's config with Vite's module resolution; nothing is served or built.
  const { createServer } = await import('vite');
  const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const page = (await server.ssrLoadModule('/scripts/dev-page/page.ts')) as typeof import('./dev-page/page');
    const { html, removed } = scrub(page.renderDevPage(await page.readDevInput(root, version())));
    if (removed.length) console.warn(`removed ${removed.length} private-looking strings from the page`);
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, 'index.html');
    writeFileSync(file, html);
    console.log(`developer page written: ${file} (${Math.round(html.length / 1024)} KB)`);
  } finally {
    await server.close();
  }
}

if (process.argv.some((a) => a.split('\\').join('/').endsWith('scripts/dev-page.ts'))) {
  main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
}
