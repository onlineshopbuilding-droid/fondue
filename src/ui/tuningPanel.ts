import { TUNING_PRESETS, TUNING_SLIDERS, type Tuning } from '../config/tuning';

export interface TuningPanelHost {
  values(): Tuning;
  canEdit(): boolean;
  apply(t: Tuning): void;
}

/** Live sliders for the feel of the game. F1 toggles it. */
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
      <textarea data-json placeholder="Exported values appear here. Paste JSON and press Import."></textarea>`;
    el.addEventListener('input', (ev) => this.onInput(ev));
    el.addEventListener('click', (ev) => this.onClick(ev));
    this.root.appendChild(el);
  }

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
