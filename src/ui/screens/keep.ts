// The keep shop (decision E-064: it replaces the old Armoury and keeps its screen id 'armoury').
// The keep is seen from outside, built from the same pictures as the battlefield: the castle stage of the
// current castle tier, the gate, and the weapon worn in each of the five slots at its place on the wall.
// Every slot, the gate (castle), the hand and the two stations are large spots to tap; the panel on the
// right shows what can be done there. All buying and wearing goes through src/modes/progress.ts.
import { CURRENCIES } from '../../config/currencies';
import { HANDS } from '../../config/hand';
import { CASTLE_TIERS, STATIONS, STATION_IDS, type StationId } from '../../config/keep';
import { SLOTS, SLOT_COUNT, slotOfRole } from '../../config/slots';
import { TIER_CAP_BY_LEVEL, TIER_MAX } from '../../config/tiers';
import { weaponById, type WeaponDef } from '../../config/weapons';
import { weaponUnlockLevel } from '../../config/worlds/fondue/unlocks';
import { PROPS } from '../../art/props';
import {
  buy, equip, quote, slotIntro, slotOpen, slotRole, unlockLevelOf, weaponsForRole, type Price, type Quote, type Target,
} from '../../modes';
import { BACK_BUTTON, esc, pipsHtml, propUri, weaponUri } from '../html';
import { finishFirstUpgrade, firstUpgradeDue } from '../../modes/tutorial';
import { FIRST_UPGRADE } from '../../config/tutorial';
import { FIRST_UPGRADE_LINES } from '../../config/worlds/fondue/story';
import type { ScreenContext } from './context';
import { kingSaysHtml } from './won';
import type { Screen } from './screen';

/** A spot of the keep: one of the five slots, the castle (the gate), the hand or a station. */
export type SpotId = `slot${number}` | 'castle' | 'hand' | StationId;

/** The part of the world the keep picture shows (world units, as on the battlefield). */
const VIEW = { x: -60, y: 100, w: 480, h: 590 } as const;
/** Where the hand and the two stations are drawn beside the keep, on the road (world units). */
const SIDE_SPOTS: Record<'hand' | StationId, { x: number; y: number }> = {
  perch: { x: 330, y: 200 },
  cauldron: { x: 330, y: 370 },
  hand: { x: 330, y: 545 },
};
/** The gate's centre: the spot to build the castle. */
const GATE_SPOT = { x: 148, y: 560 };

let selected: SpotId = 'slot0';
/** The guided first upgrade (D4): it opened the damage slot once; the King praises the purchase until the shop is left. */
let guideStarted = false;
let guidePraise = false;
const GLOW = 'box-shadow:0 0 0 4px #ffd34d,0 0 22px 8px rgba(255,211,77,0.85)';

/** The tutorial's hook: the King's line on top of the panel, the glowing wheel spot and its upgrade button. */
function guideHtml(ctx: ScreenContext, panel: string): { king: string; panel: string; due: boolean } {
  const due = firstUpgradeDue(ctx.profile, ctx.world);
  if (guidePraise) return { king: kingSaysHtml([FIRST_UPGRADE_LINES.done], 'shopGuide'), panel, due };
  if (!due) return { king: '', panel, due };
  const onWheel = selected === `slot${slotOfRole('damage')}`;
  const button = `data-a="buy" data-kind="weapon" data-id="${FIRST_UPGRADE.weapon}"`;
  return {
    king: kingSaysHtml([onWheel ? FIRST_UPGRADE_LINES.buy : FIRST_UPGRADE_LINES.pickSlot], 'shopGuide'),
    panel: onWheel ? panel.replace(button, `${button} id="guideBuy" style="${GLOW}"`) : panel,
    due,
  };
}

const pct = (v: number, from: number, size: number) => `${(((v - from) / size) * 100).toFixed(2)}%`;
const isSpot = (s: string): s is SpotId => s === 'castle' || s === 'hand' || (STATION_IDS as string[]).includes(s) || /^slot[0-4]$/.test(s);
const slotOf = (s: SpotId) => (s.startsWith('slot') ? Number(s.slice(4)) : -1);

export function priceHtml(p: Price): string {
  const parts: string[] = [];
  if (p.cheese) parts.push(`${CURRENCIES.cheese.icon}${p.cheese}`);
  if (p.gold) parts.push(`${CURRENCIES.gold.icon}${p.gold.toLocaleString('en-US')}`);
  if (p.crests) parts.push(`${CURRENCIES.crests.icon}${p.crests}`);
  return parts.join(' ') || 'free';
}

