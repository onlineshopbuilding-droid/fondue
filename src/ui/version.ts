// The version line of the game: the version from src/config/game.ts and the short git hash of the build.
import { GAME_VERSION } from '../config/game';

declare const __GAME_VERSION__: string;

/** Short git hash of this build ("dev" without git), set by vite.config.ts. */
export const BUILD_HASH: string = __GAME_VERSION__;

/** For example "v0.3 · build 8c1dddb". */
export const VERSION_LABEL = `v${GAME_VERSION} · build ${BUILD_HASH}`;
