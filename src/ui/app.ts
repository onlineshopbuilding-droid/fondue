// First: patches WebGL shader source before Phaser compiles anything.
import '../render/glFix';
import Phaser from 'phaser';
import { PROPS } from '../art/props';
import { AudioEngine } from '../audio/audio';
import { ENEMIES } from '../config/enemies';
import { WEAPON_SLOTS } from '../config/shop';
import { fieldForAspect } from '../config/world';
import { HostSession, type Session } from '../game/session';
import { addScore, loadSettings, saveSettings, type Settings } from '../game/storage';
import type { ViewState } from '../net/snapshot';
import { normalizeRoomCode, type Transport } from '../net/transport';
import { GameScene } from '../render/scene';
import { allArtReady, buildTextures } from '../render/textures';
import { RIGS } from '../art/characters';
import { computeView, readSafeArea, renderScale, sameView } from '../render/viewport';
import type { Meta } from '../sim/types';
import { ownsSlot } from '../sim/keep';
import { LOADING_TIPS, STATION_TIPS, WEAPON_TIPS } from './content';
import { BUILD, CoopRoom, type CoopRoomHost } from './coop/room';
import { SCREENS } from './screens';
import type { ScreenContext } from './screens/context';
import { ScreenManager, type ScreenId } from './screens/screen';
import { TuningPanel } from './tuningPanel';

/** Upright touch devices are asked to rotate; the game is built for landscape. */
const UPRIGHT_PHONE = '(orientation: portrait) and (pointer: coarse)';

const LOGO_HOLD_MS = 700;

/** The entry point: boots Phaser, owns the session and the settings, and keeps the screens in step with the game. */
export class App implements ScreenContext, CoopRoomHost {
  game!: Phaser.Game;
  scene!: GameScene;
  session: Session | null = null;
  readonly audio = new AudioEngine();
  /** How long turning all art into textures took at boot, for the debug overlay and tests. */
  textureMs = 0;
  /** True once the art loaded in the background after boot is complete too (for tests). */
  get artReady(): boolean { return allArtReady(); }
  /** The raw art, so the art test can check it in the built game as well as on the dev server. */
  readonly art = { rigs: RIGS, props: PROPS };
  readonly settings: Settings = loadSettings();
  readonly params = new URLSearchParams(location.search);
  readonly coop = new CoopRoom(this);
  /** Day the next game starts on; set from the developer menu, 1 for a normal run. */
  startDay = 1;
  loadingTip = LOADING_TIPS[0];
  private ui: HTMLElement;
  private screens: ScreenManager;
  private toasts: HTMLDivElement;
  private badge: HTMLDivElement;
  private debugEl: HTMLDivElement | null = null;
  private tuning: TuningPanel;
  private shownWeaponTips = new Set<string>();

  private lastPhase = '';
  private lastMetaRev = -1;
  private scoreSaved = false;
  private tipShownDay = 0;
  private lastSavedRun = '';
  private lastPurse = '';
  private lostToastShown = false;

  /** The screen on show; tests read this. */
  get screen(): ScreenId { return this.screens.current; }
  /** Tests reach the host's link to the guest and the room code here. */
  get lobbyLink(): Transport | null { return this.coop.lobbyLink; }
  get code(): string { return this.coop.code; }

  constructor() {
    this.ui = document.getElementById('ui')!;
    this.toasts = document.createElement('div');
    this.toasts.className = 'toast-area';
    this.ui.appendChild(this.toasts);
    this.screens = new ScreenManager(this.ui, this.toasts, SCREENS, this);
    this.badge = document.createElement('div');
    this.badge.className = 'net-badge';
    this.badge.style.display = 'none';
    this.ui.appendChild(this.badge);
    this.tuning = new TuningPanel(this.ui, {
      values: () => this.session?.meta()?.tuning ?? this.settings.tuning,
      canEdit: () => this.session?.role !== 'guest',
      apply: (t) => {
        this.settings.tuning = t;
        saveSettings(this.settings);
        if (this.session instanceof HostSession) this.session.sim.setTuning(t);
      },
      flags: () => this.session?.meta()?.flags ?? this.settings.flags,
      setFlag: (id, value) => {
        this.settings.flags = { ...this.settings.flags, [id]: value };
        saveSettings(this.settings);
        if (this.session instanceof HostSession) this.session.sim.setFlags(this.settings.flags);
      },
      startDay: () => this.startDay,
      setStartDay: (day) => { this.startDay = day; if (this.screen === 'play' || this.screen === 'host') this.show(this.screen); },
      startSoloNow: () => this.startSolo(),
    });
    this.applyAudioSettings();
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pagehide', () => this.session?.dispose());
    this.bindLogoLongPress();
    const rotate = document.createElement('div');
    rotate.id = 'rotate';
    rotate.innerHTML = '<div class="phone-icon"></div><div>Turn your phone sideways to play</div>';
    document.body.appendChild(rotate);
    window.matchMedia(UPRIGHT_PHONE).addEventListener('change', (e) => { if (e.matches) this.pauseSoloFight(); });
    this.startBackgroundTicker();
    window.addEventListener('pointerdown', () => {
      this.audio.resume();
      if (!this.session) this.audio.startMusic('menu');
    });
  }