/** The wallet: cheese, gold and Raider Crests, always at the top. */
export function walletHtml(ctx: ScreenContext): string {
  const w = ctx.profile.data.wallet;
  const chip = (id: string, icon: string, n: number, title: string) =>
    `<span class="wal-chip" title="${esc(title)}"><span class="wal-ico" aria-hidden="true">${icon}</span><span id="${id}">${n.toLocaleString('en-US')}</span></span>`;
  return `<div class="wallet" id="wallet" aria-label="Your cheese, gold and Raider Crests">${chip('walletCheese', CURRENCIES.cheese.icon, w.cheese, CURRENCIES.cheese.name)}${chip('walletGold', CURRENCIES.gold.icon, w.gold, CURRENCIES.gold.name)}${chip('walletCrests', CURRENCIES.crests.icon, w.crests, CURRENCIES.crests.name)}</div>`;
}

/** The won level from which the tier cap allows `tier`; null when only the Eagle Perch opens it. */
function capLevel(tier: number): number | null {
  for (const step of TIER_CAP_BY_LEVEL) if (step.cap >= tier) return step.afterLevel;
  return null;
}

/** Why something cannot be bought, in words a player understands. */
function whyNot(ctx: ScreenContext, q: Quote): string {
  const w = ctx.profile.data.wallet;
  switch (q.reason) {
    case 'cheese': return `Need ${q.price.cheese - w.cheese} more cheese. Win levels and their challenges.`;
    case 'gold': return `Need ${(q.price.gold - w.gold).toLocaleString('en-US')} more gold. Every level and endless run pays gold.`;
    case 'crests': return `Need ${q.price.crests - w.crests} more Raider Crests. Fling raiders onto the Eagle Perch.`;
    case 'cap': {
      const level = capLevel(q.toTier);
      return level === null ? `Tier ${q.toTier} needs the Eagle Perch.` : `Win level ${level} to build tier ${q.toTier}.`;
    }
    case 'locked': return 'The campaign has not reached it yet.';
    case 'max': return 'Top tier reached.';
    default: return '';
  }
}

function targetAttrs(t: Target): string {
  return t.kind === 'weapon' || t.kind === 'station' ? `data-kind="${t.kind}" data-id="${t.id}"` : `data-kind="${t.kind}"`;
}

/** The buy button of a quote, with the reason below when it cannot be bought. */
function buyBlock(ctx: ScreenContext, q: Quote, label: string): string {
  if (q.reason === 'max') return '<span class="sh-max">Top tier</span>';
  const btn = `<button class="small buy" data-a="buy" ${targetAttrs(q.target)} ${q.allowed ? '' : 'disabled'}>${esc(label)} <span class="sh-price">${priceHtml(q.price)}</span></button>`;
  return `${btn}${q.allowed ? '' : `<div class="sh-why">${esc(whyNot(ctx, q))}</div>`}`;
}

// --- The keep picture ------------------------------------------------------------------------

function image(name: string, x: number, y: number, origin: 'bottomLeft' | 'centre', size?: number): string {
  const a = PROPS[name];
  const uri = propUri(name);
  if (!a || !uri) return '';
  const w = size ?? a.w;
  const h = size ? (a.h / a.w) * size : a.h;
  const left = origin === 'centre' ? x - w / 2 : x;
  const top = origin === 'centre' ? y - h / 2 : y - h;
  return `<image href="${uri}" x="${left}" y="${top}" width="${w}" height="${h}"/>`;
}

function keepPicture(ctx: ScreenContext): string {
  const p = ctx.profile;
  const k = p.data.keep;
  const stage = Math.max(0, Math.min(CASTLE_TIERS.length, k.castleTier) - 1);
  const weapons = SLOTS.map((s, i) => {
    const id = k.loadout[i];
    if (!id || !slotOpen(p, ctx.world, i)) return '';
    return `<image href="${weaponUri(id, p.weaponTier(id) || 1)}" x="${s.x - 60}" y="${s.y - 60}" width="120" height="120"/>`;
  }).join('');
  const side = [
    image('handOpen', SIDE_SPOTS.hand.x, SIDE_SPOTS.hand.y, 'centre', 74),
    image('cauldronBack', SIDE_SPOTS.cauldron.x, SIDE_SPOTS.cauldron.y, 'centre', 96) + image('cauldronFront', SIDE_SPOTS.cauldron.x, SIDE_SPOTS.cauldron.y, 'centre', 96),
    image('perchHook', SIDE_SPOTS.perch.x, SIDE_SPOTS.perch.y, 'centre', 70),
  ].join('');
  return `<svg class="sh-svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <rect x="${VIEW.x}" y="628" width="${VIEW.w}" height="70" fill="#7c9a4a"/>
      <path d="M185 628 L${VIEW.x + VIEW.w} 620 L${VIEW.x + VIEW.w} 660 L185 666 Z" fill="#c9a46a" opacity="0.8"/>
      ${image('keepGround_meadow', -40, 670, 'bottomLeft')}
      ${image(`keep${stage}`, -40, 640, 'bottomLeft')}
      ${image(`gate${stage}`, 111, 620, 'bottomLeft')}
      ${weapons}${side}
    </svg>`;
}

