import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';

// The Capacitor CLI cannot follow imports of TypeScript files, so the name is read from its one home.
const GAME_NAME = /GAME_NAME = '([^']+)'/.exec(readFileSync('src/config/game.ts', 'utf8'))![1];

/**
 * The Android test app is a thin shell around the published web game, so every release reaches it
 * without a new app build. A store version must bundle the game instead (docs/ENTSCHEIDUNGEN.md, E-019).
 */
const config: CapacitorConfig = {
  appId: 'io.github.onlineshopbuildingdroid.game',
  appName: GAME_NAME,
  webDir: 'dist',
  server: { url: 'https://onlineshopbuilding-droid.github.io/fondue/' },
};

export default config;
