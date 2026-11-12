import { describe, expect, it } from 'vitest';
import { GUIDE, POT_HINT, PotHint, PreludeGuide, kingSlide, pickTarget, type GuideEnemy, type GuideFrame } from '../../src/render/tutorialGuide';
import type { SimEvent } from '../../src/sim/types';

const LINES = ['One.', 'Two.'];
const HINTS = { grab: 'grab', fling: 'fling' };
const raider = (id: number, x: number, extra: Partial<GuideEnemy> = {}): GuideEnemy => ({ id, x, y: 620, st: 'walk', heldBy: [], hidden: false, ...extra });

function frame(enemies: GuideEnemy[], events: SimEvent[] = [], dt = 0.1, battle = true): GuideFrame {
  return { dt, battle, enemies, events, me: 0, fieldW: 1280 };
}

const grab = (id: number): SimEvent => ({ e: 'grab', id, p: 0, x: 0, y: 0, etype: 'grunt' });
const release = (id: number, speed: number, y = 600): SimEvent => ({ e: 'release', id, p: 0, speed, x: 0, y });

function runIntro(g: PreludeGuide, enemies: GuideEnemy[]) {
  for (let t = 0; t < g.introSeconds() + 0.2; t += 0.1) g.update(frame(enemies));
}

describe('prelude guide', () => {
  it('lets the King talk first, then freezes on the raider closest to the gate', () => {
    const g = new PreludeGuide(LINES, 'Well done', HINTS);
    const enemies = [raider(1, 900), raider(2, 700), raider(3, 1250)];
    g.update(frame(enemies, [], GUIDE.walk));
    expect(g.stage).toBe('intro');
    expect(g.kingLine()).toBe('One.');
    expect(g.hold).toBe(false);
    runIntro(g, enemies);
    expect(g.stage).toBe('show');
    expect(g.hold).toBe(true);
    expect(g.target).toBe(2);
    expect(g.caption()).toBe('grab');
  });

  it('runs on at the grab and ends the lesson at the first real throw', () => {
    const g = new PreludeGuide(LINES, 'Well done', HINTS);
    const enemies = [raider(2, 700)];
    runIntro(g, enemies);
    g.update(frame(enemies, [grab(2)]));
    expect(g.stage).toBe('try');
    expect(g.hold).toBe(false);
    expect(g.caption()).toBe('fling');
    g.update(frame([raider(2, 700, { st: 'air' })], [release(2, GUIDE.flingSpeed + 100)]));
    expect(g.stage).toBe('praise');
    expect(g.kingLine()).toBe('Well done');
    for (let t = 0; t < GUIDE.praiseSeconds + GUIDE.walk + 0.2; t += 0.1) g.update(frame([]));
    expect(g.stage).toBe('done');
    expect(g.kingIn()).toBe(0);
  });

  it('shows the gesture again after a weak let-go', () => {
    const g = new PreludeGuide(LINES, 'Well done', HINTS);
    const enemies = [raider(2, 700), raider(4, 800)];
    runIntro(g, enemies);
    g.update(frame(enemies, [grab(2)]));
    g.update(frame(enemies, [release(2, 50)]));
    expect(g.stage).toBe('show');
    expect(g.hold).toBe(true);
  });

  it('counts a raider lifted high and let go, since the fall does the rest', () => {
    const g = new PreludeGuide(LINES, 'Well done', HINTS);
    runIntro(g, [raider(2, 700)]);
    g.update(frame([raider(2, 700)], [grab(2)]));
    g.update(frame([raider(2, 700, { st: 'air' })], [release(2, 0, 300)]));
    expect(g.stage).toBe('praise');
  });

  it('counts a throw during the King\'s lines and never freezes then', () => {
    const g = new PreludeGuide(LINES, 'Well done', HINTS);
    g.update(frame([raider(2, 700)], [release(2, 2000)]));
    expect(g.stage).toBe('praise');
    expect(g.hold).toBe(false);
  });

  it('never freezes on a raider that is off screen, held or behind the gate', () => {
    expect(pickTarget([raider(1, 1250), raider(2, 300), raider(3, 700, { heldBy: [1] }), raider(4, 700, { hidden: true })], 1280)).toBe(-1);
    expect(pickTarget([raider(1, 900, { st: 'air' }), raider(2, 900)], 1280)).toBe(2);
  });

  it('releases the freeze when the day ends', () => {
    const g = new PreludeGuide(LINES, 'Well done', HINTS);
    runIntro(g, [raider(2, 700)]);
    g.update(frame([], [], 0.1, false));
    expect(g.stage).toBe('done');
    expect(g.hold).toBe(false);
  });
});

describe('pot hint', () => {
  it('shows the line for a while and the arrow until a raider lands in the pot', () => {
    const h = new PotHint('Into the pot!');
    h.update(1, []);
    expect(h.kingLine()).toBe('Into the pot!');
    expect(h.arrow).toBe(true);
    h.update(POT_HINT.lineSeconds, [{ e: 'splash', x: 0, y: 0, etype: 'grunt' }]);
    expect(h.kingLine()).toBeNull();
    expect(h.arrow).toBe(false);
  });

  it('takes the arrow away after some seconds even without a hit', () => {
    const h = new PotHint('x');
    h.update(POT_HINT.arrowSeconds + 0.1, []);
    expect(h.arrow).toBe(false);
    h.update(GUIDE.walk, []);
    expect(h.over).toBe(true);
  });
});

describe('king slide', () => {
  it('walks in, stays and walks out', () => {
    expect(kingSlide(0, 5)).toBe(0);
    expect(kingSlide(GUIDE.walk / 2, 5)).toBeCloseTo(0.5);
    expect(kingSlide(3, 5)).toBe(1);
    expect(kingSlide(5 + GUIDE.walk, 5)).toBe(0);
  });
});
