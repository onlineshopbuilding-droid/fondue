import { describe, expect, it, vi } from 'vitest';
import { TUNING_DEFAULT } from '../../src/config/tuning';
import { WORLD } from '../../src/config/world';
import { GuestSession, HostSession } from '../../src/game/session';
import type { NetMessage } from '../../src/net/protocol';
import type { Transport } from '../../src/net/transport';

/** Two in-memory ends of a link. Messages arrive only when flush() is called. */
function pipe() {
  const toB: NetMessage[] = [];
  const toA: NetMessage[] = [];
  const end = (out: NetMessage[]): Transport & { closed: boolean } => ({
    closed: false,
    onMessage: () => {},
    onClose: () => {},
    send(m) { out.push(JSON.parse(JSON.stringify(m))); },
    close() { this.closed = true; },
  });
  const a = end(toB);
  const b = end(toA);
  return {
    a, b,
    flush() {
      for (const m of toB.splice(0)) b.onMessage(m);
      for (const m of toA.splice(0)) a.onMessage(m);
    },
  };
}

function setup() {
  vi.useFakeTimers({ toFake: ['performance'] });
  const host = new HostSession({ seed: 1, difficulty: 'medium', names: ['A', 'B'], tuning: { ...TUNING_DEFAULT }, coop: true });
  const p = pipe();
  host.attach(p.a);
  const guest = new GuestSession(p.b);
  const tick = (ms = 1000 / 60) => {
    vi.advanceTimersByTime(ms);
    host.update(ms);
    p.flush();
    guest.update(ms);
    p.flush();
  };
  return { host, guest, p, tick };
}

function toBattle(tick: (ms?: number) => void, host: HostSession) {
  for (let i = 0; i < 400 && host.sim.s.phase !== 'battle'; i++) tick();
  host.sim.s.spawnQueue = [];
  for (let i = 0; i < 12; i++) tick();
}

