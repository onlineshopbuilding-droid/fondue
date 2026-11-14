// The developer menu: live sliders for the feel of the game, experiment switches, quick starts and profile tools.
// Opens from Options, with F1 or a long press on the logo; on a phone it scrolls and every control is finger sized.
import { REVIEW_ITEMS, type ReviewItem } from '../config/devReview';
import type { EnemyType } from '../config/enemies';
import { FLAG_DEFS, type Flags } from '../config/flags';
import { HANDS } from '../config/hand';
import { CASTLE_TIERS, STATIONS, STATION_IDS, type StationId } from '../config/keep';
import { QUICK_STARTS, QUICK_START_MAX_WAVE } from '../config/quickstart';
import { TUNING_PRESETS, TUNING_SLIDERS, type Tuning } from '../config/tuning';
import { MAX_TIER, WEAPONS, weaponById } from '../config/weapons';
import { ENEMY_POPUPS } from '../config/worlds/fondue/story';
import { campaignLength, cheatBadge, giveCheese, giveCrests, giveGold, setCastleTier, setStationTier, unlockLevels } from '../modes/cheats';
import type { DevRating, Profile } from '../profile';
import {
  editableFields, importOverrides, overrideCount, overrideOf, overridesAsText, resetWeaponOverrides, setWeaponOverride,
} from '../sim/weapons/overrides';
import { esc, weaponUri } from './html';

export interface TuningPanelHost {
  values(): Tuning;
  canEdit(): boolean;
  apply(t: Tuning): void;
  /** Experiment switches in effect. */
  flags(): Flags;
  setFlag(id: string, value: string): void;
  /** Wave the next endless game starts at; 1 for a normal run. */
  startWave(): number;
  setStartWave(wave: number): void;
  /** An endless run alone, starting at the chosen wave. */
  startQuickEndless(): void;
  /** One line about the profile: cheese, levels won. */
  profileSummary(): string;
  addCheese(n: number): void;
  unlockEverything(): void;
  replayTutorial(): void;
  resetProfile(): void;
  /** Starts a campaign level alone at a later wave. */
  jumpTo(level: number, wave: number): void;
  levelCount(): number;
  /** How many waves this campaign level has. */
  levelWaves(level: number): number;
  /** Permanent tiers in the profile. */
  weaponTier(id: string): number;
  setWeaponTier(id: string, tier: number): void;
  handTier(): number;
  setHandTier(tier: number): void;
  /** Shows the "New enemy" window of this raider once more. */
  showEnemyPopup(type: EnemyType): void;
  /** The developers' ratings stored in the profile, and all of them as text. */
  ratings(): Readonly<Record<string, DevRating>>;
  setRating(id: string, patch: Partial<DevRating>): void;
  ratingsText(): string;
  /**
   * For the permanent cheats (F2): the profile, the world and a redraw of the menus afterwards.
   * Optional; without them the panel uses the game's test hook `window.__fondue`.
   */
  profile?(): Profile;
  world?(): string;
  afterCheat?(): void;
}

/** Gold and crests added per tap. */
const GOLD_GIFTS = [1000, 10000];
const CREST_GIFT = 40;

/** The look of the small marks ("Cheats used", "3 changed"); inline, because style.css belongs to the screens. */
const BADGE_STYLE = 'display:inline-block;margin:0 8px;padding:1px 9px;border-radius:999px;background:#c8553d;color:#fff;font-size:12px;font-weight:800;vertical-align:middle';

/** What the cheats work on: the profile, its world and a redraw of the menus. */
interface CheatTarget { profile: Profile; world: string; redraw(): void }

/** Cheese added per tap of the button. */
const CHEESE_GIFT = 50;

/** The developer overview page, next to the game. */
const devOverviewUrl = (): string => `${import.meta.env.BASE_URL ?? '/'}dev/`;

const clampInt = (v: unknown, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));