interface SpotView { id: SpotId; x: number; y: number; label: string; state: '' | 'locked' | 'empty' | 'ready' }

function spots(ctx: ScreenContext): SpotView[] {
  const p = ctx.profile;
  const out: SpotView[] = SLOTS.map((s, i) => {
    const open = slotOpen(p, ctx.world, i);
    const worn = p.data.keep.loadout[i];
    return { id: `slot${i}` as SpotId, x: s.x, y: s.y, label: `${s.name} slot`, state: !open ? 'locked' : worn ? '' : 'empty' };
  });
  out.push({ id: 'castle', x: GATE_SPOT.x, y: GATE_SPOT.y, label: 'Castle', state: '' });
  out.push({ id: 'hand', x: SIDE_SPOTS.hand.x, y: SIDE_SPOTS.hand.y, label: 'Hand', state: '' });
  for (const s of STATION_IDS) {
    const q = quote(p, { kind: 'station', id: s }, ctx.world);
    const owned = (p.data.keep.stations[s] ?? 0) > 0;
    out.push({ id: s, x: SIDE_SPOTS[s].x, y: SIDE_SPOTS[s].y, label: STATIONS[s].name, state: owned ? '' : q.reason === 'locked' ? 'locked' : 'ready' });
  }
  return out;
}

function spotButton(s: SpotView): string {
  const badge = s.state === 'locked' ? '<span class="sh-badge lock" aria-hidden="true">🔒</span>'
    : s.state === 'empty' ? '<span class="sh-badge plus" aria-hidden="true">+</span>'
      : s.state === 'ready' ? '<span class="sh-badge new" aria-hidden="true">!</span>' : '';
  return `<button class="sh-spot ${s.id === selected ? 'sel' : ''} ${s.state}" data-a="spot" data-spot="${s.id}" id="spot-${s.id}"
      style="left:${pct(s.x, VIEW.x, VIEW.w)};top:${pct(s.y, VIEW.y, VIEW.h)}" aria-label="${esc(s.label)}"><span class="sh-spot-name">${esc(s.label.replace(' slot', ''))}</span>${badge}</button>`;
}

// --- The panel of the chosen spot ------------------------------------------------------------

function weaponRow(ctx: ScreenContext, def: WeaponDef, slot: number): string {
  const p = ctx.profile;
  const owned = p.hasWeapon(def.id);
  const tier = owned ? p.weaponTier(def.id) : 0;
  const worn = p.data.keep.loadout[slot] === def.id;
  const open = slotOpen(p, ctx.world, slot);
  const q = quote(p, { kind: 'weapon', id: def.id }, ctx.world);
  let state = '';
  let acts = '';
  if (!owned) {
    if (q.reason === 'locked') {
      const level = weaponUnlockLevel(def.id) ?? unlockLevelOf(ctx.world, 'weapon', def.id);
      state = `<div class="sw-state lock">${level === null ? 'Not in the campaign yet' : `Unlocks after winning level ${level}`}</div>`;
    } else {
      state = `<div class="sw-state">Unlock it with cheese, then upgrade it with gold.</div>`;
      acts = buyBlock(ctx, q, 'Unlock');
    }
  } else {
    if (q.reason === 'max') state = '<div class="sw-state top">Tier 7: the very best it gets.</div>';
    else state = `<div class="sw-next"><img class="sw-now" src="${weaponUri(def.id, q.fromTier)}" alt=""><span class="sw-arrow">→</span><img class="sw-then" src="${weaponUri(def.id, q.toTier)}" alt=""><span><b>Tier ${q.fromTier} → ${q.toTier}:</b> ${esc(q.note || 'Stronger.')}</span></div>`;
    const wear = open
      ? worn ? `<button class="small secondary" data-a="unequip" data-slot="${slot}" id="unequip-${def.id}">Take off</button>`
        : `<button class="small secondary" data-a="equip" data-slot="${slot}" data-id="${def.id}" id="equip-${def.id}">Wear</button>`
      : '';
    acts = `${wear}${buyBlock(ctx, q, `Tier ${q.toTier}`)}`;
  }
  return `<div class="sw-row ${owned ? 'owned' : 'locked'} ${worn ? 'worn' : ''}" data-weapon-card="${def.id}">
      <img class="sw-pic" src="${weaponUri(def.id, tier || 1)}" alt="">
      <div class="sw-main">
        <div class="sw-name">${esc(def.name)} ${owned ? pipsHtml(tier, TIER_MAX) : ''}${worn ? '<span class="sw-worn">Worn</span>' : ''}</div>
        <div class="sw-desc">${esc(def.desc)}</div>
        ${state}
      </div>
      <div class="sw-acts">${acts}</div>
    </div>`;
}

