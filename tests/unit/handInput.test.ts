// Which hand a pointer event belongs to (C9): fingers on a phone, the mouse on a laptop.
import { describe, expect, it } from 'vitest';
import { PointerRouter, type RawPointer } from '../../src/input/pointer';

const touch = (pointerId: number): RawPointer => ({ pointerId, pointerType: 'touch', button: 0, buttons: 1 });
const mouse = (button: number, buttons: number): RawPointer => ({ pointerId: 1, pointerType: 'mouse', button, buttons });

describe('pointer routing', () => {
  it('first finger is the first hand, a second finger the second, a third nothing', () => {
    const r = new PointerRouter();
    expect(r.down(touch(5))).toEqual([{ hand: 0, act: 'down' }]);
    expect(r.down(touch(6))).toEqual([{ hand: 1, act: 'down' }]);
    expect(r.down(touch(7))).toEqual([]);
    expect(r.move(touch(6))).toEqual([{ hand: 1, act: 'move' }]);
    expect(r.move(touch(5))).toEqual([{ hand: 0, act: 'move' }]);
    expect(r.move(touch(7))).toEqual([]);
    expect(r.up(touch(5))).toEqual([{ hand: 0, act: 'up' }]);
    // The second finger alone does not drag the first hand along.
    expect(r.move(touch(6))).toEqual([{ hand: 1, act: 'move' }]);
    expect(r.up(touch(6))).toEqual([{ hand: 1, act: 'up' }]);
  });

  it('without the switch the right mouse button does nothing', () => {
    const r = new PointerRouter(() => false);
    expect(r.down(mouse(2, 2))).toEqual([]);
    expect(r.down(mouse(0, 1))).toEqual([{ hand: 0, act: 'down' }]);
    expect(r.move(mouse(2, 3))).toEqual([{ hand: 0, act: 'move' }]);
  });

  it('with the switch the right button alone is the second hand', () => {
    const r = new PointerRouter(() => true);
    expect(r.down(mouse(2, 2))).toEqual([{ hand: 1, act: 'down' }]);
    expect(r.move(mouse(-1, 2))).toEqual([{ hand: 0, act: 'move' }, { hand: 1, act: 'move' }]);
    expect(r.up(mouse(2, 0))).toEqual([{ hand: 1, act: 'up' }]);
  });

  it('with the switch, right pressed while left holds grabs with both hands at the mouse', () => {
    const r = new PointerRouter(() => true);
    expect(r.down(mouse(0, 1))).toEqual([{ hand: 0, act: 'down' }]);
    expect(r.move(mouse(2, 3))).toEqual([{ hand: 1, act: 'down' }, { hand: 0, act: 'move' }, { hand: 1, act: 'move' }]);
    // Left let go first: the second hand keeps holding and keeps following.
    expect(r.move(mouse(0, 2))).toEqual([{ hand: 0, act: 'up' }, { hand: 0, act: 'move' }, { hand: 1, act: 'move' }]);
    expect(r.up(mouse(2, 0))).toEqual([{ hand: 1, act: 'up' }]);
    expect(r.secondDown).toBe(false);
    expect(r.firstDown).toBe(false);
  });
});
