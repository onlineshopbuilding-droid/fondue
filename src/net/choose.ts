// Picks the co-op link for this page. The one place that knows which transports exist, so that a rented
// relay or matchmaking server later is one more entry here and nothing else in the game changes.
import { loopbackTransport } from './loopback';
import { peerTransport } from './peer';
import { relayTransport } from './relay';
import type { TransportKind } from './transport';

export interface TransportChoice {
  /** `?net=` of the page: `loopback` links two tabs of one browser (tests). */
  net: string | null;
  /** The relay address from the settings; empty for the direct link. */
  relayAddress: string;
}

/** Direct WebRTC (PeerJS) by default; a relay server when one is set; loopback for tests. */
export function pickTransport(c: TransportChoice): TransportKind {
  if (c.net === 'loopback') return loopbackTransport;
  const relay = c.relayAddress.trim();
  return relay ? relayTransport(relay) : peerTransport;
}
