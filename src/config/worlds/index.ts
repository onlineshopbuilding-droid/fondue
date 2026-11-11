/**
 * The directory of all worlds. Fondue is world 1; a later world is one more folder and one more
 * line here.
 */
import { FONDUE_WORLD } from './fondue/world';
import type { LevelDef, WorldDef } from './types';

export const WORLDS: Record<string, WorldDef> = {
  [FONDUE_WORLD.id]: FONDUE_WORLD,
};

export const DEFAULT_WORLD = FONDUE_WORLD.id;

export function worldById(id: string): WorldDef {
  return WORLDS[id] ?? WORLDS[DEFAULT_WORLD];
}

export function levelOf(worldId: string, level: number): LevelDef | undefined {
  return worldById(worldId).campaign[level - 1];
}
