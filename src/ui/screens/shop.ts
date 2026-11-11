// The market between two days (until the market at the keep exists): one list with the keep, the offering
// sites, one section per weapon slot and the hand. Prices and what can be bought come from `quote`, on host and guest alike.
import { GATES, STATION_IDS, STATIONS } from '../../config/keep';
import { HANDS } from '../../config/hand';
import { SLOTS } from '../../config/slots';
import { weaponsForSlot } from '../../config/weapons';
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

class ShopScreen implements Screen {
  readonly id = 'shop';
  private coin = '';
  private off = '';

  /** Kept for the results screen; the market is one list now, so it simply opens. */
  openAtBestTab(ctx: ScreenContext) { ctx.show('shop'); }

  render(ctx: ScreenContext): string {
    const s = ctx.session;
    const meta = s?.meta();
    const v = s?.view();
    if (!s || !meta || !v) return '';
    this.coin = `<img src="${artUri('coin')}" alt="gold">`;
    this.off = `<img src="${artUri('offering')}" alt="offerings">`;
    const purse = { gold: v.gold, offerings: v.offerings };
    const d = meta.lastDay;
    const dayLine = d ? `<div class="day-line" id="dayResult">Day ${d.day} held · ${d.kills} raiders · +${d.goldEarned} gold · +${d.offeringsEarned} offerings · gate ${d.gatePct}%</div>` : '';
    const only = meta.rules.marketOnly ? '<div class="day-line">Only the marked items are sold in this level.</div>' : '';
    const sections = [this.keep(meta, purse), this.stations(meta, purse), ...SLOTS.map((_, i) => this.slot(meta, purse, i)), this.hand(ctx, meta, purse)].join('');
    return `<div class="panel wide"><h2>The Market</h2>
      <div class="purse"><span>${this.coin}<span id="gold">${v.gold}</span></span><span>${this.off}<span id="offerings">${v.offerings}</span></span></div>
      ${dayLine}${only}
      <div class="items market">${sections}</div>
      ${readyLine(ctx, meta)}
      <div class="row navrow"><div class="nav-back"><button class="secondary" data-a="toResults">Results</button></div><div class="nav-forward">${nextButtons(ctx, meta)}</div></div></div>`;
  }

  private price(q: Quote): string {
    if (q.gold === 0 && q.offerings === 0) return q.reason === 'ok' ? '<span class="price">Free</span>' : '<span class="price"></span>';
    return `<span class="price">${q.gold > 0 ? `${this.coin}${q.gold}` : ''}${q.offerings > 0 ? `${this.off}${q.offerings}` : ''}</span>`;
  }

  /** The buy button of an item, or the reason it cannot be bought. */
  private buy(meta: Meta, q: Quote, item: string, label: string): string {
    if (q.reason === 'ok') return `${this.price(q)}<button class="small" data-buy="${item}">${label}</button>`;
    const notSold = meta.rules.marketOnly !== null && !meta.rules.marketOnly.includes(item);
    const why = notSold ? 'Not sold in this level' : WHY[q.reason];
    const showPrice = q.reason === 'gold' || q.reason === 'offerings';
    return `${showPrice ? this.price(q) : '<span class="price"></span>'}<span class="why">${esc(why)}</span><button class="small" data-buy="${item}" disabled>${label}</button>`;
  }

  private card(cls: string, item: string, name: string, desc: string, foot: string): string {
    return `<div class="item ${cls}" data-item="${esc(item)}"><div class="name">${name}</div><div class="desc">${esc(desc)}</div><div class="foot">${foot}</div></div>`;
  }

  private keep(meta: Meta, purse: Purse): string {
    const l = meta.loadout;
    const q = quote(meta.rules, l, purse.gold, purse.offerings, 'gate');
    const now = GATES[l.gateTier];
    const next = GATES[l.gateTier + 1];
    const desc = next ? `Now: ${now.name}. Next: ${next.name}, ${next.hp} strength. ${next.desc}` : `${now.name}: the strongest gate.`;
    return `<div class="sect">Keep</div>${this.card(q.reason === 'ok' ? '' : 'dim', 'gate', esc(next?.name ?? now.name), desc, q.reason === 'max' ? '<span class="tag">Strongest gate</span>' : this.buy(meta, q, 'gate', 'Build'))}`;
  }

