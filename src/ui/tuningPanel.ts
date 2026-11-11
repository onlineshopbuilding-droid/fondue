// The developer menu: live sliders for the feel of the game, experiment switches, quick starts and profile tools.
// Opens from Options, with F1 or a long press on the logo; on a phone it scrolls and every control is finger sized.
import { FLAG_DEFS, type Flags } from '../config/flags';
import { QUICK_STARTS } from '../config/quickstart';
import { TUNING_PRESETS, TUNING_SLIDERS, type Tuning } from '../config/tuning';

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
}

/** Stars added per tap of the button. */
const STAR_GIFT = 50;

export class TuningPanel {
  private el: HTMLDivElement | null = null;
  private confirmReset = false;
  private jumpLevel = 1;
  private jumpDay = 1;

  constructor(private root: HTMLElement, private host: TuningPanelHost) {}

  get open() { return this.el !== null; }

  toggle() {
    if (this.el) { this.el.remove(); this.el = null; this.confirmReset = false; return; }
    this.render();
  }

  private render() {
    const scroll = this.el?.scrollTop ?? 0;
    this.el?.remove();
    const el = document.createElement('div');
    el.id = 'tuning';
    this.el = el;
    const t = this.host.values();
    const edit = this.host.canEdit();
    const rows = TUNING_SLIDERS.map((s) => `
      <div class="t-row">
        <span>${s.label}</span><span data-val="${s.key}" style="text-align:right">${t[s.key]}</span>
        <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${t[s.key]}" ${edit ? '' : 'disabled'}>
      </div>`).join('');
    el.innerHTML = `
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
    el.addEventListener('input', (ev) => this.onInput(ev));
    el.addEventListener('click', (ev) => this.onClick(ev));
    this.root.appendChild(el);
    el.scrollTop = scroll;
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
    return `
      <div class="dev-section" id="developer">
        ${edit ? '' : '<p class="note">The host decides these for both players.</p>'}
        <div class="dev-row">
          <div class="dev-label">Jump to a campaign level</div>
          <div class="row dev-options">
            <label class="dev-num">Level <input type="number" id="devLevel" min="1" max="${this.host.levelCount()}" value="${this.jumpLevel}"></label>
            <label class="dev-num">Day <input type="number" id="devDay" min="1" max="15" value="${this.jumpDay}"></label>
            <button class="small" data-act="jump" id="devJump">Go</button>
          </div>
          <div class="note-dev">Starts alone at once. A later day counts as a developer run.</div>
        </div>
        <div class="dev-row">
          <div class="dev-label">Endless starts on</div>
          <div class="row dev-options">${days}</div>
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
        ${switches}
      </div>`;
  }

  /** Redraws the panel if something else changed what it shows, such as the host's switches. */
  refresh() { if (this.el) this.render(); }

  private onInput(ev: Event) {
    const target = ev.target as HTMLInputElement;
    if (target.id === 'devLevel') { this.jumpLevel = Math.max(1, Math.round(Number(target.value) || 1)); return; }
    if (target.id === 'devDay') { this.jumpDay = Math.max(1, Math.round(Number(target.value) || 1)); return; }
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
    const area = this.el?.querySelector<HTMLTextAreaElement>('[data-json]');
    switch (b.dataset.act) {
      case 'close': this.toggle(); return;
      case 'quickSolo': this.toggle(); this.host.startQuickEndless(); return;
      case 'jump': this.toggle(); this.host.jumpTo(this.jumpLevel, this.jumpDay); return;
      case 'replayTutorial': this.toggle(); this.host.replayTutorial(); return;
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
}