export class TuningPanel {
  private el: HTMLDivElement | null = null;
  private confirmReset = false;
  private jumpLevel = 1;
  private jumpWave = 1;
  /** Which page of the menu is on show: the tools, or the decision and rating list. */
  private view: 'main' | 'review' = 'main';
  private tierWeapon = WEAPONS[0]?.id ?? '';
  private popupEnemy = (Object.keys(ENEMY_POPUPS)[0] ?? 'grunt') as EnemyType;
  private copied = '';
  /** Weapon editor: the weapon and tier on show, whether it is unfolded, and its text field. */
  private editWeapon = WEAPONS[0]?.id ?? '';
  private editTier = 1;
  private editorOpen = false;
  private editorNote = '';
  private unlockTo = 10;

  constructor(private root: HTMLElement, private host: TuningPanelHost) {}

  get open() { return this.el !== null; }

  toggle() {
    if (this.el) { this.el.remove(); this.el = null; this.confirmReset = false; this.view = 'main'; return; }
    this.render();
  }

  private render() {
    const scroll = this.el?.scrollTop ?? 0;
    this.el?.remove();
    const el = document.createElement('div');
    el.id = 'tuning';
    this.el = el;
    el.innerHTML = this.view === 'review' ? this.reviewPage() : this.mainPage();
    el.addEventListener('input', (ev) => this.onInput(ev));
    el.addEventListener('change', (ev) => this.onChange(ev));
    el.addEventListener('click', (ev) => this.onClick(ev));
    this.root.appendChild(el);
    el.scrollTop = scroll;
  }

  private mainPage(): string {
    const t = this.host.values();
    const edit = this.host.canEdit();
    const rows = TUNING_SLIDERS.map((s) => `
      <div class="t-row">
        <span>${s.label}</span><span data-val="${s.key}" style="text-align:right">${t[s.key]}</span>
        <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${t[s.key]}" ${edit ? '' : 'disabled'}>
      </div>`).join('');
    return `
      <div class="dev-head"><h3>Developer menu</h3>${this.badge()}<button class="small" data-act="close" id="devClose">Close</button></div>
      ${this.developer(edit)}
      <div class="dev-section">
      <h3>Tuning</h3>
      ${edit ? '' : '<p class="note">The host sets these values.</p>'}
      <div class="row dev-options">
        ${Object.keys(TUNING_PRESETS).map((n) => `<button class="small secondary" data-preset="${n}" ${edit ? '' : 'disabled'}>${n}</button>`).join('')}
      </div>
      ${rows}
      <label class="dev-check"><input type="checkbox" data-toggle="knockOthers" ${t.knockOthers ? 'checked' : ''} ${edit ? '' : 'disabled'}> Thrown enemies knock others over</label>
      <div class="note-dev">Changed tuning or switches make every run a developer run: no scores, no cheese.</div>
      <div class="row dev-options" style="margin:10px 0 6px">
        <button class="small secondary" data-act="export">Export</button>
        <button class="small secondary" data-act="import" ${edit ? '' : 'disabled'}>Import</button>
      </div>
      <textarea data-json placeholder="Exported values appear here. Paste JSON and press Import."></textarea>
      </div>`;
  }

