import type { Command, Meta, SimEvent } from '../sim/types';
import type { WireSnapshot } from './snapshot';
import type { Difficulty } from '../config/waves';

/** Bump when messages change in a breaking way. Combined with the build hash in the version check. */
export const PROTOCOL_VERSION = 2;

/** Commands without the player index; the host adds who sent it. */
export type ClientCommand = Command extends infer C ? (C extends { p: number } ? Omit<C, 'p'> : never) : never;

export type NetMessage =
  // Handshake
  | { k: 'hello'; ver: string; name: string }
  | { k: 'welcome'; names: string[]; inGame: boolean; difficulty: Difficulty }
  | { k: 'reject'; reason: 'version' | 'full'; hostVer: string }
  // Lobby
  | { k: 'lobby'; names: string[]; difficulty: Difficulty }
  | { k: 'start' }
  | { k: 'leftGame' }
  // Game
  | { k: 's'; s: WireSnapshot }
  | { k: 'ev'; l: SimEvent[] }
  | { k: 'm'; m: Meta }
  | { k: 'c'; c: ClientCommand }
  | { k: 'h'; x: number; y: number }
  // Latency measurement
  | { k: 'ping'; t: number }
  | { k: 'pong'; t: number };