  /** Phones have no F1: holding the logo in the main menu opens the developer menu. */
  private bindLogoLongPress() {
    let timer = 0;
    let downAt = 0;
    const open = () => { timer = 0; this.audio.play('uiClick'); if (!this.tuning.open) this.tuning.toggle(); };
    const stop = () => { clearTimeout(timer); timer = 0; };
    this.ui.addEventListener('pointerdown', (e) => {
      if (!(e.target as HTMLElement).closest?.('.logo')) return;
      stop();
      downAt = e.timeStamp;
      timer = window.setTimeout(open, LOGO_HOLD_MS);
    });
    // If the page was busy, the release can arrive before the timer had a chance to run. The
    // events' own time stamps say how long the finger really stayed down.
    this.ui.addEventListener('pointerup', (e) => {
      const held = timer !== 0 && e.timeStamp - downAt >= LOGO_HOLD_MS;
      stop();
      if (held) open();
    });
    for (const ev of ['pointercancel', 'pointerleave']) this.ui.addEventListener(ev, stop);
  }

  /** Browsers stop drawing hidden tabs; a co-op game must keep running for the other player. */
  private startBackgroundTicker() {
    if (typeof Worker === 'undefined') return;
    const code = 'setInterval(() => postMessage(0), 33);';
    const worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
    let last = performance.now();
    worker.onmessage = () => {
      const now = performance.now();
      const dt = Math.min(100, now - last);
      last = now;
      const s = this.session;
      if (!document.hidden || !s || s.role === 'solo') return;
      s.update(dt);
      s.drainEvents();
    };
  }