describe('host and guest sessions', () => {
  it('a pause on any tick reaches the guest', () => {
    for (const extra of [0, 1]) {
      const { host, guest, tick } = setup();
      toBattle(tick, host);
      for (let i = 0; i < extra; i++) tick();
      host.send({ k: 'pause', paused: true });
      for (let i = 0; i < 30; i++) tick();
      expect(guest.view()?.paused).toBe(true);
      vi.useRealTimers();
    }
  });

  it('the held enemy stays stable at a low guest frame rate', () => {
    const { host, guest, tick } = setup();
    toBattle(tick, host);
    const e = host.sim.spawnEnemy('grunt', 700);
    for (let i = 0; i < 20; i++) tick();
    const live = guest.view()!.enemies.find((q) => q.id === e.id)!;
    guest.setHand(live.x, live.y - 40);
    guest.localPress(live.x, live.y - 40);
    guest.setHand(600, 300);
    for (let i = 0; i < 60; i++) tick(1000 / 20);
    const shown = guest.view()!.enemies.find((q) => q.id === e.id)!;
    expect(Math.abs(shown.x - 600)).toBeLessThan(80);
    expect(Math.abs(shown.y - 340)).toBeLessThan(120);
    vi.useRealTimers();
  });

  it('the thrown enemy flies at once on the guest, before the host answers', () => {
    const { host, guest, p, tick } = setup();
    toBattle(tick, host);
    const e = host.sim.spawnEnemy('grunt', 700);
    for (let i = 0; i < 20; i++) tick();
    const live = guest.view()!.enemies.find((q) => q.id === e.id)!;
    guest.setHand(live.x, live.y - 40);
    guest.localPress(live.x, live.y - 40);
    for (let i = 0; i < 20; i++) tick();
    guest.setHand(live.x, 300);
    guest.localRelease(0, -1500);
    // No flush: the host has not heard about the release yet.
    vi.advanceTimersByTime(50);
    guest.update(50);
    const shown = guest.view()!.enemies.find((q) => q.id === e.id)!;
    expect(shown.st).toBe('air');
    expect(shown.y).toBeLessThan(300);
    expect(p).toBeTruthy();
    vi.useRealTimers();
  });

  it('a refused grab ends as soon as someone else is seen holding it', () => {
    const { host, guest, tick } = setup();
    toBattle(tick, host);
    const e = host.sim.spawnEnemy('grunt', 700);
    for (let i = 0; i < 20; i++) tick();
    host.setHand(e.x, e.y - 40);
    const live = guest.view()!.enemies.find((q) => q.id === e.id)!;
    guest.setHand(live.x, live.y - 40);
    guest.localPress(live.x, live.y - 40);
    host.localPress(e.x, e.y - 40);
    for (let i = 0; i < 40; i++) tick();
    expect(guest.view()!.enemies.find((q) => q.id === e.id)!.heldBy).toEqual([0]);
    vi.useRealTimers();
  });

  it('closing an old link does not disturb the new one', () => {
    const { host, p } = setup();
    const fresh = pipe();
    const oldLink = p.a;
    const staleClose = oldLink.onClose;
    host.attach(fresh.a);
    expect(oldLink.closed).toBe(true);
    staleClose();
    oldLink.onClose();
    expect(host.connection()).toBe('connected');
    vi.useRealTimers();
  });

  it('long silence counts as a lost connection on both sides', () => {
    const { host, guest, tick } = setup();
    toBattle(tick, host);
    // Both tabs keep running frame by frame, but nothing arrives for a bit over four seconds.
    // (A single frame that comes four seconds late is the tab's own freeze; see the test below.)
    for (let i = 0; i < 4100 / 16; i++) { vi.advanceTimersByTime(16); host.update(16); guest.update(16); }
    host.update(16);
    guest.update(16);
    expect(host.connection()).toBe('lost');
    expect(guest.connection()).toBe('lost');
    expect(tick).toBeTruthy();
    vi.useRealTimers();
  });

  it('splits long event lists into small messages', () => {
    const { host, p } = setup();
    const sent: NetMessage[] = [];
    const send = p.a.send.bind(p.a);
    p.a.send = (m) => { sent.push(m); send(m); };
    while (host.sim.s.phase !== 'battle') host.update(16.7);
    host.sim.s.spawnQueue = [];
    for (let i = 0; i < 150; i++) {
      const e = host.sim.spawnEnemy('grunt', WORLD.cauldron.x + 400);
      e.hp = 0.1;
      (host.sim as unknown as { hurt(e: unknown, a: number, c: string, p: number): void }).hurt(e, 1, 'blast', 0);
    }
    host.update(40);
    const lists = sent.filter((m) => m.k === 'ev') as Extract<NetMessage, { k: 'ev' }>[];
    expect(lists.length).toBeGreaterThanOrEqual(3);
    for (const l of lists) expect(l.l.length).toBeLessThanOrEqual(60);
    vi.useRealTimers();
  });

  it('skips snapshots while the channel is backed up', () => {
    const { host, p } = setup();
    const sent: NetMessage[] = [];
    p.a.send = (m) => sent.push(m);
    p.a.congested = () => true;
    for (let i = 0; i < 30; i++) host.update(16.7);
    expect(sent.some((m) => m.k === 's')).toBe(false);
    vi.useRealTimers();
  });

  it('continuing alone resumes a game paused by a player before the drop', () => {
    const { host, tick } = setup();
    toBattle(tick, host);
    host.send({ k: 'pause', paused: true });
    (host as unknown as { onLinkLost(): void }).onLinkLost();
    expect(host.sim.s.meta.pausedBy).toBe('Connection lost');
    host.continueAlone();
    expect(host.sim.s.paused).toBe(false);
    vi.useRealTimers();
  });

  it('a tab that froze for a while does not mistake the freeze for silence', () => {
    const { host, guest, p, tick } = setup();
    toBattle(tick, host);
    // Both tabs freeze for six seconds; the first frame after it runs before the queued messages.
    vi.advanceTimersByTime(6000);
    host.update(1000 / 60);
    guest.update(1000 / 60);
    expect(host.connection()).toBe('connected');
    expect(guest.connection()).toBe('connected');
    p.flush();
    for (let i = 0; i < 30; i++) tick();
    expect(host.connection()).toBe('connected');
    expect(guest.connection()).toBe('connected');
    vi.useRealTimers();
  });
});
