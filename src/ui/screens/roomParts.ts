// Pieces shared by the two room pages (host and join): the live list of who is in the room.
// The list has one line per seat, so three or four players later only need more seats.
// Next to every name stands the castle tier of that player's own profile; a co-op run is always
// played with the host's castle, which the note under the list says.
import { CASTLE_TIERS } from '../../config/keep';
import { esc } from '../html';
import type { ScreenContext } from './context';

/** "Castle tier 3 · Stone Keep" as a small badge, or nothing when the tier is unknown. */
export function castleBadge(tier: number, seat: number): string {
  const def = CASTLE_TIERS[tier - 1];
  if (!def) return '';
  return `<span class="seat-castle" id="seatCastle-${seat}" data-tier="${tier}">Castle tier ${tier} · ${esc(def.name)}</span>`;
}

/** The small "In this room" window: own name first, then the others or free seats. */
export function roomMembers(ctx: ScreenContext): string {
  const castles = ctx.coop.memberCastles();
  const rows = ctx.coop.members().map((name, i) => (name === null
    ? `<li class="seat free" data-seat="${i}">Free seat</li>`
    : `<li class="seat" data-seat="${i}"><span class="seat-name">${esc(name)}${i === 0 ? ' <span class="you">(you)</span>' : ''}</span>${castleBadge(castles[i] ?? 0, i)}</li>`)).join('');
  const hostCastle = ctx.coop.isHosting() ? 'your castle' : "the host's castle";
  return `<div class="room-box" id="roomMembers"><div class="room-title">In this room</div><ul class="seats">${rows}</ul>
    <div class="room-note" id="roomCastleNote">You defend ${hostCastle}.</div></div>`;
}
