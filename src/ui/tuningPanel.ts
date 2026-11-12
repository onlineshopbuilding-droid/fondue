// The developer menu: live sliders for the feel of the game, experiment switches, quick starts and profile tools.
// Opens from Options, with F1 or a long press on the logo; on a phone it scrolls and every control is finger sized.
import { REVIEW_ITEMS, type ReviewItem } from '../config/devReview';
import type { EnemyType } from '../config/enemies';
import { FLAG_DEFS, type Flags } from '../config/flags';
import { HANDS } from '../config/hand';
import { QUICK_STARTS, QUICK_START_MAX_DAY } from '../config/quickstart';
import { TUNING_PRESETS, TUNING_SLIDERS, type Tuning } from '../config/tuning';
import { MAX_TIER, WEAPONS, weaponById } from '../config/weapons';
import { ENEMY_POPUPS } from '../config/worlds/fondue/story';
import type { DevRating } from '../profile';
import { esc, weaponUri } from './html';

export interface TuningPanelHost {
  values(): Tuning;
  canEdit(): boolean;
  apply(t: Tuning): void;
  /** Experiment switches in effect. */
  flags(): Flags;
  setFlag(id: string, value: string): void;
  /** Day the next endless game starts on; 1 for a normal run. */
  startDay(): number;
  setStartDay(day: number): void;
  /** An endless run alone, starting on the chosen day. */
  startQuickEndless(): void;
  /** One line about the profile: stars, levels won. */
  profileSummary(): string;
  addStars(n: number): void;
  unlockEverything(): void;
  replayTutorial(): void;
  resetProfile(): void;
  /** Starts a campaign level alone on a later day. */
  jumpTo(level: number, day: number): void;
  levelCount(): number;
  /** How many days this campaign level has. */
  levelDays(level: number): number;
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
}

/** Stars added per tap of the button. */
const STAR_GIFT = 50;

/** The developer overview page, next to the game. */
const devOverviewUrl = (): string => `${import.meta.env.BASE_URL ?? '/'}dev/`;

const clampInt = (v: unknown, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));

