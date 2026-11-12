/**
 * Writes the list of all assets into docs/GRAFIK-AUSTAUSCHEN.md, between the two ASSETS markers.
 * Run it after adding, removing or resizing art: `node scripts/list-assets.ts` (or with vite-node).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AssetEntry } from '../src/art/registry';

export const START = '<!-- ASSETS:START (erzeugt von scripts/list-assets.ts, nicht von Hand ändern) -->';
export const END = '<!-- ASSETS:END -->';

const KINDS: [AssetEntry['kind'], string][] = [
  ['rigPart', 'Figurenteile'],
  ['prop', 'Requisiten, Burg und Effekte'],
  ['weapon', 'Waffen (je Stufe ein Bild)'],
  ['landscape', 'Landschaftsebenen'],
  ['cloud', 'Wolken'],
];
const GROUPS: Record<string, string> = { boot: 'Start', keepStages: 'Burgstufen', weaponTiers: 'Waffenstufen 2 bis 5', meadow: 'meadow (Start)' };
const num = (v: number) => String(Math.round(v * 10) / 10);

/** The Markdown tables of all assets, one per kind. */
export function assetTables(assets: AssetEntry[]): string {
  const out: string[] = [`Stand: ${assets.length} Assets.`];
  for (const [kind, title] of KINDS) {
    const list = assets.filter((a) => a.kind === kind);
    const joint = kind === 'rigPart';
    out.push('', `### ${title} (${list.length})`, '');
    out.push(`| Name | Größe in Weltpixeln | Ankerpunkt (x, y) | Bilddatei in Pixeln |${joint ? ' Gelenk (x, y) | Bewegung |' : ''} Gruppe |`);
    out.push(`|---|---|---|---|${joint ? '---|---|' : ''}---|`);
    for (const a of list) {
      const { w, h, px, py } = a.art;
      const size = `${Math.ceil(w * a.scale)} × ${Math.ceil(h * a.scale)}`;
      const j = joint && a.joint ? ` ${num(a.joint.x)}, ${num(a.joint.y)} | ${a.joint.anim} |` : '';
      out.push(`| \`${a.name}\` | ${num(w)} × ${num(h)} | ${num(px)}, ${num(py)} | ${size} |${j} ${GROUPS[a.group] ?? a.group} |`);
    }
  }
  return out.join('\n');
}

/** Replaces what stands between the two markers of the document. */
export function withTables(doc: string, tables: string): string {
  const a = doc.indexOf(START);
  const b = doc.indexOf(END);
  if (a < 0 || b < a) throw new Error('ASSETS markers not found in the document');
  return `${doc.slice(0, a + START.length)}\n${tables}\n${doc.slice(b)}`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DOC = join(root, 'docs', 'GRAFIK-AUSTAUSCHEN.md');

async function main() {
  // The art modules use Vite's module resolution, so Vite loads them; nothing is served or built.
  const { createServer } = await import('vite');
  const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const { listAssets } = (await server.ssrLoadModule('/src/art/registry.ts')) as typeof import('../src/art/registry');
    const assets = listAssets();
    const before = readFileSync(DOC, 'utf8');
    const eol = before.includes('\r\n') ? '\r\n' : '\n';
    const after = withTables(before.replace(/\r\n/g, '\n'), assetTables(assets)).replace(/\n/g, eol);
    if (after !== before) writeFileSync(DOC, after);
    console.log(`${assets.length} assets, ${after === before ? 'document was up to date' : 'document updated'}`);
  } finally {
    await server.close();
  }
}

// Runs only when started as a script (node or vite-node), not when a test imports the helpers.
if (process.argv.some((a) => a.split('\\').join('/').endsWith('scripts/list-assets.ts'))) {
  main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
}
