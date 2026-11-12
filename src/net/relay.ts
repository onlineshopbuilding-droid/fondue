// Plan B for co-op: both players connect to a tiny relay server (server/relay) that forwards everything.
import type { NetMessage } from './protocol';
import { BaseTransport, type RoomHost, type Transport, type TransportKind } from './transport';

/** Turns what people paste (https://x.trycloudflare.com, x.trycloudflare.com) into a WebSocket URL. */
export function relayUrl(address: string, room: string, role: 'host' | 'guest'): string {
  let base = address.trim().replace(/\/+$/, '');
  if (base.startsWith('https://')) base = `wss://${base.slice(8)}`;
  else if (base.startsWith('http://')) base = `ws://${base.slice(7)}`;
  else if (!base.startsWith('ws')) base = `wss://${base}`;
  return `${base}/?room=${encodeURIComponent(room)}&role=${role}`;
}

class WsLink extends BaseTransport {
  closed = false;
  constructor(private ws: WebSocket) { super(); }
  send(msg: NetMessage) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
  close() { this.closed = true; this.ws.close(); }
  congested() { return this.ws.bufferedAmount > 128_000; }
  remoteClosed() { if (!this.closed) { this.closed = true; this.onClose(); } }
}

/** Plan B: a tiny relay server (server/relay) forwards everything. */
export function relayTransport(address: string): TransportKind {
  return {
    host(code, onGuest, onError): Promise<RoomHost> {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(relayUrl(address, code, 'host'));
        let current: WsLink | null = null;
        ws.onopen = () => resolve({ close: () => ws.close() });
        ws.onerror = () => { reject(new Error('Could not reach the relay server.')); onError('Relay connection error.'); };
        ws.onclose = () => current?.remoteClosed();
        ws.onmessage = (ev) => {
          const d = JSON.parse(ev.data as string) as { sys?: string } & NetMessage;
          if (d.sys === 'guest') {
            current?.remoteClosed();
            current = new WsLink(ws);
            current.close = () => { current?.remoteClosed(); };
            onGuest(current);
          } else if (d.sys === 'guest-left') {
            current?.remoteClosed();
            current = null;
          } else if (!d.sys) {
            current?.onMessage(d);
          }
        };
      });
    },

    join(code): Promise<Transport> {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(relayUrl(address, code, 'guest'));
        const link = new WsLink(ws);
        let settled = false;
        const timer = setTimeout(() => { if (!settled) { settled = true; ws.close(); reject(new Error('Relay timed out.')); } }, 8000);
        ws.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Could not reach the relay server.')); } };
        ws.onclose = () => { if (settled) link.remoteClosed(); };
        ws.onmessage = (ev) => {
          const d = JSON.parse(ev.data as string) as { sys?: string } & NetMessage;
          if (d.sys === 'ready') {
            settled = true;
            clearTimeout(timer);
            resolve(link);
          } else if (d.sys === 'no-host') {
            settled = true;
            clearTimeout(timer);
            ws.close();
            reject(new Error('Room not found on the relay.'));
          } else if (d.sys === 'host-left') {
            link.remoteClosed();
          } else if (!d.sys) {
            link.onMessage(d);
          }
        };
      });
    },
  };
}