export class TuningPanel {
  private el: HTMLDivElement | null = null;
  private confirmReset = false;
  private jumpLevel = 1;
  private jumpDay = 1;
  /** Which page of the menu is on show: the tools, or the decision and rating list. */
  private view: 'main' | 'review' = 'main';
  private tierWeapon = WEAPONS[0]?.id ?? '';
  private popupEnemy = (Object.keys(ENEMY_POPUPS)[0] ?? 'grunt') as EnemyType;
  private copied = '';

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
      <div class="dev-head"><h3>Developer menu</h3><button class="small" data-act="close" id="devClose">Close</button></div>
      ${this.developer(edit)}
      <div class="dev-section">
      <h3>Tuning</h3>
      ${edit ? '' : '<p class="note">The host sets these values.</p>'}
      <div class="row dev-options">
        ${Object.keys(TUNING_PRESETS).map((n) => `<button class="small secondary" data-preset="${n}" ${edit ? '' : 'disabled'}>${n}</button>`).join('')}
      </div>
      ${rows}
      <label class="dev-check"><input type="checkbox" data-toggle="knockOthers" ${t.knockOthers ? 'checked' : ''} ${edit ? '' : 'disabled'}> Thrown enemies knock others over</label>
      <div class="note-dev">Changed tuning or switches make every run a developer run: no scores, no stars.</div>
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
    const day = this.host.startDay();
    const days = [1, ...QUICK_STARTS.map((q) => q.day)].map((d) => `<button class="small ${day === d ? '' : 'secondary'}" data-startday="${d}" ${edit ? '' : 'disabled'}>${d === 1 ? 'Normal' : `Day ${d}`}</button>`).join('');
    const reset = this.confirmReset
      ? `<div class="dev-confirm" id="resetConfirm"><div class="dev-label">Erase the whole profile? This cannot be undone.</div>
          <div class="row navrow"><div class="nav-back"><button class="small secondary" data-act="resetCancel">Cancel</button></div>
          <div class="nav-forward"><button class="small alt" data-act="resetConfirm">Erase profile</button></div></div></div>`
      : '<button class="small alt" data-act="resetProfile" id="devResetProfile">Reset profile</button>';
    const maxDay = this.host.levelDays(this.jumpLevel);
    this.jumpDay = Math.min(this.jumpDay, maxDay);
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
            <label class="dev-num">Day <input type="number" id="devDay" min="1" max="${maxDay}" value="${this.jumpDay}"></label>
            <button class="small" data-act="jump" id="devJump">Go</button>
          </div>
          <div class="note-dev">Starts alone at once. A later day counts as a developer run.</div>
        </div>
        <div class="dev-row">
          <div class="dev-label">Endless starts on</div>
          <div class="row dev-options">${days}
            <label class="dev-num">Day <input type="number" id="devEndlessDay" min="1" max="${QUICK_START_MAX_DAY}" value="${day}" ${edit ? '' : 'disabled'}></label>
          </div>
          <div class="note-dev">Applies to solo and to an endless game you host. Quick starts do not count for the scores.</div>
          ${edit ? '<div class="row dev-options" style="margin-top:6px"><button class="small" data-act="quickSolo" id="devQuickSolo">Start endless now</button></div>' : ''}
        </div>
        <div class="dev-row">
          <div class="dev-label">Profile</div>
          <div class="note-dev" id="devProfile">${this.host.profileSummary()}</div>
          <div class="row dev-options">
            <button class="small secondary" data-act="stars" id="devStars">+${STAR_GIFT} stars</button>
            <button class="small secondary" data-act="unlockAll" id="devUnlockAll">Unlock everything</button>
            <button class="small secondary" data-act="replayTutorial" id="devTutorial">Replay tutorial</button>
          </div>
          <div class="row dev-options" style="margin-top:6px">${reset}</div>
        </div>
        ${this.tiers()}
        ${this.popups()}
        ${switches}
      </div>`;
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
      // The day field follows the chosen level: it allows every day that level has.
      const dayField = this.el?.querySelector<HTMLInputElement>('#devDay');
      const max = this.host.levelDays(this.jumpLevel);
      if (dayField) {
        dayField.max = String(max);
        if (this.jumpDay > max) { this.jumpDay = max; dayField.value = String(max); }
      }
      return;
    }
    if (target.id === 'devDay') { this.jumpDay = clampInt(target.value, 1, this.host.levelDays(this.jumpLevel)); return; }
    if (target.id === 'devEndlessDay') { if (target.value !== '') this.host.setStartDay(clampInt(target.value, 1, QUICK_START_MAX_DAY)); return; }
    if (target.dataset.rnote) { this.host.setRating(target.dataset.rnote, { note: target.value }); return; }
    if (target.id === 'devTierWeapon' || target.id === 'devPopupEnemy' || target.dataset.rcheck) return;
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
    if (b.dataset.startday) {
      this.host.setStartDay(Number(b.dataset.startday));
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
      case 'jump': this.toggle(); this.host.jumpTo(this.jumpLevel, Math.min(this.jumpDay, this.host.levelDays(this.jumpLevel))); return;
      case 'replayTutorial': this.toggle(); this.host.replayTutorial(); return;
      case 'popup': this.toggle(); this.host.showEnemyPopup(this.popupEnemy); return;
      case 'review': this.view = 'review'; this.copied = ''; this.render(); if (this.el) this.el.scrollTop = 0; return;
      case 'reviewBack': this.view = 'main'; this.copied = ''; this.render(); if (this.el) this.el.scrollTop = 0; return;
      case 'copyRatings': void this.copyRatings(); return;
      case 'stars': this.host.addStars(STAR_GIFT); this.render(); return;
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
