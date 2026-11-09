import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NetMessage } from '../../src/net/protocol';
import { withLatency, type Transport } from '../../src/net/transport';

/** A clock whose timers truncate their delay to whole milliseconds, as browsers do. */
function browserClock() {
  let now = 0;
  let seq = 0;
  const timers: { at: number; seq: number; fn: () => void }[] = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('setTimeout', (fn: () => void, delay = 0) => {
    timers.push({ at: now + Math.trunc(Math.max(0, delay)), seq: ++seq, fn });
    return seq;
  });
  return {
    advanceTo(t: number) {
      for (;;) {
        timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
        if (timers.length === 0 || timers[0].at > t) break;
        const next = timers.shift()!;
        now = Math.max(now, next.at);
        next.fn();
      }
      now = t;
    },
  };
}

function fakeLink() {
  const sent: NetMessage[] = [];
  const link: Transport = { onMessage: () => {}, onClose: () => {}, send: (m) => sent.push(m), close: () => {} };
  return { link, sent };
}

const ping = (t: number): NetMessage => ({ k: 'ping', t });

describe('withLatency keeps a reliable channel in order', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not let a later outgoing message overtake an earlier one', () => {
    const clock = browserClock();
    const { link, sent } = fakeLink();
    const shaped = withLatency(link, { latencyMs: 45, jitterMs: 20, loss: 0 });
    // The first message draws a long delay, the second a short one, so both aim at the same moment.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    shaped.send(ping(1));
    clock.advanceTo(16.9);
    shaped.send(ping(2));
    clock.advanceTo(200);
    expect(sent.map((m) => (m as { t: number }).t)).toEqual([1, 2]);
  });

  it('does not let a later incoming message overtake an earlier one', () => {
    const clock = browserClock();
    const { link } = fakeLink();
    const shaped = withLatency(link, { latencyMs: 45, jitterMs: 20, loss: 0 });
    const got: number[] = [];
    shaped.onMessage = (m) => got.push((m as { t: number }).t);
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    link.onMessage(ping(1));
    clock.advanceTo(16.9);
    link.onMessage(ping(2));
    clock.advanceTo(200);
    expect(got).toEqual([1, 2]);
  });

  it('still delays messages by at least the latency', () => {
    const clock = browserClock();
    const { link, sent } = fakeLink();
    const shaped = withLatency(link, { latencyMs: 45, jitterMs: 0, loss: 0 });
    shaped.send(ping(1));
    clock.advanceTo(44);
    expect(sent).toEqual([]);
    clock.advanceTo(47);
    expect(sent).toHaveLength(1);
  });

  it('keeps delivering after a receiver throws', () => {
    const clock = browserClock();
    const { link, sent } = fakeLink();
    const realSend = link.send;
    let first = true;
    link.send = (m) => {
      if (first) { first = false; throw new Error('boom'); }
      realSend(m);
    };
    const shaped = withLatency(link, { latencyMs: 45, jitterMs: 0, loss: 0 });
    shaped.send(ping(1));
    shaped.send(ping(2));
    expect(() => clock.advanceTo(100)).toThrow('boom');
    clock.advanceTo(200);
    expect(sent.map((m) => (m as { t: number }).t)).toEqual([2]);
  });
});