  private stations(meta: Meta, purse: Purse): string {
    const cards = STATION_IDS.map((id) => {
      const item = `station:${id}`;
      const def = STATIONS[id];
      const q = quote(meta.rules, meta.loadout, purse.gold, purse.offerings, item);
      if (q.reason === 'owned') return this.card('owned', item, esc(def.name), def.desc, '<span class="tag">Built</span>');
      return this.card(q.reason === 'ok' ? '' : 'dim', item, esc(def.name), def.desc, this.buy(meta, q, item, 'Build'));
    }).join('');
    return `<div class="sect">Offering sites</div>${cards}`;
  }

  private slot(meta: Meta, purse: Purse, i: number): string {
    const slot = SLOTS[i];
    if (!meta.rules.slotsOpen[i]) {
      return `<div class="sect">${esc(slot.name)}</div><div class="item locked" data-slot="${i}"><div class="name">Locked</div><div class="desc">This slot is not open in this run.</div></div>`;
    }
    const l = meta.loadout;
    const inSlot = l.slotWeapon[i];
    const list = weaponsForSlot(slot.type).filter((w) => meta.rules.weapons[w.id]?.offered);
    const cards = list.map((w) => {
      const tier = l.weaponTier[w.id] ?? meta.rules.weapons[w.id]?.fixedTier ?? 1;
      const name = `${esc(w.name)} <span class="tier">Tier ${tier}</span>`;
      const item = `weapon:${i}:${w.id}`;
      if (inSlot === w.id) {
        let foot = '<span class="tag">Built</span>';
        if (meta.rules.tierUpgrades) {
          const up = `upgrade:${w.id}`;
          const q = quote(meta.rules, l, purse.gold, purse.offerings, up);
          foot = q.reason === 'max' ? '<span class="tag">Built · maximum tier</span>' : `<span class="tag">Built</span>${this.buy(meta, q, up, 'Upgrade')}`;
        }
        return this.card('owned', item, name, w.desc, foot);
      }
      const q = quote(meta.rules, l, purse.gold, purse.offerings, item);
      return this.card(q.reason === 'ok' ? '' : 'dim', item, name, w.desc, this.buy(meta, q, item, inSlot ? 'Swap' : 'Build'));
    }).join('');
    return `<div class="sect">${esc(slot.name)}</div>${cards || '<div class="item locked"><div class="desc">No weapon for this slot in this run.</div></div>'}`;
  }

  private hand(ctx: ScreenContext, meta: Meta, purse: Purse): string {
    const l = meta.loadout;
    const mine = l.handTier[ctx.session?.me ?? 0] ?? 1;
    if (!meta.rules.handBuyable) {
      return `<div class="sect">Hand</div>${this.card('owned', 'hand', `The Hand <span class="tier">Tier ${mine}</span>`, HANDS[mine - 1]?.note ?? '', '<span class="tag">Stronger hands come from the armoury</span>')}`;
    }
    const q = quote(meta.rules, l, purse.gold, purse.offerings, 'hand');
    const next = HANDS[Math.max(...l.handTier)];
    const desc = next ? `Now tier ${mine}. Next: ${next.note}` : HANDS[mine - 1]?.note ?? '';
    return `<div class="sect">Hand</div>${this.card(q.reason === 'ok' ? '' : 'dim', 'hand', `The Hand <span class="tier">Tier ${mine}</span>`, desc, q.reason === 'max' ? '<span class="tag">Strongest hand</span>' : this.buy(meta, q, 'hand', 'Upgrade'))}`;
  }

  onAction(action: string, el: HTMLElement, ctx: ScreenContext) {
    if (el.dataset.buy) { ctx.session?.send({ k: 'buy', item: el.dataset.buy }); return; }
    if (onReadyAction(action, ctx)) return;
    if (action === 'toResults') ctx.show('results');
  }
}

export const shopScreen = new ShopScreen();
