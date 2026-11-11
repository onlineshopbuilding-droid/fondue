// The "ready" line and buttons that end the break between two days, shared by results and market.
// Alone it is a plain "Next Day" button; in co-op both players must be ready, or the host forces the start.
import type { Meta } from '../../sim/types';
import { esc } from '../html';
import type { ScreenContext } from './context';

export function readyLine(ctx: ScreenContext, meta: Meta): string {
  if (meta.names.length < 2) return '';
  const me = ctx.session?.me ?? 0;
  const other = 1 - me;
  const mine = meta.ready[me];
  return `<div class="status" id="readyStatus">${mine ? `Waiting for ${esc(meta.names[other])}...` : meta.ready[other] ? `${esc(meta.names[other])} is ready!` : ''}</div>`;
}

export function nextButtons(ctx: ScreenContext, meta: Meta): string {
  const me = ctx.session?.me ?? 0;
  const label = meta.names.length > 1 ? (meta.ready[me] ? 'Not ready' : 'Ready') : 'Next Day';
  const force = ctx.session?.role === 'host' && meta.ready[0] ? '<button class="alt" data-a="force">Start anyway</button>' : '';
  return `<button class="alt" id="ready" data-a="ready">${label}</button>${force}`;
}

/** Handles the two buttons above; returns true if the action was one of them. */
export function onReadyAction(action: string, ctx: ScreenContext): boolean {
  const s = ctx.session;
  if (action === 'force') { s?.send({ k: 'forceStart' }); return true; }
  if (action !== 'ready') return false;
  const meta = s?.meta();
  if (s && meta) s.send({ k: 'ready', ready: !meta.ready[s.me] });
  return true;
}
