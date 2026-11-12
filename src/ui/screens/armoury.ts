// The armoury (until it stands in the keep): every weapon by slot, its lasting tier, and upgrades bought with stars.
// The hand and its tier are here too. Prices come from stars.ts and hand.ts, unlock levels from the world's unlock table.
import { HANDS } from '../../config/hand';
import { SLOTS } from '../../config/slots';
import { weaponTierPrice } from '../../config/stars';
import { MAX_TIER, activeWeapons, weaponById, type WeaponDef } from '../../config/weapons';
import { buyWeaponUnlock, maxHandTier, unlockLevelOf, weaponAvailable, weaponUnlockPrice } from '../../modes';
import { BACK_BUTTON, esc, navRow } from '../html';
import type { ScreenContext } from './context';
import type { Screen } from './screen';

const unlockText = (level: number | null) => (level === null ? 'Not in the campaign yet' : `Unlocks after level ${level}`);

function weaponCard(ctx: ScreenContext, w: WeaponDef): string {
  const p = ctx.profile;
  const owned = p.hasWeapon(w.id);
  const tier = p.weaponTier(w.id);
  const now = w.tiers[tier - 1]?.note ?? '';
  const nextNote = tier < MAX_TIER ? w.tiers[tier]?.note ?? '' : '';
  let foot: string;
  if (!owned && weaponAvailable(p, ctx.world, w.id)) {
    // Only reached when the unlock table asks for stars (STARS.weaponUnlock above 0).
    const price = weaponUnlockPrice();
    const can = p.data.stars >= price;
    foot = `${can ? '' : '<span class="why">Not enough stars</span>'}<button class="small" data-a="unlockWeapon" data-weapon="${w.id}" ${can ? '' : 'disabled'}>Unlock ★${price}</button>`;
  } else if (!owned) {
    foot = `<span class="why">${esc(unlockText(unlockLevelOf(ctx.world, 'weapon', w.id)))}</span>`;
  } else if (tier >= MAX_TIER) {
    foot = '<span class="tag">Maximum tier</span>';
  } else {
    const price = weaponTierPrice(tier + 1);
    const can = p.data.stars >= price;
    foot = `${can ? '' : '<span class="why">Not enough stars</span>'}<button class="small" data-a="upgradeWeapon" data-weapon="${w.id}" ${can ? '' : 'disabled'}>Upgrade ★${price}</button>`;
  }
  return `<div class="item ${owned ? '' : 'locked'}" data-weapon-card="${w.id}">
      <div class="name">${esc(w.name)} <span class="tier">Tier ${tier}/${MAX_TIER}</span></div>
      <div class="desc">${esc(w.desc)}</div>
      ${now ? `<div class="desc note-now">Now: ${esc(now)}</div>` : ''}
      ${nextNote ? `<div class="desc note-next">Next: ${esc(nextNote)}</div>` : ''}
      <div class="foot">${foot}</div></div>`;
}

function handCard(ctx: ScreenContext): string {
  const p = ctx.profile;
  const tier = p.data.handTier;
  const cap = maxHandTier(p, ctx.world);
  const next = HANDS[tier];
  let foot: string;
  if (!next) {
    foot = '<span class="tag">Maximum tier</span>';
  } else if (tier + 1 > cap) {
    foot = `<span class="why">${esc(unlockText(unlockLevelOf(ctx.world, 'hand', tier + 1)))}</span>`;
  } else {
    const can = p.data.stars >= next.stars;
    foot = `${can ? '' : '<span class="why">Not enough stars</span>'}<button class="small" data-a="upgradeHand" ${can ? '' : 'disabled'}>Upgrade ★${next.stars}</button>`;
  }
  return `<div class="item" id="handCard">
      <div class="name">The Hand <span class="tier">Tier ${tier}/${HANDS.length}</span></div>
      <div class="desc note-now">Now: ${esc(HANDS[tier - 1]?.note ?? '')}</div>
      ${next ? `<div class="desc note-next">Next: ${esc(next.note)}</div>` : ''}
      <div class="foot">${foot}</div></div>`;
}

export const armouryScreen: Screen = {
  id: 'armoury',
  render(ctx) {
    const weapons = activeWeapons();
    const groups = SLOTS.map((slot, i) => {
      const list = weapons.filter((w) => w.slotType === slot.type);
      if (list.length === 0) return '';
      const slotNote = ctx.profile.hasSlot(i) ? '' : ` <span class="why">(slot: ${esc(unlockText(unlockLevelOf(ctx.world, 'slot', i)))})</span>`;
      return `<div class="sect">${esc(slot.name)}${slotNote}</div>${list.map((w) => weaponCard(ctx, w)).join('')}`;
    }).join('');
    return `<div class="panel wide"><h2>Armoury</h2>
      <div class="purse"><span class="star">★</span><span id="stars">${ctx.profile.data.stars}</span></div>
      <div class="items">${`<div class="sect">Hand</div>${handCard(ctx)}`}${groups}</div>
      ${navRow(BACK_BUTTON)}</div>`;
  },
  onAction(action, el, ctx) {
    const p = ctx.profile;
    switch (action) {
      case 'upgradeWeapon': {
        const w = weaponById(el.dataset.weapon ?? '');
        if (!w || !p.hasWeapon(w.id)) return;
        const tier = p.weaponTier(w.id);
        if (tier >= MAX_TIER) return;
        if (p.spendStars(weaponTierPrice(tier + 1)) || weaponTierPrice(tier + 1) === 0) {
          p.setWeaponTier(w.id, tier + 1);
          ctx.toast(`${w.name} is now tier ${tier + 1}`);
        }
        ctx.show('armoury');
        break;
      }
      case 'unlockWeapon': {
        const w = weaponById(el.dataset.weapon ?? '');
        if (w && buyWeaponUnlock(p, ctx.world, w.id)) ctx.toast(`${w.name} is unlocked`);
        ctx.show('armoury');
        break;
      }
      case 'upgradeHand': {
        const tier = p.data.handTier;
        const next = HANDS[tier];
        if (!next || tier + 1 > maxHandTier(p, ctx.world)) return;
        if (p.spendStars(next.stars) || next.stars === 0) {
          p.setHandTier(tier + 1);
          ctx.toast(`Your hand is now tier ${tier + 1}`);
        }
        ctx.show('armoury');
        break;
      }
      case 'main': ctx.show('main'); break;
    }
  },
};
