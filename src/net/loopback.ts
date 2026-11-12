// A link between two tabs of the same browser over a BroadcastChannel, for the co-op tests.
import type { NetMessage } from './protocol';
import { BaseTransport, type RoomHost, type Transport, type TransportKind } from './transport';

type Frame = { from: string; to: string; msg?: NetMessage; sys?: 'join' | 'accept' | 'bye' };

class LoopLink extends BaseTransport {
  closed = false;
  constructor(private ch: BroadcastChannel, private me: string, private other: string) {
    super();
  }
  send(msg: NetMessage) {
    if (!this.closed) this.ch.postMessage({ from: this.me, to: this.other, msg } satisfies Frame);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.ch.postMessage({ from: this.me, to: this.other, sys: 'bye' } satisfies Frame);
  }
  remoteClosed() {
    if (this.closed) return;
    this.closed = true;
    this.onClose();
  }
}

/** In-browser transport for tests: two tabs of the same origin talk over a BroadcastChannel. */
export const loopbackTransport: TransportKind = {
  async host(code, onGuest): Promise<RoomHost> {
    const ch = new BroadcastChannel(`fondue-loop-${code}`);
    const links = new Map<string, LoopLink>();
    ch.onmessage = (ev: MessageEvent<Frame>) => {
      const f = ev.data;
      if (f.to !== 'host') return;
      if (f.sys === 'join') {
        const link = new LoopLink(ch, 'host', f.from);
        links.set(f.from, link);
        ch.postMessage({ from: 'host', to: f.from, sys: 'accept' } satisfies Frame);
        onGuest(link);
      } else if (f.sys === 'bye') {
        links.get(f.from)?.remoteClosed();
        links.delete(f.from);
      } else if (f.msg) {
        links.get(f.from)?.onMessage(f.msg);
      }
    };
    return { close() { for (const l of links.values()) l.close(); ch.close(); } };
  },

  join(code): Promise<Transport> {
    return new Promise((resolve, reject) => {
      const me = `guest-${Math.random().toString(36).slice(2, 8)}`;
      const ch = new BroadcastChannel(`fondue-loop-${code}`);
      let link: LoopLink | null = null;
      const timer = setTimeout(() => { ch.close(); reject(new Error('Room not found.')); }, 4000);
      ch.onmessage = (ev: MessageEvent<Frame>) => {
        const f = ev.data;
        if (f.to !== me) return;
        if (f.sys === 'accept') {
          clearTimeout(timer);
          link = new LoopLink(ch, me, 'host');
          resolve(link);
        } else if (f.sys === 'bye') {
          link?.remoteClosed();
        } else if (f.msg) {
          link?.onMessage(f.msg);
        }
      };
      ch.postMessage({ from: me, to: 'host', sys: 'join' } satisfies Frame);
    });
  },
};