function slotPanel(ctx: ScreenContext, slot: number): string {
  const def = SLOTS[slot];
  const role = slotRole(slot);
  const open = slotOpen(ctx.profile, ctx.world, slot);
  const level = unlockLevelOf(ctx.world, 'slot', slot) ?? def.unlockLevel;
  const head = open
    ? `<p class="sh-lead">${esc(slotIntro(slot) || def.intro)}</p>`
    : `<p class="sh-lead lock">This slot opens after winning level ${level}. You can look already.</p>`;
  const list = role ? weaponsForRole(role).map((w) => weaponRow(ctx, w, slot)).join('') : '';
  return `<h3 class="sh-title">${esc(def.name)} slot</h3>${head}<div class="sw-list">${list}</div>`;
}

function tierPanel(ctx: ScreenContext, t: Target, title: string, lines: string[], label: string): string {
  const q = quote(ctx.profile, t, ctx.world);
  return `<h3 class="sh-title">${esc(title)} ${pipsHtml(q.fromTier, TIER_MAX)}</h3>
    ${lines.map((l) => `<p class="sh-lead">${l}</p>`).join('')}
    <div class="sh-buy">${buyBlock(ctx, q, label.replace('{tier}', String(q.toTier)))}</div>`;
}

function castlePanel(ctx: ScreenContext): string {
  const q = quote(ctx.profile, { kind: 'castle' }, ctx.world);
  const now = CASTLE_TIERS[q.fromTier - 1];
  const next = CASTLE_TIERS[q.fromTier];
  const lines = [`<b>${esc(now?.name ?? '')}</b> (tier ${q.fromTier}): ${esc(now?.desc ?? '')}`];
  if (next && q.reason !== 'max') {
    lines.push(`<span class="sh-stages" aria-hidden="true"><img src="${propUri(`keep${q.fromTier - 1}`)}" alt=""><span class="sw-arrow">→</span><img src="${propUri(`keep${q.toTier - 1}`)}" alt=""></span>`);
    lines.push(`<span class="sh-change" id="castleChange">Tier ${q.fromTier} → ${q.toTier}: gate strength <b>${q.before}</b> → <b>${q.after}</b></span>`);
    lines.push(`Next: <b>${esc(next.name)}</b>. ${esc(next.desc)}`);
  } else lines.push(`Gate strength <b>${q.before}</b>.`);
  return tierPanel(ctx, { kind: 'castle' }, 'Castle', lines, 'Build tier {tier}');
}

function handPanel(ctx: ScreenContext): string {
  const q = quote(ctx.profile, { kind: 'hand' }, ctx.world);
  const now = HANDS[q.fromTier - 1];
  const lines = [`Your hand, tier ${q.fromTier}: ${esc(now?.note ?? '')} Stronger hands throw heavy raiders further.`];
  if (q.reason !== 'max') lines.push(`<span class="sh-change" id="handChange">Tier ${q.fromTier} → ${q.toTier}: strength <b>×${q.before}</b> → <b>×${q.after}</b>. ${esc(q.note)}</span>`);
  return tierPanel(ctx, { kind: 'hand' }, 'Hand', lines, 'Train tier {tier}');
}

