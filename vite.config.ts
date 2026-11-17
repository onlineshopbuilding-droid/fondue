import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import { GAME_NAME, GAME_VERSION } from './src/config/game.ts';

function gitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

const escHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Puts the game name from src/config/game.ts into the page title of index.html, and name plus version
 * (for example "Fondue v0.3") into the home screen app name (dev server and build).
 */
function gameTitle(): Plugin {
  const title = escHtml(GAME_NAME);
  const appTitle = escHtml(`${GAME_NAME} v${GAME_VERSION}`);
  return {
    name: 'game-title',
    transformIndexHtml: (html) => html.replace('%GAME_NAME%', title).replaceAll('%APP_TITLE%', appTitle),
  };
}

export default defineConfig({
  plugins: [gameTitle()],
  // GitHub Pages serves the site from /<repo>/.
  base: process.env.GITHUB_ACTIONS ? '/fondue/' : '/',
  define: {
    __GAME_VERSION__: JSON.stringify(gitHash()),
  },
});
