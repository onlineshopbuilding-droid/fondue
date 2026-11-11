import { GATE_HP, SHOP_ITEMS } from '../config/shop';
import type { SimContext } from './context';

/**
 * The market between days: what can be bought, paying for it, and which gate stands.
 */
export class Economy {
  constructor(private ctx: SimContext) {}

  canBuy(id: string): boolean {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || this.ctx.owns(id)) return false;
    if (item.requires && !this.ctx.owns(item.requires)) return false;
    return this.ctx.s.gold >= item.gold && this.ctx.s.offerings >= item.offerings;
  }

  buy(p: number, id: string) {
    const s = this.ctx.s;
    if (s.phase !== 'intermission') return;
    if (!this.canBuy(id)) { this.ctx.emit({ e: 'denied', p }); return; }
    const item = SHOP_ITEMS.find((i) => i.id === id)!;
    s.gold -= item.gold;
    s.offerings -= item.offerings;
    s.meta.owned.push(id);
    if (item.tab === 'horns') s.meta.hornEquipped = id;
    if (item.tab === 'gates') {
      s.gateMax = GATE_HP[id];
      s.gateHp = s.gateMax;
    }
    this.ctx.touchMeta();
    this.ctx.emit({ e: 'buy', p, item: id, name: item.name });
  }

  equip(id: string) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || item.tab !== 'horns' || !this.ctx.owns(id)) return;
    this.ctx.s.meta.hornEquipped = id;
    this.ctx.touchMeta();
  }

  currentGateId(): string {
    return ['gate4', 'gate3', 'gate2', 'gate1', 'gate0'].find((g) => this.ctx.owns(g)) ?? 'gate0';
  }
}
