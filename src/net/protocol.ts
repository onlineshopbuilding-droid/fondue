// The messages host and guest send each other, and the protocol version both must share.
import type { Command, Meta, SimEvent } from '../sim/types';
import type { WireSnapshot } from './snapshot';
import type { Difficulty } from '../config/waves';

/** What the host is about to play, shown to the guest while waiting in the room. */
export interface RoomPlan {
  mode: string;
  world: string;
  level: number | null;
  difficulty: Difficulty | null;
}

/** Bump when messages change in a breaking way. Combined with the build hash in the version check. */
export const PROTOCOL_VERSION = 4;

/** Commands without the player index; the host adds who sent it. */
export type ClientCommand = Command extends infer C ? (C extends { p: number } ? Omit<C, 'p'> : never) : never;

export type NetMessage =
  // Handshake
  | { k: 'hello'; ver: string; name: string; handTier: number }
  | { k: 'welcome'; names: string[]; inGame: boolean; plan: RoomPlan }
  | { k: 'reject'; reason: 'version' | 'full'; hostVer: string }
  // Lobby
  | { k: 'lobby'; names: string[]; plan: RoomPlan }
  // The guest's hand may have grown between two runs in the same room.
  | { k: 'hand'; handTier: number }
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
