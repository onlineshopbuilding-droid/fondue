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
  /** Day the next game starts on; 1 for a normal run. */
  startDay(): number;
  setStartDay(day: number): void;
  startSoloNow(): void;
}

/** Live sliders for the feel of the game and the developer tools. F1 or a long press on the logo. */
export class TuningPanel {
  private el: HTMLDivElement | null = null;

  constructor(private root: HTMLElement, private host: TuningPanelHost) {}

  get open() { return this.el !== null; }

  toggle() {
    if (this.el) { this.el.remove(); this.el = null; return; }
    this.render();
  }

  private render() {
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
      <h3>Tuning</h3>
      ${edit ? '' : '<p class="note">The host sets these values.</p>'}
      <div class="row" style="justify-content:flex-start;margin-bottom:8px">
        ${Object.keys(TUNING_PRESETS).map((n) => `<button class="small secondary" data-preset="${n}" ${edit ? '' : 'disabled'}>${n}</button>`).join('')}
      </div>
      ${rows}
      <label><input type="checkbox" data-toggle="knockOthers" ${t.knockOthers ? 'checked' : ''} ${edit ? '' : 'disabled'}> Thrown enemies knock others over</label>
      <div class="row" style="justify-content:flex-start;margin:10px 0 6px">
        <button class="small secondary" data-act="export">Export</button>
        <button class="small secondary" data-act="import" ${edit ? '' : 'disabled'}>Import</button>
        <button class="small" data-act="close">Close</button>
      </div>
      <textarea data-json placeholder="Exported values appear here. Paste JSON and press Import."></textarea>
      ${this.developer(edit)}`;
    el.addEventListener('input', (ev) => this.onInput(ev));
    el.addEventListener('click', (ev) => this.onClick(ev));
    this.root.appendChild(el);
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
    return `
      <div class="dev-section" id="developer">
        <h3>Developer</h3>
        ${edit ? '' : '<p class="note">The host decides these for both players.</p>'}
        ${switches}
        <div class="dev-row">
          <div class="dev-label">Next game starts on</div>
          <div class="row dev-options">${days}</div>
          <div class="note-dev">Applies to solo and to a co-op game you host. Quick starts do not count for the scores.</div>
          ${edit ? '<div class="row dev-options" style="margin-top:6px"><button class="small" data-act="quickSolo">Start solo now</button></div>' : ''}
        </div>
      </div>`;
  }

  /** Redraws the panel if something else changed what it shows, such as the host's switches. */
  refresh() { if (this.el) this.render(); }

  private onInput(ev: Event) {
    const target = ev.target as HTMLInputElement;
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
    if (!b) return;
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
    if (b.dataset.act === 'quickSolo') {
      this.toggle();
      this.host.startSoloNow();
      return;
    }
    if (b.dataset.preset) {
      this.host.apply({ ...TUNING_PRESETS[b.dataset.preset] });
      this.render();
      return;
    }
    const area = this.el?.querySelector<HTMLTextAreaElement>('[data-json]');
    if (b.dataset.act === 'close') this.toggle();
    if (b.dataset.act === 'export' && area) area.value = JSON.stringify(this.host.values(), null, 2);
    if (b.dataset.act === 'import' && area) {
      try {
        this.host.apply({ ...this.host.values(), ...(JSON.parse(area.value) as Partial<Tuning>) });
        this.render();
      } catch {
        area.value = 'That was not valid JSON.';
      }
    }
  }
}
