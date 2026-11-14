// The armoury (until P-Shop builds the real shop): castle, hand, stations and every weapon by slot,
// with their lasting tiers. Everything is bought and worn through src/modes/progress.ts.
import { CURRENCIES } from '../../config/currencies';
import { STATION_IDS } from '../../config/keep';
import { SLOTS } from '../../config/slots';
import { TIER_MAX } from '../../config/tiers';
import { activeWeapons, weaponById, type WeaponDef } from '../../config/weapons';
import { buy, equip, quote, slotOpen, slotRole, unlockLevelOf, weaponRole, type Quote, type Target } from '../../modes';
import { BACK_BUTTON, esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

const WHY: Record<string, string> = {
  max: 'Maximum tier', locked: 'Not unlocked by the campaign yet', cap: 'Win more levels to build higher',
  cheese: 'Not enough cheese', gold: 'Not enough gold', crests: 'Not enough Raider Crests', unknown: '',
};

function priceText(q: Quote): string {
  const parts: string[] = [];
  if (q.price.cheese) parts.push(`${CURRENCIES.cheese.icon}${q.price.cheese}`);
  if (q.price.gold) parts.push(`${CURRENCIES.gold.icon}${q.price.gold}`);
  if (q.price.crests) parts.push(`${CURRENCIES.crests.icon}${q.price.crests}`);
  return parts.join(' ') || 'free';
}

function targetData(t: Target): string {
  return t.kind === 'weapon' || t.kind === 'station' ? `data-kind="${t.kind}" data-id="${t.id}"` : `data-kind="${t.kind}"`;
}

function buyFoot(ctx: ScreenContext, t: Target): string {
  const q = quote(ctx.profile, t, ctx.world);
  if (q.reason === 'max') return '<span class="tag">Maximum tier</span>';
  const label = q.action === 'unlock' ? 'Unlock' : `Tier ${q.toTier}`;
  const why = q.allowed ? '' : `<span class="why">${esc(WHY[q.reason] ?? '')}</span>`;
  return `${why}<button class="small" data-a="buy" ${targetData(t)} ${q.allowed ? '' : 'disabled'}>${label} ${priceText(q)}</button>`;
}

function weaponCard(ctx: ScreenContext, w: WeaponDef, slot: number): string {
  const p = ctx.profile;
  const owned = p.hasWeapon(w.id);
  const tier = p.weaponTier(w.id);
  const worn = p.data.keep.loadout[slot] === w.id;
  let foot = buyFoot(ctx, { kind: 'weapon', id: w.id });
  if (!owned && quote(p, { kind: 'weapon', id: w.id }, ctx.world).reason === 'locked') {
    const level = unlockLevelOf(ctx.world, 'weapon', w.id);
    foot = `<span class="why">${level === null ? 'Not in the campaign yet' : `Unlocks after level ${level}`}</span>`;
  }
  if (owned && slotOpen(p, ctx.world, slot)) {
    foot += worn
      ? `<button class="small secondary" data-a="unequip" data-slot="${slot}">Take off</button>`
      : `<button class="small secondary" data-a="equip" data-slot="${slot}" data-id="${w.id}">Wear</button>`;
  }
  return `<div class="item ${owned ? '' : 'locked'}" data-weapon-card="${w.id}">
      <div class="name">${esc(w.name)} <span class="tier">${owned ? `Tier ${tier}/${TIER_MAX}` : 'Not owned'}${worn ? ' · worn' : ''}</span></div>
      <div class="desc">${esc(w.desc)}</div>
      <div class="foot">${foot}</div></div>`;
}

function keepCard(ctx: ScreenContext, t: Target, id: string, title: string, now: string): string {
  const q = quote(ctx.profile, t, ctx.world);
  return `<div class="item" id="${id}">
      <div class="name">${esc(title)} <span class="tier">Tier ${q.fromTier}</span></div>
      <div class="desc note-now">${esc(now)}</div>
      ${q.note && q.reason !== 'max' ? `<div class="desc note-next">Next: ${esc(q.note)}</div>` : ''}
      <div class="foot">${buyFoot(ctx, t)}</div></div>`;
}

export const armouryScreen: Screen = {
  id: 'armoury',
  render(ctx) {
    const p = ctx.profile;
    const w = p.data.wallet;
    const weapons = activeWeapons();
    const castle = quote(p, { kind: 'castle' }, ctx.world);
    const hand = quote(p, { kind: 'hand' }, ctx.world);
    const keep = keepCard(ctx, { kind: 'castle' }, 'castleCard', 'Castle', `Gate strength ${castle.before}`)
      + keepCard(ctx, { kind: 'hand' }, 'handCard', 'The Hand', `Strength ${hand.before}`)
      + STATION_IDS.map((s) => keepCard(ctx, { kind: 'station', id: s }, `station-${s}`, quote(p, { kind: 'station', id: s }, ctx.world).name, '')).join('');
    const groups = SLOTS.map((slot, i) => {
      const list = weapons.filter((def) => weaponRole(def) === slotRole(i));
      if (list.length === 0) return '';
      const level = unlockLevelOf(ctx.world, 'slot', i);
      const slotNote = slotOpen(p, ctx.world, i) ? '' : ` <span class="why">(opens after level ${level ?? '?'})</span>`;
      return `<div class="sect">${esc(slot.name)}${slotNote}</div>${list.map((def) => weaponCard(ctx, def, i)).join('')}`;
    }).join('');
    return `<div class="panel wide"><h2>Armoury</h2>
      <div class="purse"><span class="star">${CURRENCIES.cheese.icon}</span><span id="stars">${w.cheese}</span>
        · ${CURRENCIES.gold.icon} <span id="gold">${w.gold}</span> · ${CURRENCIES.crests.icon} <span id="crests">${w.crests}</span></div>
      <div class="items"><div class="sect">Keep</div>${keep}${groups}</div>
      ${navRow(BACK_BUTTON)}</div>`;
  },
  onAction(action, el, ctx) {
    const p = ctx.profile;
    switch (action) {
      case 'buy': {
        const kind = el.dataset.kind;
        const id = el.dataset.id ?? '';
        const target: Target | null = kind === 'weapon' ? { kind, id } : kind === 'station' && (id === 'cauldron' || id === 'perch') ? { kind, id }
          : kind === 'castle' || kind === 'hand' ? { kind } : null;
        if (!target) return;
        const q = buy(p, target, ctx.world);
        if (q.allowed) ctx.toast(q.action === 'unlock' ? `${q.name} is unlocked` : `${q.name}: tier ${q.toTier}`);
        ctx.show('armoury');
        break;
      }
      case 'equip': {
        const def = weaponById(el.dataset.id ?? '');
        if (def) equip(p, Number(el.dataset.slot), def.id, ctx.world);
        ctx.show('armoury');
        break;
      }
      case 'unequip': {
        equip(p, Number(el.dataset.slot), null, ctx.world);
        ctx.show('armoury');
        break;
      }
      case 'main': ctx.show('main'); break;
    }
  },
};