  private developer(edit: boolean): string {
    const flags = this.host.flags();
    const switches = FLAG_DEFS.map((f) => `
      <div class="dev-row" data-flagrow="${f.id}">
        <div class="dev-label">${f.label}</div>
        <div class="row dev-options">${f.options.map((o) => `<button class="small ${flags[f.id] === o.value ? '' : 'secondary'}" data-flag="${f.id}" data-value="${o.value}" ${edit ? '' : 'disabled'}>${o.label}</button>`).join('')}</div>
        <div class="note-dev">${f.hint}</div>
      </div>`).join('');
    const wave = this.host.startWave();
    const waves = [1, ...QUICK_STARTS.map((q) => q.wave)].map((d) => `<button class="small ${wave === d ? '' : 'secondary'}" data-startwave="${d}" ${edit ? '' : 'disabled'}>${d === 1 ? 'Normal' : `Wave ${d}`}</button>`).join('');
    const reset = this.confirmReset
      ? `<div class="dev-confirm" id="resetConfirm"><div class="dev-label">Erase the whole profile? This cannot be undone.</div>
          <div class="row navrow"><div class="nav-back"><button class="small secondary" data-act="resetCancel">Cancel</button></div>
          <div class="nav-forward"><button class="small alt" data-act="resetConfirm">Erase profile</button></div></div></div>`
      : '<button class="small alt" data-act="resetProfile" id="devResetProfile">Reset profile</button>';
    const maxWave = this.host.levelWaves(this.jumpLevel);
    this.jumpWave = Math.min(this.jumpWave, maxWave);
    return `
      <div class="dev-section" id="developer">
        ${edit ? '' : '<p class="note">The host decides these for both players.</p>'}
        <div class="dev-row">
          <div class="row dev-options">
            <button class="small" data-act="review" id="devReview">Decisions and ratings</button>
            <a class="dev-link" id="devOverview" href="${devOverviewUrl()}" target="_blank" rel="noopener">Developer overview</a>
          </div>
        </div>
        <div class="dev-row">
          <div class="dev-label">Jump to a campaign level</div>
          <div class="row dev-options">
            <label class="dev-num">Level <input type="number" id="devLevel" min="1" max="${this.host.levelCount()}" value="${this.jumpLevel}"></label>
            <label class="dev-num">Wave <input type="number" id="devWave" min="1" max="${maxWave}" value="${this.jumpWave}"></label>
            <button class="small" data-act="jump" id="devJump">Go</button>
          </div>
          <div class="note-dev">Starts alone at once. A later wave counts as a developer run.</div>
        </div>
        <div class="dev-row">
          <div class="dev-label">Endless starts on</div>
          <div class="row dev-options">${waves}
            <label class="dev-num">Wave <input type="number" id="devEndlessWave" min="1" max="${QUICK_START_MAX_WAVE}" value="${wave}" ${edit ? '' : 'disabled'}></label>
          </div>
          <div class="note-dev">Applies to solo and to an endless game you host. Quick starts do not count for the scores.</div>
          ${edit ? '<div class="row dev-options" style="margin-top:6px"><button class="small" data-act="quickSolo" id="devQuickSolo">Start endless now</button></div>' : ''}
        </div>
        <div class="dev-row">
          <div class="dev-label">Profile</div>
          <div class="note-dev" id="devProfile">${this.host.profileSummary()}</div>
          <div class="row dev-options">
            <button class="small secondary" data-act="cheese" id="devCheese">+${CHEESE_GIFT} cheese</button>
            <button class="small secondary" data-act="unlockAll" id="devUnlockAll">Unlock everything</button>
            <button class="small secondary" data-act="replayTutorial" id="devTutorial">Replay tutorial</button>
          </div>
          <div class="row dev-options" style="margin-top:6px">${reset}</div>
        </div>
        ${this.cheats()}
        ${this.tiers()}
        ${this.weaponEditor(edit)}
        ${this.popups()}
        ${switches}
      </div>`;
  }

  /** The profile and world the cheats change; the host gives them, the test hook is the fallback. */
  private cheatTarget(): CheatTarget | null {
    const profile = this.host.profile?.();
    if (profile) return { profile, world: this.host.world?.() ?? 'fondue', redraw: () => this.host.afterCheat?.() };
    const app = (window as unknown as { __fondue?: { profile?: Profile; world?: string; screen?: string; show?(s: string): void } }).__fondue;
    if (!app?.profile) return null;
    return {
      profile: app.profile, world: app.world ?? 'fondue',
      redraw: () => { if (app.screen && ['main', 'campaign', 'options', 'keep', 'shop'].includes(app.screen)) app.show?.(app.screen); },
    };
  }

  /** "Cheats used": a profile changed by cheats says so at the top of the menu. */
  private badge(): string {
    const t = this.cheatTarget();
    const text = t ? cheatBadge(t.profile) : null;
    return text ? `<span class="dev-badge" style="${BADGE_STYLE}" id="devCheatBadge" title="This profile was changed by developer cheats.">${esc(text)}</span>` : '';
  }

