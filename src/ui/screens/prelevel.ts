// The short step before every level and endless run (D2): a strip of the five slots with the weapon
// worn in each. Tapping a slot opens the weapons that fit it right below; tapping one wears it. It sits
// inside the level card of the campaign map and on the endless page, so "Play" stays one tap away.
// Wearing goes through src/modes/progress.ts (`equip`); weapons keep their tier either way.
import { SLOTS } from '../../config/slots';
import { TIER_MAX } from '../../config/tiers';
import { weaponById } from '../../config/weapons';
import { equip, slotOpen, slotRole, unlockLevelOf, weaponsForRole } from '../../modes';
import { esc, pipsHtml, weaponUri } from '../html';
import type { ScreenContext } from './context';

/** The slot whose choice is open below the strip, or null. */
let openSlot: number | null = null;

/** Closes the choice (when the card or page closes). */
export function resetLoadout(): void { openSlot = null; }

/** The five slots, and under them the choice for the tapped slot. */
export function loadoutHtml(ctx: ScreenContext): string {
  const p = ctx.profile;
  const tiles = SLOTS.map((s, i) => {
    const open = slotOpen(p, ctx.world, i);
    const id = p.data.keep.loadout[i];
    const def = id ? weaponById(id) : undefined;
    const inner = !open ? '<span class="lo-lock" aria-hidden="true">🔒</span>'
      : def ? `<img src="${weaponUri(def.id, p.weaponTier(def.id) || 1)}" alt="">` : '<span class="lo-empty" aria-hidden="true">+</span>';
    const label = !open ? `${s.name} slot, opens after level ${unlockLevelOf(ctx.world, 'slot', i) ?? s.unlockLevel}`
      : `${s.name} slot: ${def ? `${def.name}, tier ${p.weaponTier(def.id)}` : 'empty'}. Tap to change.`;
    return `<button class="lo-tile ${open ? '' : 'locked'} ${openSlot === i ? 'on' : ''}" data-a="loSlot" data-slot="${i}" id="lo-${i}" ${open ? '' : 'disabled'} aria-label="${esc(label)}">${inner}<span class="lo-role">${esc(s.name)}</span></button>`;
  }).join('');
  let choice = '';
  if (openSlot !== null && slotOpen(p, ctx.world, openSlot)) {
    const role = slotRole(openSlot);
    const owned = role ? weaponsForRole(role).filter((w) => p.hasWeapon(w.id)) : [];
    const worn = p.data.keep.loadout[openSlot];
    const picks = owned.map((w) => `<button class="lo-pick ${worn === w.id ? 'on' : ''}" data-a="loPick" data-slot="${openSlot}" data-id="${w.id}" title="${esc(w.name)}" aria-label="${esc(`Wear ${w.name}`)}">
        <img src="${weaponUri(w.id, p.weaponTier(w.id) || 1)}" alt=""><span>${esc(w.name)}</span>${pipsHtml(p.weaponTier(w.id), TIER_MAX)}</button>`).join('');
    const none = worn ? `<button class="lo-pick none" data-a="loPick" data-slot="${openSlot}" data-id="" aria-label="Leave the slot empty"><span>Empty</span></button>` : '';
    choice = `<div class="lo-choice" id="loChoice">${picks}${none}${owned.length <= 1 ? '<span class="lo-hint">More weapons in the Keep Shop.</span>' : ''}</div>`;
  }
  return `<div class="loadout" id="loadout"><div class="lo-strip">${tiles}</div>${choice}</div>`;
}

/**
 * Handles the strip's buttons. Returns true if the action was one of them; the caller then redraws
 * whatever holds the strip.
 */
export function loadoutAction(action: string, el: HTMLElement, ctx: ScreenContext): boolean {
  if (action === 'loSlot') {
    const slot = Number(el.dataset.slot);
    openSlot = openSlot === slot ? null : slot;
    return true;
  }
  if (action === 'loPick') {
    const slot = Number(el.dataset.slot);
    const id = el.dataset.id || null;
    equip(ctx.profile, slot, id, ctx.world);
    ctx.profile.flushSync();
    openSlot = null;
    return true;
  }
  return false;
}
