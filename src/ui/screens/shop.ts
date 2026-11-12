// The market at the keep, between two days. The keep itself is the shop: the scene draws its places
// (five slots, the gate's button, the cauldron's spot, the eagle hook) and a tap on one opens that
// place's window here. Gold, offerings, the hand, the day's result and the Ready button sit around it.
// Prices and what can be bought come from `quote`, on host and guest alike.
import { weaponArt } from '../../art/weapons';
import { GATES, STATIONS, type StationId } from '../../config/keep';
import { HANDS } from '../../config/hand';
import { SLOTS } from '../../config/slots';
import { levelOf } from '../../config/worlds';
import { weaponById, weaponsForSlot, type WeaponDef } from '../../config/weapons';
import { unlockLevelOf } from '../../modes/unlocks';
import { quote, type Quote } from '../../sim/shop';
import type { Meta } from '../../sim/types';
import { artUri, esc } from '../html';
import type { ScreenContext } from './context';
import { nextButtons, onReadyAction, readyLine } from './readyControls';
import type { Screen } from './screen';

const WHY: Record<Quote['reason'], string> = {
  ok: '', unknown: 'Not for sale', owned: 'Built', locked: 'Locked', max: 'Maximum', gold: 'Not enough gold', offerings: 'Not enough offerings',
};

interface Purse { gold: number; offerings: number }

