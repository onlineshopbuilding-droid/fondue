// Pieces shared by the two room pages (host and join): the live list of who is in the room.
// The list has one line per seat, so three or four players later only need more seats.
import { esc } from '../html';
import type { ScreenContext } from './context';

/** The small "In this room" window: own name first, then the others or free seats. */
export function roomMembers(ctx: ScreenContext): string {
  const rows = ctx.coop.members().map((name, i) => (name === null
    ? `<li class="seat free" data-seat="${i}">Free seat</li>`
    : `<li class="seat" data-seat="${i}">${esc(name)}${i === 0 ? ' <span class="you">(you)</span>' : ''}</li>`)).join('');
  return `<div class="room-box" id="roomMembers"><div class="room-title">In this room</div><ul class="seats">${rows}</ul></div>`;
}
