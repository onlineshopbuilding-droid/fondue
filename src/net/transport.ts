// The common shape of every co-op link (PeerJS, relay, loopback) and the room a host opens for a guest.
import type { NetMessage } from './protocol';

/** One bidirectional link between the host and a guest. */
export interface Transport {
  send(msg: NetMessage): void;
  onMessage: (msg: NetMessage) => void;
  onClose: () => void;
  close(): void;
  /** True while outgoing data is piling up; snapshots are then skipped. */
  congested?(): boolean;
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
  const out = orderedDelivery(delay);
  const incoming = orderedDelivery(delay);
  const wrapped: Transport = {
    onMessage: () => {},
    onClose: () => {},
    send(msg) { out(() => inner.send(msg)); },
    close() { inner.close(); },
    congested: () => inner.congested?.() ?? false,
  };
  inner.onMessage = (msg) => { incoming(() => wrapped.onMessage(msg)); };
  inner.onClose = () => wrapped.onClose();
  return wrapped;
}

/**
 * Runs jobs after a delay, strictly in the order they were queued, like a reliable channel: a late
 * packet holds up the ones behind it. One timer per job would not do, because browsers truncate
 * timer delays to whole milliseconds and a later job aiming at the same moment could overtake.
 */
function orderedDelivery(delay: () => number) {
  const queue: { at: number; job: () => void }[] = [];
  let last = 0;
  let armed = false;
  const arm = () => {
    if (armed || queue.length === 0) return;
    armed = true;
    setTimeout(pump, Math.ceil(Math.max(0, queue[0].at - performance.now())));
  };
  const pump = () => {
    armed = false;
    try {
      const now = performance.now();
      while (queue.length > 0 && queue[0].at <= now) queue.shift()!.job();
    } finally {
      arm();
    }
  };
  return (job: () => void) => {
    last = Math.max(last, performance.now() + delay());
    queue.push({ at: last, job });
    arm();
  };
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
