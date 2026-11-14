/**
 * Renders every weapon picture at every tier into one contact sheet:
 * `node scripts/weapon-sheet.ts [out.png]` (default docs/screenshots/v0.3/weapons-tiers.png).
 * One row per weapon (grouped by slot), one column per tier. Nothing is served; Vite only loads the
 * art modules, and Playwright's Chromium turns the page into a PNG.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const out = resolve(process.argv[2] ?? join(root, 'docs', 'screenshots', 'v0.3', 'weapons-tiers.png'));
  const { createServer } = await import('vite');
  const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  let html = '';
  try {
    const w = (await server.ssrLoadModule('/src/art/weapons/index.ts')) as typeof import('../src/art/weapons/index');
    const cell = 132;
    let rows = '';
    for (const [slot, ids] of Object.entries(w.WEAPON_ART_BY_SLOT)) {
      rows += `<tr><th colspan="${w.WEAPON_ART_TIERS + 1}" class="slot">${slot}</th></tr>`;
      for (const id of ids) {
        rows += `<tr><th>${id}</th>`;
        for (let tier = 1; tier <= w.WEAPON_ART_TIERS; tier++) {
          const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(w.weaponArt(id, tier).svg)}`;
          rows += `<td><img src="${uri}" width="${cell}" height="${cell}"></td>`;
        }
        rows += '</tr>';
      }
    }
    let head = '<tr><th></th>';
    for (let tier = 1; tier <= w.WEAPON_ART_TIERS; tier++) head += `<th>Tier ${tier}</th>`;
    head += '</tr>';
    html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#6d7f8f;font:14px sans-serif;color:#fff}
      table{border-collapse:collapse;margin:8px}
      td{padding:2px;background:#8798a6;border:1px solid #5b6b78}
      th{padding:4px 8px;text-align:right}
      th.slot{text-align:left;background:#3d4b57;font-size:16px;text-transform:uppercase}
    </style><table>${head}${rows}</table>`;
  } finally {
    await server.close();
  }
  const page = join(tmpdir(), `fondue-weapon-sheet-${process.pid}.html`);
  writeFileSync(page, html);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({ viewport: { width: 1060, height: 800 } });
    await tab.goto(pathToFileURL(page).href);
    await tab.waitForFunction(() => [...document.images].every((i) => i.complete));
    mkdirSync(dirname(out), { recursive: true });
    await tab.screenshot({ path: out, fullPage: true });
    console.log(`Contact sheet written to ${out}`);
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