function stationPanel(ctx: ScreenContext, id: StationId): string {
  const def = STATIONS[id];
  const q = quote(ctx.profile, { kind: 'station', id }, ctx.world);
  const owned = (ctx.profile.data.keep.stations[id] ?? 0) > 0;
  const lines = [esc(def.desc)];
  if (!owned && q.reason === 'locked') lines.push(`<span class="sh-why">Can be unlocked after winning level ${def.unlockLevel}.</span>`);
  else if (!owned) lines.push(`<span class="sh-change">Unlock: ${esc(q.note)}</span>`);
  else if (q.reason !== 'max') lines.push(`<span class="sh-change">Tier ${q.fromTier} → ${q.toTier}: ${esc(q.note)}</span>`);
  if (!owned && q.reason === 'locked') {
    return `<h3 class="sh-title">${esc(def.name)}</h3>${lines.map((l) => `<p class="sh-lead">${l}</p>`).join('')}`;
  }
  const title = `<h3 class="sh-title">${esc(def.name)} ${owned ? pipsHtml(q.fromTier, def.tiers.length) : ''}</h3>`;
  return `${title}${lines.map((l) => `<p class="sh-lead">${l}</p>`).join('')}<div class="sh-buy">${buyBlock(ctx, q, owned ? `Tier ${q.toTier}` : 'Unlock')}</div>`;
}

function panelFor(ctx: ScreenContext, spot: SpotId): string {
  const slot = slotOf(spot);
  if (slot >= 0) return slotPanel(ctx, slot);
  if (spot === 'castle') return castlePanel(ctx);
  if (spot === 'hand') return handPanel(ctx);
  return stationPanel(ctx, spot as StationId);
}

function targetOf(el: HTMLElement): Target | null {
  const kind = el.dataset.kind;
  const id = el.dataset.id ?? '';
  if (kind === 'weapon' && weaponById(id)) return { kind, id };
  if (kind === 'station' && (STATION_IDS as string[]).includes(id)) return { kind, id: id as StationId };
  if (kind === 'castle' || kind === 'hand') return { kind };
  return null;
}

export const keepScreen: Screen = {
  id: 'armoury',
  render(ctx, arg) {
    if (arg && isSpot(arg)) selected = arg;
    if (slotOf(selected) >= SLOT_COUNT) selected = 'slot0';
    if (!guideStarted && firstUpgradeDue(ctx.profile, ctx.world)) { guideStarted = true; selected = `slot${slotOfRole('damage')}`; }
    const guide = guideHtml(ctx, panelFor(ctx, selected));
    const wheelSpot = `id="spot-slot${slotOfRole('damage')}"`;
    const spotsHtml = spots(ctx).map(spotButton).join('');
    return `<div class="panel shop" id="shop">
      <div class="sh-top">
        <div class="sh-back">${BACK_BUTTON}</div>
        <h2>Keep Shop</h2>
        ${walletHtml(ctx)}
      </div>
      <div class="sh-body">
        <div class="sh-keep" id="shopKeep">
          ${keepPicture(ctx)}
          ${guide.due ? spotsHtml.replace(wheelSpot, `${wheelSpot} data-guide="1"`).replace(/(data-guide="1"[^>]*style=")/, `$1${GLOW};`) : spotsHtml}
        </div>
        <div class="sh-side" id="shopSide" data-keep-scroll data-spot="${selected}">
          ${guide.king}${guide.panel}
        </div>
      </div>
    </div>`;
  },
  onShow(ctx) {
    ctx.query<HTMLElement>('#shopSide')?.scrollTo({ top: 0 });
  },
  onAction(action, el, ctx) {
    const p = ctx.profile;
    switch (action) {
      case 'spot': {
        const s = el.dataset.spot ?? '';
        if (isSpot(s)) {
          selected = s;
          ctx.show('armoury');
          ctx.query<HTMLElement>('#shopSide')?.scrollTo({ top: 0 });
        }
        break;
      }
      case 'buy': {
        const target = targetOf(el);
        if (!target) return;
        const guided = firstUpgradeDue(p, ctx.world);
        const q = buy(p, target, ctx.world);
        if (q.allowed) {
          ctx.audio.play('buy');
          ctx.toast(q.action === 'unlock' ? `${q.name} unlocked!` : `${q.name}: tier ${q.toTier}!`);
          // The first purchase ends the tutorial's guide, whatever was bought.
          if (guided && finishFirstUpgrade(p)) guidePraise = true;
        }
        ctx.show('armoury');
        break;
      }
      case 'equip': {
        const def = weaponById(el.dataset.id ?? '');
        if (def) equip(p, Number(el.dataset.slot), def.id, ctx.world);
        p.flushSync();
        ctx.show('armoury');
        break;
      }
      case 'unequip': {
        equip(p, Number(el.dataset.slot), null, ctx.world);
        p.flushSync();
        ctx.show('armoury');
        break;
      }
      case 'main': guidePraise = false; ctx.show('main'); break;
    }
  },
};