  /** Permanent cheats: currencies, levels, castle and station tiers. */
  private cheats(): string {
    const t = this.cheatTarget();
    if (!t) return '';
    const d = t.profile.data;
    const castle = CASTLE_TIERS.map((_, i) => i + 1)
      .map((n) => `<button class="small ${n === d.keep.castleTier ? '' : 'secondary'}" data-castletier="${n}" id="devCastleTier${n}">${n}</button>`).join('');
    const stations = STATION_IDS.map((id) => {
      const now = d.keep.stations[id] ?? 0;
      const buttons = Array.from({ length: STATIONS[id].tiers.length + 1 }, (_, n) => n)
        .map((n) => `<button class="small ${n === now ? '' : 'secondary'}" data-station="${id}" data-stationtier="${n}" id="devStation-${id}-${n}">${n === 0 ? 'Off' : n}</button>`).join('');
      return `<div class="dev-label" style="margin-top:6px">${esc(STATIONS[id].name)}</div><div class="row dev-options">${buttons}</div>`;
    }).join('');
    return `
      <div class="dev-row" id="devCheats">
        <div class="dev-label">Cheats (permanent, they mark the profile)</div>
        <div class="row dev-options">
          ${GOLD_GIFTS.map((n) => `<button class="small secondary" data-gold="${n}" id="devGold${n}">+${n} gold</button>`).join('')}
          <button class="small secondary" data-act="crests" id="devCrests">+${CREST_GIFT} crests</button>
        </div>
        <div class="row dev-options" style="margin-top:6px">
          <label class="dev-num">Win levels 1 to <input type="number" id="devUnlockTo" min="1" max="${campaignLength(t.world)}" value="${this.unlockTo}"></label>
          <button class="small secondary" data-act="unlockLevels" id="devUnlockLevels">Unlock</button>
        </div>
        <div class="dev-label" style="margin-top:6px">Castle tier</div>
        <div class="row dev-options">${castle}</div>
        ${stations}
      </div>`;
  }