  async boot() {
    await Promise.all([
      document.fonts.load('30px "Lilita One"'),
      document.fonts.load('600 20px "Nunito"'),
    ]);
    this.scene = new GameScene();
    this.scene.audio = this.audio;
    this.scene.hooks = {
      onFrame: (v) => this.onFrame(v),
      togglePause: () => this.togglePause(),
      isInputBlocked: () => this.screens.isOpen,
      onBuyNotice: (t) => { if (this.session?.role !== 'solo') this.toast(t); },
    };
    const view = computeView(innerWidth, innerHeight, readSafeArea());
    this.scene.view = view;
    const rs = renderScale(view, window.devicePixelRatio);
    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: 'app',
      width: Math.round(view.width * rs),
      height: Math.round(view.height * rs),
      backgroundColor: '#1c2a33',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false },
      fps: { smoothStep: false },
      banner: false,
      scene: [],
    });
    await new Promise<void>((r) => this.game.events.once(Phaser.Core.Events.READY, () => r()));
    const texStart = performance.now();
    await buildTextures(this.game);
    this.textureMs = Math.round(performance.now() - texStart);
    this.game.scene.add('game', this.scene, true);
    (window as unknown as Record<string, unknown>).__fondue = this;
    window.addEventListener('resize', () => this.applyView());

    if (this.params.get('relay')) this.settings.relayAddress = this.params.get('relay')!;
    const invite = this.params.get('join');
    if (invite) {
      this.show('join');
      const input = this.query<HTMLInputElement>('#code');
      if (input) input.value = normalizeRoomCode(invite);
    } else {
      this.show('main');
    }
  }

  /** Follows window resizes and phone rotation. */
  private applyView() {
    const s = this.session;
    const shared = s && s.role !== 'solo' ? s.meta()?.fieldW : undefined;
    const v = computeView(innerWidth, innerHeight, readSafeArea(), shared);
    // Alone there is nobody to stay in step with, so the field simply follows the screen.
    if (s instanceof HostSession && s.role === 'solo') s.sim.setFieldWidth(v.fieldW);
    // The device pixel ratio changes when a window moves to another monitor or the page is zoomed.
    if (sameView(v, this.scene.view) && renderScale(v, window.devicePixelRatio) === this.scene.renderScale) return;
    this.scene.setView(v);
  }

  /** Turning a phone upright hides the game; a solo fight should wait for the player. */
  private pauseSoloFight() {
    const s = this.session;
    const v = s?.view();
    if (s?.role === 'solo' && v && !v.paused && (v.phase === 'battle' || v.phase === 'banner')) this.togglePause();
  }

  private applyAudioSettings() {
    this.audio.setMusicVolume(this.settings.musicVolume);
    this.audio.setSfxVolume(this.settings.sfxVolume);
    this.audio.setMuted(this.settings.muted);
  }

  commitSettings() {
    saveSettings(this.settings);
    this.applyAudioSettings();
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'F1' || e.key === '^') { e.preventDefault(); this.tuning.toggle(); }
    if (e.key === 'F3') { e.preventDefault(); this.toggleDebug(); }
    if (this.screen === 'pause' && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) this.togglePause();
  }

  private toggleDebug() {
    if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; return; }
    this.debugEl = document.createElement('div');
    this.debugEl.id = 'debug';
    this.ui.appendChild(this.debugEl);
  }

  toast(text: string, kind = '', ms = 2600) {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    this.toasts.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------------------------------------------------------------------------
  // Frame hook: keeps the DOM screens in step with the game phase.
  // ---------------------------------------------------------------------------

  private onFrame(view: ViewState | null) {
    this.updateBadge();
    if (this.debugEl) this.updateDebug(view);
    const s = this.session;
    if (!s || !view) return;
    const meta = s.meta();

    if (view.phase !== this.lastPhase) {
      this.lastPhase = view.phase;
      this.onPhase(view, meta);
    }
    if (meta && meta.rev !== this.lastMetaRev) {
      this.lastMetaRev = meta.rev;
      if (this.screen === 'results' || this.screen === 'shop') this.show(this.screen);
    }
    // A guest learns the field width from the host once the game has started.
    if (meta && s.role !== 'solo' && meta.fieldW !== this.scene.view.fieldW) this.applyView();
    const purse = `${view.gold}/${view.offerings}`;
    if (purse !== this.lastPurse) {
      this.lastPurse = purse;
      if (this.screen === 'shop') this.show('shop');
    }
    this.syncPause(view, meta);
    this.syncConnection();
    if (view.phase === 'banner' && meta && this.tipShownDay !== view.day) {
      this.tipShownDay = view.day;
      if (view.day === 1) this.toast('Hold the gate until the sun has set and the last raider is gone. Gold buys upgrades between days.', 'tip', 5500);
      for (const t of meta.newTipTypes) this.toast(ENEMIES[t].tip, 'tip', 5500);
      this.tipNewWeapons(meta);
    }
  }

  /** Each weapon explains itself the first time it stands on the keep. */
  private tipNewWeapons(meta: Meta) {
    for (const slot of WEAPON_SLOTS) {
      if (this.shownWeaponTips.has(slot) || !ownsSlot(slot, meta)) continue;
      this.shownWeaponTips.add(slot);
      if (meta.quickStart === 0) this.toast(WEAPON_TIPS[slot], 'tip', 5500);
    }
    for (const station of ['cauldron', 'perch']) {
      if (this.shownWeaponTips.has(station) || !meta.owned.includes(station)) continue;
      this.shownWeaponTips.add(station);
      const tip = station === 'cauldron' ? `cauldron${meta.flags.cauldron}` : station;
      if (meta.quickStart === 0) this.toast(STATION_TIPS[tip], 'tip', 5500);
    }
  }

  private onPhase(view: ViewState, meta: Meta | null) {
    switch (view.phase) {
      case 'banner':
      case 'battle':
        if (this.screen === 'results' || this.screen === 'shop') this.show('none');
        this.audio.startMusic('battle');
        break;
      case 'intermission':
        this.loadingTip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
        this.audio.startMusic('menu');
        this.show('results');
        break;
      case 'gameover':
        this.audio.stopMusic();
        if (meta && meta.quickStart === 0 && !this.scoreSaved && this.runKey(meta, view) !== this.lastSavedRun) {
          this.scoreSaved = true;
          this.lastSavedRun = this.runKey(meta, view);
          addScore({
            names: meta.names.join(' & '), coop: meta.names.length > 1, day: view.day,
            score: meta.totalScore, kills: meta.totalKills, difficulty: meta.difficulty,
            date: new Date().toISOString().slice(0, 10),
          });
        }
        this.show('gameover');
        break;
    }
  }

  private runKey(meta: Meta, view: ViewState) { return `${meta.names.join()}-${view.day}-${meta.totalScore}-${meta.totalKills}`; }

  private syncPause(view: ViewState, meta: Meta | null) {
    const isLoss = meta?.pausedBy === 'Connection lost';
    if (view.paused && !isLoss && this.screen === 'none') this.show('pause');
    if (view.paused && isLoss && this.session?.role === 'host' && (this.screen === 'none' || this.screen === 'pause')) this.show('lostHost');
    if (!view.paused && (this.screen === 'pause' || this.screen === 'lostHost')) this.show('none');
  }

  private syncConnection() {
    const s = this.session;
    if (!s) return;
    if (s.role === 'host' && s.connection() === 'connected') this.lostToastShown = false;
    if (s.role === 'host' && s.connection() === 'lost' && !this.lostToastShown && (this.screen === 'results' || this.screen === 'shop')) {
      this.lostToastShown = true;
      this.toast('Your friend dropped out. You can carry on; they can rejoin with the room code.', '', 5000);
    }
    if (s.role === 'host' && s.connection() === 'connected' && this.screen === 'lostHost') this.show('none');
    if (s.role === 'guest' && s.connection() === 'lost' && this.screen !== 'lostGuest' && this.screen !== 'main') this.show('lostGuest');
  }

  private updateBadge() {
    const s = this.session;
    if (!s || s.role === 'solo') { this.badge.style.display = 'none'; return; }
    const c = s.connection();
    this.badge.style.display = 'block';
    this.badge.textContent = c === 'connected' ? `Connected, ${Math.round(s.pingMs())} ms` : c === 'lost' ? 'Connection lost' : 'Waiting';
  }

  private updateDebug(view: ViewState | null) {
    if (!this.debugEl) return;
    const s = this.session;
    this.debugEl.textContent = `FPS ${this.scene.debug.fps.toFixed(0)}  frame ${this.scene.debug.frameMs.toFixed(1)} ms\n`
      + `enemies ${view?.enemies.length ?? 0}  projectiles ${view?.projectiles.length ?? 0}\n`
      + `role ${s?.role ?? '-'}  ping ${s ? Math.round(s.pingMs()) : 0} ms  build ${BUILD}`;
  }

  togglePause() {
    const s = this.session;
    if (!s) return;
    const v = s.view();
    if (!v) return;
    s.send({ k: 'pause', paused: !v.paused });
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  useSession(s: Session) {
    this.session?.dispose();
    this.session = s;
    this.scene.resetForNewGame();
    this.scene.session = s;
    this.lastPhase = '';
    this.lastMetaRev = -1;
    this.scoreSaved = false;
    this.tipShownDay = 0;
    this.shownWeaponTips.clear();
    this.show('none');
    this.applyView();
  }

  releaseSession(alsoFromScene = false) {
    this.session = null;
    if (alsoFromScene) this.scene.session = null;
  }

  onGuestRestart() {
    this.scene.resetForNewGame();
    this.lastPhase = '';
    this.lastMetaRev = -1;
    this.scoreSaved = false;
    this.tipShownDay = 0;
    this.show('none');
  }

  /** What a new game takes from the host's settings and screen. */
  gameOptions() {
    return {
      seed: this.seed(), difficulty: this.settings.difficulty, tuning: this.settings.tuning, flags: this.settings.flags,
      fieldW: fieldForAspect(innerWidth / innerHeight), quickStart: this.startDay > 1 ? this.startDay : undefined,
    };
  }

  private seed(): number {
    const fixed = this.params.get('seed');
    return fixed ? Number(fixed) : Math.floor(Math.random() * 2 ** 31);
  }

  startSolo() {
    this.coop.closeRoom();
    this.useSession(new HostSession({ ...this.gameOptions(), names: [this.playerName()], coop: false }));
  }

  playerName(): string { return this.settings.name.trim() || 'Player'; }

  leaveToMenu() {
    this.coop.hangUp(this.session?.role === 'host');
    this.session?.dispose();
    this.session = null;
    this.scene.session = null;
    this.scene.resetForNewGame();
    this.coop.reset();
    this.audio.startMusic('menu');
    this.show('main');
  }

  // ---------------------------------------------------------------------------
  // Screens: one file each in screens/, shown by the ScreenManager.
  // ---------------------------------------------------------------------------

  show(screen: ScreenId, arg?: string) { this.screens.show(screen, arg); }

  query<T extends Element>(selector: string): T | null { return this.screens.query<T>(selector); }
}