const picCache = new Map<string, string>();
/** A weapon's picture at a tier, as an address an <img> can show. */
function weaponPic(id: string, tier: number): string {
  const key = `${id}:${tier}`;
  let uri = picCache.get(key);
  if (!uri) {
    uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(weaponArt(id, tier).svg)}`;
    picCache.set(key, uri);
  }
  return uri;
}

/** Tier pips as text-free dots; gold from tier 4. */
const pips = (tier: number) => `<span class="m-pips t${tier}" aria-label="Tier ${tier}">${'<i></i>'.repeat(tier)}</span>`;

class ShopScreen implements Screen {
  readonly id = 'shop';
  /** The place whose window is open: 'slot:<i>', 'gate', 'station:<id>', 'hand'; null for none. */
  private spot: string | null = null;
  private coin = '';
  private off = '';

  /** Kept for the results screen: the market opens on the keep, with no window open. */
  openAtBestTab(ctx: ScreenContext) { this.spot = null; ctx.show('shop'); }

  /** A place on the keep was tapped (or the hand entry): opens its window. */
  openSpot(ctx: ScreenContext, spot: string) {
    this.spot = this.spot === spot ? null : spot;
    ctx.show('shop');
  }

  onShow() { this.spot = null; }
  onHide() { this.spot = null; }

  render(ctx: ScreenContext): string {
    const s = ctx.session;
    const meta = s?.meta();
    const v = s?.view();
    if (!s || !meta || !v) return '';
    this.coin = `<img src="${artUri('coin')}" alt="gold">`;
    this.off = `<img src="${artUri('offering')}" alt="offerings">`;
    const purse = { gold: v.gold, offerings: v.offerings };
    const d = meta.lastDay;
    const dayLine = d ? `<div class="m-day" id="dayResult">Day ${d.day} held · ${d.kills} raiders · +${d.goldEarned} gold · +${d.offeringsEarned} offerings · gate ${d.gatePct}%</div>` : '';
    const mine = meta.loadout.handTier[s.me] ?? 1;
    const win = this.spot ? this.window(ctx, meta, purse, this.spot) : '';
    const hint = this.spot ? '' : this.hint(meta);
    return `<div class="market${win ? ' has-win' : ''}" id="market">
      <div class="m-top">
        <div class="purse m-purse"><span>${this.coin}<span id="gold">${v.gold}</span></span><span>${this.off}<span id="offerings">${v.offerings}</span></span></div>
        <button class="m-chip${this.spot === 'hand' ? ' on' : ''}" data-a="hand" data-item="hand"><img src="${artUri('handOpen')}" alt="">Hand ${pips(mine)}</button>
      </div>
      ${hint}
      ${win}
      <div class="m-bottom">
        <div class="nav-back"><button class="secondary" data-a="toResults">Results</button></div>
        <div class="nav-forward">${dayLine}${readyLine(ctx, meta)}<div class="m-go">${nextButtons(ctx, meta)}</div></div>
      </div>
    </div>`;
  }

  /** The level's own words for this market, or a plain pointer to the keep. */
  private hint(meta: Meta): string {
    const day = meta.lastDay?.day ?? 0;
    const lv = meta.rules.level !== null ? levelOf(meta.rules.world, meta.rules.level) : undefined;
    const said = lv?.hints.filter((h) => h.when === 'market' && h.day === day).map((h) => h.text) ?? [];
    const text = said.length > 0 ? said.join(' ') : 'Tap a place on the keep to build there.';
    // A level's own words come from the King, so he shows next to them.
    const king = said.length > 0 ? `<img class="m-king" src="${artUri('kingTalk')}" alt="">` : '';
    return `<div class="m-hint${said.length > 0 ? ' level' : ''}" id="marketHint">${king}<span>${esc(text)}</span></div>`;
  }

  private price(q: Quote): string {
    if (q.gold === 0 && q.offerings === 0) return q.reason === 'ok' ? '<span class="price">Free</span>' : '';
    return `<span class="price">${q.gold > 0 ? `${this.coin}${q.gold}` : ''}${q.offerings > 0 ? `${this.off}${q.offerings}` : ''}</span>`;
  }

  /** The buy button of an item, or why it cannot be bought now. */
  private buy(meta: Meta, q: Quote, item: string, label: string): string {
    if (q.reason === 'ok') return `${this.price(q)}<button class="small" data-buy="${item}">${label}</button>`;
    const notSold = meta.rules.marketOnly !== null && !meta.rules.marketOnly.includes(item);
    const why = notSold ? 'Not sold in this level' : WHY[q.reason];
    const showPrice = q.reason === 'gold' || q.reason === 'offerings';
    return `${showPrice ? this.price(q) : ''}<span class="why">${esc(why)}</span><button class="small" data-buy="${item}" disabled>${label}</button>`;
  }

  private row(cls: string, item: string, pic: string, picTier: number, name: string, desc: string, act: string, extra = ''): string {
    return `<div class="m-row ${cls}" data-item="${esc(item)}"${extra}>
      <div class="m-pic t${picTier}"><img src="${pic}" alt=""></div>
      <div class="m-info"><div class="name">${name}</div><div class="desc">${desc}</div></div>
      <div class="m-act">${act}</div></div>`;
  }

  private window(ctx: ScreenContext, meta: Meta, purse: Purse, spot: string): string {
    const [kind, arg] = spot.split(':');
    let title = '';
    let sub = '';
    let body = '';
    if (kind === 'slot') ({ title, sub, body } = this.slotWin(meta, purse, Number(arg)));
    else if (kind === 'gate') ({ title, sub, body } = this.gateWin(meta, purse));
    else if (kind === 'station') ({ title, sub, body } = this.stationWin(meta, purse, arg as StationId));
    else if (kind === 'hand') ({ title, sub, body } = this.handWin(ctx, meta, purse));
    else return '';
    return `<div class="m-win" id="marketWindow" data-spot="${esc(spot)}"${kind === 'slot' ? ` data-slot="${Number(arg)}"` : ''}>
      <div class="m-win-head"><button class="secondary small m-close" data-a="closeWin">Close</button><div class="m-win-title">${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>
      <div class="items m-list">${body}</div></div>`;
  }

  /** The tier a weapon has in this run, or would have once bought. */
  private tierOf(meta: Meta, w: WeaponDef): number {
    return meta.loadout.weaponTier[w.id] ?? meta.rules.weapons[w.id]?.fixedTier ?? 1;
  }

  private slotWin(meta: Meta, purse: Purse, i: number) {
    const slot = SLOTS[i];
    const title = slot?.name ?? 'Slot';
    if (!slot) return { title, sub: '', body: '' };
    if (!meta.rules.slotsOpen[i]) {
      const lv = meta.rules.level !== null ? unlockLevelOf(meta.rules.world, 'slot', i) : null;
      const desc = lv === null ? 'This slot is not open in this run.' : `This slot opens from level ${lv + 1}. Win level ${lv} to build here.`;
      return { title, sub: 'Locked', body: this.row('locked', `slot:${i}`, artUri('iconLocked'), 1, 'Locked', esc(desc), '', ` data-slot="${i}"`) };
    }
    const l = meta.loadout;
    const inSlot = l.slotWeapon[i];
    const campaign = !meta.rules.tierUpgrades;
    const list = weaponsForSlot(slot.type).filter((w) => meta.rules.weapons[w.id]?.offered);
    list.sort((a, b) => (a.id === inSlot ? -1 : b.id === inSlot ? 1 : 0));
    const rows = list.map((w) => {
      const tier = this.tierOf(meta, w);
      const name = `${esc(w.name)} <span class="tier">${campaign ? `Lasting tier ${tier}` : `Tier ${tier}`}</span>${pips(tier)}`;
      const item = `weapon:${i}:${w.id}`;
      const extra = ` data-slot="${i}"`;
      if (inSlot === w.id) {
        let act = '<span class="tag">In this slot</span>';
        let desc = esc(w.desc);
        if (meta.rules.tierUpgrades) {
          const up = `upgrade:${w.id}`;
          const q = quote(meta.rules, l, purse.gold, purse.offerings, up);
          const next = w.tiers[tier]?.note;
          if (q.reason === 'max') act = '<span class="tag">Highest tier</span>';
          else {
            act = this.buy(meta, q, up, `Upgrade to ${tier + 1}`);
            if (next) desc += ` <span class="next">Tier ${tier + 1}: ${esc(next)}</span>`;
          }
        }
        return this.row('owned', item, weaponPic(w.id, tier), tier, name, desc, act, extra);
      }
      const q = quote(meta.rules, l, purse.gold, purse.offerings, item);
      const label = l.weaponTier[w.id] !== undefined ? 'Choose' : inSlot ? 'Swap' : 'Build';
      return this.row(q.reason === 'ok' ? '' : 'dim', item, weaponPic(w.id, tier), tier, name, esc(w.desc), this.buy(meta, q, item, label), extra);
    }).join('');
    const now = inSlot ? weaponById(inSlot)?.name ?? '' : '';
    const sub = now ? `Now: ${now}` : 'Empty: pick one weapon';
    return { title, sub, body: rows || '<div class="m-row locked"><div class="m-info"><div class="desc">No weapon for this slot in this run.</div></div></div>' };
  }

  private gateWin(meta: Meta, purse: Purse) {
    const l = meta.loadout;
    const q = quote(meta.rules, l, purse.gold, purse.offerings, 'gate');
    const now = GATES[l.gateTier];
    const next = GATES[l.gateTier + 1];
    let body = this.row('owned', `gate:${l.gateTier}`, artUri(`gate${l.gateTier}`), l.gateTier + 1, `${esc(now.name)} ${pips(l.gateTier + 1)}`, `${esc(now.desc)} Strength ${now.hp}.`, '<span class="tag">Built</span>');
    if (next) {
      const why = q.reason === 'locked' && meta.rules.marketOnly === null ? '<span class="why">Win more levels first</span><button class="small" data-buy="gate" disabled>Build</button>' : this.buy(meta, q, 'gate', 'Build');
      body += this.row(q.reason === 'ok' ? '' : 'dim', 'gate', artUri(`gate${l.gateTier + 1}`), l.gateTier + 2, `${esc(next.name)} ${pips(l.gateTier + 2)}`, `${esc(next.desc)} Strength ${next.hp}. The whole keep grows with it.`, why);
    }
    return { title: 'Gate and keep', sub: next ? `Build stage ${l.gateTier + 1} of ${GATES.length}` : 'The strongest gate', body };
  }

  private stationWin(meta: Meta, purse: Purse, id: StationId) {
    const def = STATIONS[id];
    if (!def) return { title: 'Offering site', sub: '', body: '' };
    const item = `station:${id}`;
    const q = quote(meta.rules, meta.loadout, purse.gold, purse.offerings, item);
    const pic = artUri(id === 'cauldron' ? 'cauldronFront' : 'perchHook');
    const act = q.reason === 'owned' ? '<span class="tag">Built</span>' : this.buy(meta, q, item, 'Build');
    return { title: def.name, sub: 'Offering site', body: this.row(q.reason === 'owned' ? 'owned' : q.reason === 'ok' ? '' : 'dim', item, pic, 1, esc(def.name), esc(def.desc), act) };
  }

  private handWin(ctx: ScreenContext, meta: Meta, purse: Purse) {
    const l = meta.loadout;
    const mine = l.handTier[ctx.session?.me ?? 0] ?? 1;
    const pic = artUri('handOpen');
    let body = this.row('owned', 'hand:now', pic, mine, `The Hand <span class="tier">Tier ${mine}</span>${pips(mine)}`, esc(HANDS[mine - 1]?.note ?? ''), '<span class="tag">Yours</span>');
    if (!meta.rules.handBuyable) {
      body += `<div class="m-note">Stronger hands come from the armoury, with stars.</div>`;
      return { title: 'Hand', sub: 'Lasting tier', body };
    }
    const q = quote(meta.rules, l, purse.gold, purse.offerings, 'hand');
    const next = HANDS[Math.max(...l.handTier)];
    if (q.reason === 'max' || !next) body += '<div class="m-note">The strongest hand.</div>';
    else body += this.row(q.reason === 'ok' ? '' : 'dim', 'hand', pic, mine + 1, `Stronger Hand <span class="tier">Tier ${mine + 1}</span>${pips(mine + 1)}`, esc(next.note), this.buy(meta, q, 'hand', 'Upgrade'));
    return { title: 'Hand', sub: `Up to tier ${HANDS.length}`, body };
  }

  onAction(action: string, el: HTMLElement, ctx: ScreenContext) {
    if (el.dataset.buy) { ctx.session?.send({ k: 'buy', item: el.dataset.buy }); return; }
    if (onReadyAction(action, ctx)) return;
    if (action === 'closeWin') { this.spot = null; ctx.show('shop'); return; }
    if (action === 'hand') { this.openSpot(ctx, 'hand'); return; }
    if (action === 'toResults') ctx.show('results');
  }
}

export const shopScreen = new ShopScreen();
