import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function gitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/.
  base: process.env.GITHUB_ACTIONS ? '/fondue/' : '/',
  define: {
    __GAME_VERSION__: JSON.stringify(gitHash()),
  },
});
