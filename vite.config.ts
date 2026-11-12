import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import { GAME_NAME } from './src/config/game.ts';

function gitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

/** Puts the game name from src/config/game.ts into the page title of index.html (dev server and build). */
function gameTitle(): Plugin {
  const safe = GAME_NAME.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { name: 'game-title', transformIndexHtml: (html) => html.replace('%GAME_NAME%', safe) };
}

export default defineConfig({
  plugins: [gameTitle()],
  // GitHub Pages serves the site from /<repo>/.
  base: process.env.GITHUB_ACTIONS ? '/fondue/' : '/',
  define: {
    __GAME_VERSION__: JSON.stringify(gitHash()),
  },
});