  /** F1: every number of every weapon tier, live in the running game; reset; export as text. */
  private weaponEditor(edit: boolean): string {
    const def = weaponById(this.editWeapon) ?? WEAPONS[0];
    if (!def) return '';
    const tier = Math.max(1, Math.min(def.tiers.length, this.editTier));
    const row = def.tiers[tier - 1] as unknown as Record<string, number>;
    const options = WEAPONS.map((w) => `<option value="${w.id}" ${w.id === def.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
    const tiers = def.tiers.map((_, i) => `<button class="small ${i + 1 === tier ? '' : 'secondary'}" data-edittier="${i + 1}" id="devEditTier${i + 1}">${i + 1}</button>`).join('');
    const fields = editableFields(def, tier).map((f) => {
      const changed = overrideOf(def.id, tier, f);
      return `<label class="dev-num dev-wfield${changed === undefined ? '' : ' changed'}">${esc(f)}
        <input type="number" step="any" data-wfield="${f}" id="devW-${f}" value="${changed ?? row[f]}" ${edit ? '' : 'disabled'}>
        <span class="note-dev">default ${row[f]}</span></label>`;
    }).join('');
    const count = overrideCount();
    return `
      <details class="dev-row" id="devWeaponEditor" ${this.editorOpen ? 'open' : ''}>
        <summary class="dev-label">Weapon editor${count ? ` <span class="dev-badge" style="${BADGE_STYLE}" id="devEditCount">${count} changed</span>` : ''}</summary>
        ${edit ? '' : '<p class="note">The host sets these values.</p>'}
        <div class="row dev-options"><select id="devEditWeapon" class="dev-select">${options}</select></div>
        <div class="row dev-options" style="margin-top:6px">${tiers}</div>
        <div class="note-dev">${esc(String((def.tiers[tier - 1] as { note?: string }).note ?? ''))}</div>
        <div class="row dev-options dev-wfields" style="margin-top:6px">${fields}</div>
        <div class="row dev-options" style="margin-top:6px">
          <button class="small secondary" data-act="wResetTier" id="devWResetTier" ${edit ? '' : 'disabled'}>Reset this tier</button>
          <button class="small secondary" data-act="wResetWeapon" id="devWResetWeapon" ${edit ? '' : 'disabled'}>Reset weapon</button>
          <button class="small alt" data-act="wResetAll" id="devWResetAll" ${edit ? '' : 'disabled'}>Reset all</button>
        </div>
        <div class="row dev-options" style="margin-top:6px">
          <button class="small secondary" data-act="wExport" id="devWExport">Export as text</button>
          <button class="small secondary" data-act="wImport" id="devWImport" ${edit ? '' : 'disabled'}>Import</button>
        </div>
        <textarea id="devWeaponText" placeholder="Exported changes appear here. Paste an export and press Import.">${esc(this.editorNote)}</textarea>
        <div class="note-dev">Changes work at the next shot. Any change makes runs developer runs: no cheese, no gold, no progress. Kept until the page reloads.</div>
      </details>`;
  }

  /** Setting any weapon's lasting tier and the hand tier directly. */
  private tiers(): string {
    const tier = this.host.weaponTier(this.tierWeapon);
    const options = WEAPONS.map((w) => `<option value="${w.id}" ${w.id === this.tierWeapon ? 'selected' : ''}>${esc(w.name)} (${this.host.weaponTier(w.id)})</option>`).join('');
    const weaponButtons = Array.from({ length: MAX_TIER }, (_, i) => i + 1)
      .map((n) => `<button class="small ${n === tier ? '' : 'secondary'}" data-weapontier="${n}" id="devWeaponTier${n}">${n}</button>`).join('');
    const hand = this.host.handTier();
    const handButtons = HANDS.map((_, i) => i + 1)
      .map((n) => `<button class="small ${n === hand ? '' : 'secondary'}" data-handtier="${n}" id="devHandTier${n}">${n}</button>`).join('');
    return `
      <div class="dev-row">
        <div class="dev-label">Tiers</div>
        <div class="row dev-options"><select id="devTierWeapon" class="dev-select">${options}</select></div>
        <div class="row dev-options" style="margin-top:6px">${weaponButtons}</div>
        <div class="dev-label" style="margin-top:6px">Hand tier</div>
        <div class="row dev-options">${handButtons}</div>
      </div>`;
  }

  /** Showing one raider's "New enemy" window again. */
  private popups(): string {
    const options = (Object.keys(ENEMY_POPUPS) as EnemyType[])
      .map((t) => `<option value="${t}" ${t === this.popupEnemy ? 'selected' : ''}>${esc(ENEMY_POPUPS[t].title)}</option>`).join('');
    return `
      <div class="dev-row">
        <div class="dev-label">Show a "New enemy" window</div>
        <div class="row dev-options">
          <select id="devPopupEnemy" class="dev-select">${options}</select>
          <button class="small secondary" data-act="popup" id="devPopupShow">Show</button>
        </div>
      </div>`;
  }

  /** The decision and rating list: tick, like or dislike, a short note; copied out as text. */
  private reviewPage(): string {
    const ratings = this.host.ratings();
    const items = REVIEW_ITEMS.map((item) => this.reviewItem(item, ratings[item.id])).join('');
    return `
      <div class="dev-head"><h3>Decisions and ratings</h3><button class="small" data-act="reviewBack" id="devReviewBack">Back</button></div>
      <div class="dev-section">
        <div class="note-dev">Saved in the profile and in its export code. Tick what is settled, rate it and add a short note.</div>
        <div class="row dev-options" style="margin:6px 0">
          <button class="small" data-act="copyRatings" id="devCopyRatings">${this.copied || 'Copy as text'}</button>
        </div>
        <textarea id="devRatingsText" readonly ${this.copied ? '' : 'hidden'}>${esc(this.host.ratingsText())}</textarea>
        ${items}
      </div>`;
  }

  private reviewItem(item: ReviewItem, rating: DevRating | undefined): string {
    const w = item.weapon ? weaponById(item.weapon) : undefined;
    const verdict = rating?.verdict ?? null;
    const verdictButton = (v: 'good' | 'bad', label: string) =>
      `<button class="small ${verdict === v ? '' : 'secondary'}" data-verdict="${v}" data-rid="${item.id}">${label}</button>`;
    return `
      <div class="dev-review" data-review="${item.id}">
        <div class="dev-review-head">
          ${w ? `<img src="${weaponUri(w.id)}" alt="">` : ''}
          <div><div class="dev-label">${item.id} ${esc(item.title)}</div>${w ? `<div class="note-dev">${esc(w.desc)}</div>` : ''}</div>
        </div>
        <div class="row dev-options">
          <label class="dev-check"><input type="checkbox" data-rcheck="${item.id}" ${rating?.checked ? 'checked' : ''}> Settled</label>
          ${verdictButton('good', 'We like it')}
          ${verdictButton('bad', 'We do not')}
        </div>
        <input type="text" class="dev-note" data-rnote="${item.id}" maxlength="200" placeholder="Short note" value="${esc(rating?.note ?? '')}">
      </div>`;
  }

  /** Redraws the panel if something else changed what it shows, such as the host's switches. */
  refresh() { if (this.el) this.render(); }

  private onInput(ev: Event) {
    const target = ev.target as HTMLInputElement;
    if (target.id === 'devLevel') {
      this.jumpLevel = clampInt(target.value, 1, this.host.levelCount());
      // The wave field follows the chosen level: it allows every wave that level has.
      const waveField = this.el?.querySelector<HTMLInputElement>('#devWave');
      const max = this.host.levelWaves(this.jumpLevel);
      if (waveField) {
        waveField.max = String(max);
        if (this.jumpWave > max) { this.jumpWave = max; waveField.value = String(max); }
      }
      return;
    }
    if (target.id === 'devWave') { this.jumpWave = clampInt(target.value, 1, this.host.levelWaves(this.jumpLevel)); return; }
    if (target.id === 'devEndlessWave') { if (target.value !== '') this.host.setStartWave(clampInt(target.value, 1, QUICK_START_MAX_WAVE)); return; }
    if (target.dataset.rnote) { this.host.setRating(target.dataset.rnote, { note: target.value }); return; }
    if (target.id === 'devUnlockTo') { this.unlockTo = clampInt(target.value, 1, 1000); return; }
    if (target.id === 'devTierWeapon' || target.id === 'devPopupEnemy' || target.dataset.rcheck) return;
    if (target.dataset.wfield || target.id === 'devEditWeapon' || target.id === 'devWeaponText') return;
    const t = { ...this.host.values() };
    if (target.dataset.key) {
      const key = target.dataset.key as Exclude<keyof Tuning, 'knockOthers'>;
      t[key] = Number(target.value);
      const lab = this.el?.querySelector(`[data-val="${key}"]`);
      if (lab) lab.textContent = target.value;
      this.host.apply(t);
    } else if (target.dataset.toggle) {
      t.knockOthers = target.checked;
      this.host.apply(t);
    }
  }

  /** Selects and the ticks of the rating list report here, once per change. */
  private onChange(ev: Event) {
    const target = ev.target as HTMLInputElement & HTMLSelectElement;
    if (target.id === 'devTierWeapon') { this.tierWeapon = target.value; this.render(); return; }
    if (target.id === 'devEditWeapon') { this.editWeapon = target.value; this.editTier = 1; this.editorOpen = true; this.render(); return; }
    if (target.dataset.wfield) {
      if (target.value !== '' && this.host.canEdit()) setWeaponOverride(this.editWeapon, this.editTier, target.dataset.wfield, Number(target.value));
      this.editorOpen = true;
      this.render();
      return;
    }
    if (target.id === 'devPopupEnemy') { this.popupEnemy = target.value as EnemyType; return; }
    if (target.dataset.rcheck) this.host.setRating(target.dataset.rcheck, { checked: target.checked });
  }

  private onClick(ev: Event) {
    const b = (ev.target as HTMLElement).closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.flag && b.dataset.value) {
      this.host.setFlag(b.dataset.flag, b.dataset.value);
      this.render();
      return;
    }
    if (b.dataset.startwave) {
      this.host.setStartWave(Number(b.dataset.startwave));
      this.render();
      return;
    }
    if (b.dataset.preset) {
      this.host.apply({ ...TUNING_PRESETS[b.dataset.preset] });
      this.render();
      return;
    }
    if (b.dataset.weapontier) {
      this.host.setWeaponTier(this.tierWeapon, Number(b.dataset.weapontier));
      this.render();
      return;
    }
    if (b.dataset.gold) { this.withCheat((t) => giveGold(t.profile, Number(b.dataset.gold))); return; }
    if (b.dataset.castletier) { this.withCheat((t) => setCastleTier(t.profile, Number(b.dataset.castletier))); return; }
    if (b.dataset.station && b.dataset.stationtier) {
      const id = b.dataset.station as StationId;
      const tier = Number(b.dataset.stationtier);
      this.withCheat((t) => setStationTier(t.profile, id, tier));
      return;
    }
    if (b.dataset.edittier) { this.editTier = Number(b.dataset.edittier); this.editorOpen = true; this.render(); return; }
    if (b.dataset.handtier) {
      this.host.setHandTier(Number(b.dataset.handtier));
      this.render();
      return;
    }
    if (b.dataset.verdict && b.dataset.rid) {
      const now = this.host.ratings()[b.dataset.rid]?.verdict ?? null;
      const pick = b.dataset.verdict as 'good' | 'bad';
      // Tapping the chosen verdict again takes it back.
      this.host.setRating(b.dataset.rid, { verdict: now === pick ? null : pick });
      this.render();
      return;
    }
    const area = this.el?.querySelector<HTMLTextAreaElement>('[data-json]');
    switch (b.dataset.act) {
      case 'close': this.toggle(); return;
      case 'quickSolo': this.toggle(); this.host.startQuickEndless(); return;
      case 'jump': this.toggle(); this.host.jumpTo(this.jumpLevel, Math.min(this.jumpWave, this.host.levelWaves(this.jumpLevel))); return;
      case 'replayTutorial': this.toggle(); this.host.replayTutorial(); return;
      case 'popup': this.toggle(); this.host.showEnemyPopup(this.popupEnemy); return;
      case 'review': this.view = 'review'; this.copied = ''; this.render(); if (this.el) this.el.scrollTop = 0; return;
      case 'reviewBack': this.view = 'main'; this.copied = ''; this.render(); if (this.el) this.el.scrollTop = 0; return;
      case 'copyRatings': void this.copyRatings(); return;
      case 'cheese':
        if (this.cheatTarget()) this.withCheat((t) => giveCheese(t.profile, CHEESE_GIFT));
        else { this.host.addCheese(CHEESE_GIFT); this.render(); }
        return;
      case 'crests': this.withCheat((t) => giveCrests(t.profile, CREST_GIFT)); return;
      case 'unlockLevels': this.withCheat((t) => unlockLevels(t.profile, t.world, this.unlockTo)); return;
      case 'wResetTier': resetWeaponOverrides(this.editWeapon, this.editTier); this.editorOpen = true; this.render(); return;
      case 'wResetWeapon': resetWeaponOverrides(this.editWeapon); this.editorOpen = true; this.render(); return;
      case 'wResetAll': resetWeaponOverrides(); this.editorNote = ''; this.editorOpen = true; this.render(); return;
      case 'wExport': this.editorNote = overridesAsText(); this.editorOpen = true; this.render(); return;
      case 'wImport': {
        const text = this.el?.querySelector<HTMLTextAreaElement>('#devWeaponText')?.value ?? '';
        try {
          this.editorNote = `Imported ${importOverrides(text)} values.`;
        } catch {
          this.editorNote = 'That was not a weapon export.';
        }
        this.editorOpen = true;
        this.render();
        return;
      }
      case 'unlockAll': this.host.unlockEverything(); this.render(); return;
      case 'resetProfile': this.confirmReset = true; this.render(); return;
      case 'resetCancel': this.confirmReset = false; this.render(); return;
      case 'resetConfirm': this.confirmReset = false; this.host.resetProfile(); this.render(); return;
      case 'export': if (area) area.value = JSON.stringify(this.host.values(), null, 2); return;
      case 'import':
        if (!area) return;
        try {
          this.host.apply({ ...this.host.values(), ...(JSON.parse(area.value) as Partial<Tuning>) });
          this.render();
        } catch {
          area.value = 'That was not valid JSON.';
        }
        return;
    }
  }

  /** Runs a cheat on the profile, then redraws the menus and this panel. */
  private withCheat(run: (t: CheatTarget) => unknown) {
    const t = this.cheatTarget();
    if (!t) return;
    run(t);
    t.redraw();
    this.render();
  }

  /** Puts the ratings on the clipboard; the text also shows below the button, to copy by hand if that fails. */
  private async copyRatings() {
    const text = this.host.ratingsText();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    this.copied = ok ? 'Copied' : 'Select the text below';
    if (this.el && this.view === 'review') this.render();
  }
}
