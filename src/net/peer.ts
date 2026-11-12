// The normal co-op link: a direct WebRTC connection between host and guest through PeerJS.
import Peer, { type DataConnection } from 'peerjs';
import type { NetMessage } from './protocol';
import { BaseTransport, type RoomHost, type Transport, type TransportKind } from './transport';

const ID_PREFIX = 'fondue-game-v1-';

/** STUN helps peers find their public addresses. No free account-less TURN relay is used; see docs. */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

class PeerLink extends BaseTransport {
  constructor(private conn: DataConnection) {
    super();
    conn.on('data', (d) => this.onMessage(d as NetMessage));
    conn.on('close', () => this.onClose());
    conn.on('error', () => this.onClose());
  }
  send(msg: NetMessage) {
    if (this.conn.open) void this.conn.send(msg);
  }
  close() { this.conn.close(); }
  congested() { return (this.conn.dataChannel?.bufferedAmount ?? 0) > 128_000; }
}

export const peerTransport: TransportKind = {
  host(code, onGuest, onError): Promise<RoomHost> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(ID_PREFIX + code, { config: { iceServers: ICE_SERVERS } });
      let opened = false;
      peer.on('open', () => {
        opened = true;
        resolve({ close: () => peer.destroy() });
      });
      peer.on('connection', (conn) => {
        conn.on('open', () => onGuest(new PeerLink(conn)));
      });
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
      peer.on('error', (err) => {
        const msg = `Connection service error: ${err.type}`;
        if (!opened) reject(new Error(msg));
        else onError(msg);
      });
    });
  },

  join(code): Promise<Transport> {
    return new Promise((resolve, reject) => {
      const peer = new Peer({ config: { iceServers: ICE_SERVERS } });
      const fail = (message: string) => { peer.destroy(); reject(new Error(message)); };
      const timer = setTimeout(
        () => fail('Could not reach the host. Direct connections may be blocked; try the relay (see START-HIER).'),
        15000,
      );
      peer.on('error', (err) => {
        clearTimeout(timer);
        fail(err.type === 'peer-unavailable' ? 'Room not found. Check the code.' : `Connection error: ${err.type}`);
      });
      peer.on('open', () => {
        const conn = peer.connect(ID_PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => {
          clearTimeout(timer);
          const link = new PeerLink(conn);
          const close = link.close.bind(link);
          link.close = () => { close(); peer.destroy(); };
          resolve(link);
        });
      });
    });
  },
};
