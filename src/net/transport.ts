import type { NetMessage } from './protocol';

/** One bidirectional link between the host and a guest. */
export interface Transport {
  send(msg: NetMessage): void;
  onMessage: (msg: NetMessage) => void;
  onClose: () => void;
  close(): void;
}

/** Host side: waits for guests in a room. */
export interface RoomHost {
  close(): void;
}

export interface TransportKind {
  /** Opens a room; calls onGuest for every guest that connects. */
  host(code: string, onGuest: (link: Transport) => void, onError: (message: string) => void): Promise<RoomHost>;
  /** Joins a room. Rejects with a readable message on failure. */
  join(code: string): Promise<Transport>;
}

/** Base class that handles callback defaults. */
export abstract class BaseTransport implements Transport {
  onMessage: (msg: NetMessage) => void = () => {};
  onClose: () => void = () => {};
  abstract send(msg: NetMessage): void;
  abstract close(): void;
}

export interface LatencyOptions {
  latencyMs: number;
  jitterMs: number;
  /** Chance that a packet needs a retransmit, which on a reliable channel means extra delay. */
  loss: number;
}

/** Wraps a transport and delays traffic in both directions to imitate a real network. */
export function withLatency(inner: Transport, o: LatencyOptions): Transport {
  const delay = () => {
    let d = o.latencyMs + Math.random() * o.jitterMs;
    if (Math.random() < o.loss) d += o.latencyMs * 2;
    return d;
  };
  let lastOut = 0;
  let lastIn = 0;
  const wrapped: Transport = {
    onMessage: () => {},
    onClose: () => {},
    send(msg) {
      // Reliable channels deliver in order, so a late packet holds up the ones behind it.
      lastOut = Math.max(lastOut, performance.now() + delay());
      setTimeout(() => inner.send(msg), lastOut - performance.now());
    },
    close() { inner.close(); },
  };
  inner.onMessage = (msg) => {
    lastIn = Math.max(lastIn, performance.now() + delay());
    setTimeout(() => wrapped.onMessage(msg), lastIn - performance.now());
  };
  inner.onClose = () => wrapped.onClose();
  return wrapped;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, no I/1

export function makeRoomCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
