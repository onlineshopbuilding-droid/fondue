// The market between two days: tabs of upgrades with prices, buying and equipping.
// It remembers the open tab; purchases go to the session and come back as a redraw.
import { SHOP_ITEMS, SHOP_TABS, type ShopItem, type ShopTab } from '../../config/shop';
import type { ViewState } from '../../net/snapshot';
import type { Meta } from '../../sim/types';
import { artUri, esc } from '../html';
import type { ScreenContext } from './context';
import { nextButtons, onReadyAction, readyLine } from './readyControls';
import type { Screen } from './screen';

class ShopScreen implements Screen {
  readonly id = 'shop';
  private tab: ShopTab = 'gates';

  /** Opens the market where something can actually be bought. */
  openAtBestTab(ctx: ScreenContext) {
    const meta = ctx.session?.meta();
    const v = ctx.session?.view();
    if (meta && v) {
      const buyable = SHOP_ITEMS.find((i) => !meta.owned.includes(i.id) && (!i.requires || meta.owned.includes(i.requires))
        && v.gold >= i.gold && v.offerings >= i.offerings);
      this.tab = buyable?.tab ?? this.tab;
    }
    ctx.show('shop');
  }

  render(ctx: ScreenContext): string {
    const s = ctx.session;
    const meta = s?.meta();
    const v = s?.view();
    if (!s || !meta || !v) return '';
    const tabs = SHOP_TABS.map((t) => `<div class="tab ${t.id === this.tab ? 'on' : ''}" data-tab="${t.id}">${t.label}</div>`).join('');
    const coin = `<img src="${artUri('coin')}" alt="gold">`;
    const off = `<img src="${artUri('offering')}" alt="offerings">`;
    const items = SHOP_ITEMS.filter((i) => i.tab === this.tab).map((i) => this.renderItem(i, meta, v, coin, off)).join('');
    return `<div class="panel wide"><h2>The Market</h2>
      <div class="purse"><span>${coin}<span id="gold">${v.gold}</span></span><span>${off}<span id="offerings">${v.offerings}</span></span></div>
      <div class="tabs">${tabs}</div>${this.tab === 'horns' ? '<p style="text-align:center;margin:0 0 8px">Only one Gate Arm can be equipped at a time.</p>' : ''}<div class="items">${items}</div>
      ${readyLine(ctx, meta)}
      <div class="row" style="margin-top:14px"><button class="secondary" data-a="toResults">Results</button>${nextButtons(ctx, meta)}</div></div>`;
  }

  private renderItem(i: ShopItem, meta: Meta, v: ViewState, coin: string, off: string): string {
    const owned = meta.owned.includes(i.id);
    const locked = !!i.requires && !meta.owned.includes(i.requires);
    const afford = v.gold >= i.gold && v.offerings >= i.offerings;
    const tierSiblings = SHOP_ITEMS.filter((o) => o.tab === i.tab && meta.owned.includes(o.id));
    const isEquipped = i.tab === 'horns' ? meta.hornEquipped === i.id
      : i.tab === 'offerings' ? owned : tierSiblings[tierSiblings.length - 1]?.id === i.id;
    let action = '';
    if (owned) {
      if (i.tab === 'horns' && !isEquipped) action = `<button class="small secondary" data-equip="${i.id}">Equip</button>`;
      else action = `<span class="tag">${isEquipped ? 'Equipped' : 'Owned'}</span>`;
    } else if (locked) {
      action = `<span class="tag">Needs ${esc(SHOP_ITEMS.find((o) => o.id === i.requires)?.name ?? '')}</span>`;
    } else {
      action = `<button class="small" data-buy="${i.id}" ${afford ? '' : 'disabled'}>Buy</button>`;
    }
    const price = i.gold === 0 && i.offerings === 0 ? '' : `<span class="price">${coin}${i.gold}${i.offerings > 0 ? `${off}${i.offerings}` : ''}</span>`;
    return `<div class="item ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}" data-item="${i.id}">
        <div class="name">${esc(i.name)}</div><div class="desc">${esc(i.desc)}</div>
        <div class="foot">${price}${action}</div></div>`;
  }

  /** Tabs are plain elements, not buttons. */
  onClick(target: HTMLElement, ctx: ScreenContext): boolean {
    const tab = target.closest<HTMLElement>('[data-tab]');
    if (!tab) return false;
    ctx.audio.play('uiClick');
    this.tab = tab.dataset.tab as ShopTab;
    ctx.show('shop');
    return true;
  }

  onAction(action: string, el: HTMLElement, ctx: ScreenContext) {
    if (el.dataset.buy) { ctx.session?.send({ k: 'buy', item: el.dataset.buy }); return; }
    if (el.dataset.equip) { ctx.session?.send({ k: 'equip', item: el.dataset.equip }); return; }
    if (onReadyAction(action, ctx)) return;
    if (action === 'toResults') ctx.show('results');
  }
}

export const shopScreen = new ShopScreen();
