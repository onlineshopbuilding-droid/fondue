// First: patches WebGL shader source before Phaser compiles anything.
import '../render/glFix';
import Phaser from 'phaser';
import { PROPS } from '../art/props';
import { AudioEngine } from '../audio/audio';
import { reviewLabels } from '../config/devReview';
import { quickStartFor } from '../config/quickstart';
import { FLAG_DEFS } from '../config/flags';
import { fieldForAspect } from '../config/field';
import { STATION_IDS } from '../config/keep';
import { SLOT_COUNT } from '../config/slots';
import { TUNING_DEFAULT, type Tuning } from '../config/tuning';
import { WEAPONS, weaponById } from '../config/weapons';
import { DEFAULT_WORLD, levelOf, worldById } from '../config/worlds';
import { HostSession, type Session } from '../game/session';
import { CAMPAIGN, ENDLESS, MODES, TUTORIAL, cheatCheese, modeOf, syncUnlocks, unlockLevelOf, type GameMode, type NextStep, type Reward, type RunChoice, type RunEnv } from '../modes';
import type { ViewState } from '../net/snapshot';
import type { RoomPlan } from '../net/protocol';
import { normalizeRoomCode, type Transport } from '../net/transport';
import { LocalProfileStore, MemoryProfileStore, Profile, type ProfileSettings, type ProfileStore } from '../profile';
import { GameScene } from '../render/scene';
import { allArtReady, buildTextures } from '../render/textures';
import { RIGS } from '../art/characters';
import { computeView, readSafeArea, renderScale, sameView } from '../render/viewport';
import type { RunResult, RunRules, RunSetup } from '../sim/rules';
import type { Meta } from '../sim/types';
import { FIRST_FIGHT_TIP, LOADING_TIPS, STATION_TIPS, weaponTip } from './content';
import { BUILD, CoopRoom, type CoopRoomHost } from './coop/room';
import { EnemyPopup } from './enemyPopup';
import { SCREENS } from './screens';
import type { PendingRun, ScreenContext } from './screens/context';
import { ScreenManager, type ScreenId } from './screens/screen';
import { mainScreen } from './screens/main';
import { shopAfterWin } from '../modes/tutorial';
import { Lobby } from './lobby/lobby';
import { TuningPanel } from './tuningPanel';

/** Upright touch devices are asked to rotate; the game is built for landscape. */
const UPRIGHT_PHONE = '(orientation: portrait) and (pointer: coarse)';

const LOGO_HOLD_MS = 700;

/** What started the current solo run, so "Try again" can start it once more. */
interface RunPick { mode: string; choice: RunChoice }

/** Reads the profile the page asks for: a throw-away one for tests, an imported one, or the saved one. */
async function loadProfile(params: URLSearchParams): Promise<{ profile: Profile; temporary: boolean; importFailed: boolean }> {
  const code = params.get('profile');
  if (params.get('fresh') === '1' || code) {
    const profile = await Profile.load(new MemoryProfileStore());
    let importFailed = false;
    if (code) {
      try { profile.importCode(code); } catch { importFailed = true; }
    }
    return { profile, temporary: true, importFailed };
  }
  const store: ProfileStore = new LocalProfileStore();
  return { profile: await Profile.load(store), temporary: false, importFailed: false };
}

/** The entry point: loads the profile, boots Phaser, owns the session, and keeps the screens in step with the game. */
export class App implements ScreenContext, CoopRoomHost {
  game!: Phaser.Game;
  scene!: GameScene;
  session: Session | null = null;
  profile!: Profile;
  temporaryProfile = false;
  readonly world = DEFAULT_WORLD;
  readonly audio = new AudioEngine();
  /** How long turning all art into textures took at boot, for the debug overlay and tests. */
  textureMs = 0;
  /** True once the art loaded in the background after boot is complete too (for tests). */
  get artReady(): boolean { return allArtReady(); }
  /** The raw art, so the art test can check it in the built game as well as on the dev server. */
  readonly art = { rigs: RIGS, props: PROPS };
  readonly params = new URLSearchParams(location.search);
  readonly coop = new CoopRoom(this);
  /** Wave the next endless game starts at; set from the developer menu, 1 for a normal run. */
  startWave = 1;
  loadingTip = LOADING_TIPS[0];
  /** What the run that just ended brought; the result screens show it. */
  reward: Reward | null = null;
  result: RunResult | null = null;
  resultRules: RunRules | null = null;
  readonly popup: EnemyPopup;
  /** The main menu as the hall inside the keep; tests use `lobby.spots()` and `lobby.tap(id)`. */
  readonly lobby: Lobby;
  private ui: HTMLElement;
  private screens: ScreenManager;
  private toasts: HTMLDivElement;
  private badge: HTMLDivElement;
  private debugEl: HTMLDivElement | null = null;
  private tuning!: TuningPanel;
  private lastPick: RunPick | null = null;

  private lastPhase = '';
  private lastMetaRev = -1;
  private handledRun = '';
  private bannerKey = '';
  private lastWave = -1;
  private lostToastShown = false;

  get settings(): Readonly<ProfileSettings> { return this.profile.data.settings; }
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
    this.popup = new EnemyPopup(this.ui);
    this.lobby = new Lobby(this, this.ui);
    this.badge = document.createElement('div');
    this.badge.className = 'net-badge';
    this.badge.style.display = 'none';
    this.ui.appendChild(this.badge);
  }

  /** Everything that needs the profile; runs once it is loaded. */
  private wireUp() {
    this.tuning = new TuningPanel(this.ui, {
      values: () => this.session?.meta()?.tuning ?? this.settings.tuning,
      canEdit: () => this.session?.role !== 'guest',
      apply: (t) => {
        this.profile.updateSettings({ tuning: t });
        if (this.session instanceof HostSession) this.session.sim.setTuning(t);
      },
      flags: () => this.session?.meta()?.flags ?? this.settings.flags,
      setFlag: (id, value) => {
        this.profile.updateSettings({ flags: { [id]: value } });
        if (this.session instanceof HostSession) this.session.sim.setFlags({ ...this.settings.flags });
      },
      startWave: () => this.startWave,
      setStartWave: (wave) => { this.startWave = wave; if (this.screen === 'play' || this.screen === 'host') this.show(this.screen); },
      startQuickEndless: () => this.startEndless(),
      profileSummary: () => `🧀 ${this.profile.data.wallet.cheese} · gold ${this.profile.data.wallet.gold} · crests ${this.profile.data.wallet.crests} · levels won: ${this.profile.highestLevelDone(this.world)} · hand tier ${this.profile.data.keep.handTier}${this.profile.data.cheats.used ? ' · cheats used' : ''}${this.temporaryProfile ? ' · test profile' : ''}`,
      addCheese: (n) => { cheatCheese(this.profile, n); this.redrawMenus(); },
      unlockEverything: () => { this.unlockEverything(); this.redrawMenus(); },
      replayTutorial: () => { this.profile.resetTutorial(); this.startTutorial(); },
      resetProfile: () => {
        this.profile.reset();
        syncUnlocks(this.profile, this.world);
        this.applyAudioSettings();
        this.toast('Profile erased');
        this.redrawMenus();
      },
      jumpTo: (level, wave) => {
        const max = worldById(this.world).campaign.length;
        this.startSoloRun(CAMPAIGN, { world: this.world, level: Math.max(1, Math.min(max, level)), wave });
      },
      levelCount: () => worldById(this.world).campaign.length,
      levelWaves: (level) => levelOf(this.world, level)?.waves.length ?? 1,
      weaponTier: (id) => this.profile.weaponTier(id),
      setWeaponTier: (id, tier) => { this.profile.setWeaponTier(id, tier); this.redrawMenus(); },
      handTier: () => this.profile.data.keep.handTier,
      setHandTier: (tier) => { this.profile.setHandTier(tier); this.redrawMenus(); },
      showEnemyPopup: (type) => this.popup.show([type]),
      ratings: () => this.profile.data.devRatings,
      setRating: (id, patch) => this.profile.setRating(id, patch),
      ratingsText: () => this.profile.ratingsAsText(reviewLabels()),
      profile: () => this.profile,
      world: () => this.world,
      afterCheat: () => this.redrawMenus(),
    });
    this.applyAudioSettings();
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pagehide', () => this.session?.dispose());
    // Saving must survive closing the tab and switching away from the home-screen app.
    const flush = () => this.profile?.flushSync();
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
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

  /** Menus that show cheese or unlocks are redrawn after a developer tool changed the profile. */
  private redrawMenus() {
    if (['main', 'armoury', 'campaign', 'options'].includes(this.screen)) this.show(this.screen);
  }

  /** Developer tool: every weapon, slot and station, as if the campaign were far along. */
  private unlockEverything() {
    // Slots follow from won levels, so the levels that open them are marked as won.
    for (let i = 0; i < SLOT_COUNT; i++) for (let l = 1; l <= (unlockLevelOf(this.world, 'slot', i) ?? 0); l++) this.profile.markLevelDone(this.world, l);
    this.profile.edit((d) => {
      for (const w of WEAPONS) if (w.enabled && !Object.hasOwn(d.keep.weapons, w.id)) d.keep.weapons[w.id] = { tier: 1 };
      for (const s of STATION_IDS) d.keep.stations[s] = Math.max(1, d.keep.stations[s]);
    });
    this.profile.noteCheat('unlock everything');
    syncUnlocks(this.profile, this.world);
    this.profile.flushSync();
    this.toast('Everything unlocked');
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
    // The profile comes first: settings, name and progress decide what the first screen is.
    const loaded = await loadProfile(this.params);
    this.profile = loaded.profile;
    this.temporaryProfile = loaded.temporary;
    syncUnlocks(this.profile, this.world);
    // A full or blocked storage: keep playing from memory and say so once.
    this.profile.onChange(() => setTimeout(() => { const n = this.profile.takeSaveNotice(); if (n) this.toast(n, 'tip', 5000); }, 400));
    (window as unknown as Record<string, unknown>).__fondue = this;
    this.wireUp();
    if (this.params.get('relay')) this.profile.updateSettings({ relayAddress: this.params.get('relay')! });

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
    this.lobby.attach(this.game, this.scene);
    window.addEventListener('resize', () => this.applyView());

    const invite = this.params.get('join');
    if (invite) {
      // A friend's link goes straight into their room; the tutorial waits for the next solo start.
      this.show('join');
      const input = this.query<HTMLInputElement>('#code');
      if (input) input.value = normalizeRoomCode(invite);
    } else if (this.params.get('tutorial') === '1' || this.tutorialDue()) {
      this.startTutorial();
    } else {
      this.show('main');
    }
    if (loaded.importFailed) this.toast('The profile code in the address is broken. Started with an empty test profile.', '', 5000);
  }

  /** A new player meets the tutorial before anything else, unless the page asks for the menu (tests). */
  private tutorialDue(): boolean {
    return !this.profile.data.seen.tutorial && !['1', 'html'].includes(this.params.get('menu') ?? '');
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
    const s = this.settings;
    this.audio.setMusicVolume(s.musicVolume);
    this.audio.setSfxVolume(s.sfxVolume);
    this.audio.setMuted(s.muted);
  }

  commitSettings() { this.applyAudioSettings(); }

  openDevMenu() { if (!this.tuning.open) this.tuning.toggle(); }

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
      this.onPhase(view);
    }
    if (meta && meta.rev !== this.lastMetaRev) {
      this.lastMetaRev = meta.rev;
    }
    if (meta) this.checkResult(meta);
    // A guest learns the field width from the host once the game has started.
    if (meta && s.role !== 'solo' && meta.fieldW !== this.scene.view.fieldW) this.applyView();
    // Solo campaign: the start of every wave is kept, so the level can be continued there (B1).
    if (meta && view.wave !== this.lastWave && (view.phase === 'banner' || view.phase === 'battle')) {
      this.lastWave = view.wave;
      this.savePending(meta);
    }
    this.syncPause(view, meta);
    this.syncConnection();
    if ((view.phase === 'banner' || view.phase === 'battle') && meta) this.onWave(view, meta);
  }

  /** Once per wave at its start: windows for new raiders; at the level start short tips the profile has not seen yet. */
  private onWave(view: ViewState, meta: Meta) {
    const key = `${meta.rules.runId}:${meta.wave.wave}`;
    if (this.bannerKey === key || meta.wave === undefined) return;
    const first = !this.bannerKey.startsWith(`${meta.rules.runId}:`);
    this.bannerKey = key;
    // The prelude introduces its Pothelms by hand, so level 1 needs no window for them.
    if (meta.rules.mode === 'tutorial') { for (const t of meta.wave.newTypes) this.profile.markEnemySeen(t); return; }
    const fresh = meta.wave.newTypes.filter((t) => this.profile.markEnemySeen(t));
    if (fresh.length > 0) this.popup.show(fresh);
    if (meta.devRun || !first) return;
    if (this.profile.markTipSeen('firstFight')) this.toast(FIRST_FIGHT_TIP, 'tip', 5500);
    for (const id of meta.loadout.slotWeapon) {
      const def = id ? weaponById(id) : undefined;
      if (def && this.profile.markTipSeen(`weapon:${def.id}`)) this.toast(weaponTip(def.name), 'tip', 5500);
    }
    // When the King explains this wave himself (a level hint), no tip on top.
    const level = meta.rules.level !== null ? levelOf(meta.rules.world, meta.rules.level) : undefined;
    const kingSpeaks = !!level?.hints.some((h) => h.wave === view.wave);
    for (const st of STATION_IDS) {
      if (meta.loadout.stations[st] && STATION_TIPS[st] && this.profile.markTipSeen(`station:${st}`) && !kingSpeaks) this.toast(STATION_TIPS[st], 'tip', 5500);
    }
  }

  private onPhase(view: ViewState) {
    switch (view.phase) {
      case 'banner':
      case 'battle':
        this.audio.startMusic('battle');
        break;
      case 'gameover':
      case 'runWon':
        this.popup.clear();
        this.audio.stopMusic();
        break;
    }
  }

  /** Solo campaign: keeps the start of this wave, so the level can be continued after the app was closed (B1). */
  private savePending(meta: Meta) {
    const s = this.session;
    if (!(s instanceof HostSession) || s.role !== 'solo') return;
    if (meta.rules.mode !== CAMPAIGN.id || meta.devRun || meta.result) return;
    const pending: PendingRun = { v: 2, rules: meta.rules, seed: s.sim.s.seed, start: s.sim.waveStartSave() };
    this.profile.setPendingRun(pending);
  }

  /** The interrupted level in the profile, if it still fits the level table. */
  pendingRun(): PendingRun | null {
    const p = this.profile.data.pendingRun as Partial<PendingRun> | null;
    if (!p || p.v !== 2 || !p.rules || !p.start || typeof p.seed !== 'number') return null;
    const level = levelOf(p.rules.world, p.rules.level ?? 0);
    if (p.rules.mode !== CAMPAIGN.id || !level || p.rules.lastWave !== level.waves.length) return null;
    if (typeof p.start.wave !== 'number' || p.start.wave < 1 || p.start.wave > level.waves.length) return null;
    return p as PendingRun;
  }

  /** The run is over: each device pays its own reward exactly once, then shows the result. */
  private checkResult(meta: Meta) {
    const r = meta.result;
    const s = this.session;
    if (!r || !s || r.runId === this.handledRun) return;
    this.handledRun = r.runId;
    const mode = modeOf(meta.rules.mode);
    this.reward = mode.reward(r, meta.rules, this.profile, s.role);
    this.result = r;
    this.resultRules = meta.rules;
    // The prelude has no result screen: level 1 follows at once.
    if (meta.rules.mode === TUTORIAL.id) { this.follow(mode.next(r, meta.rules, this.profile)); return; }
    this.show(r.won ? 'won' : 'gameover');
  }

  /** Goes where a mode says after a run. */
  private follow(step: NextStep) {
    const role = this.session?.role ?? 'solo';
    if (role === 'guest') return;
    if (step.to === 'level') {
      if (role === 'host') { this.coop.setPlan({ mode: CAMPAIGN.id, level: step.level }); this.coop.restartCoop(); return; }
      this.startSoloRun(CAMPAIGN, { world: step.world, level: step.level }, true);
      return;
    }
    if (role === 'host') { this.coop.returnToRoom(); return; }
    this.leaveToMenu();
  }

  /** Continue on the win screen. */
  afterRun() {
    if (!this.result || !this.resultRules) { this.leaveToMenu(); return; }
    // After the first win of level 1 the King leads into the shop for the first upgrade (D4).
    if (this.session?.role === 'solo' && this.result.won && shopAfterWin(this.profile, this.resultRules.world, this.resultRules.level)) {
      this.leaveToMenu('armoury');
      return;
    }
    this.follow(modeOf(this.resultRules.mode).next(this.result, this.resultRules, this.profile));
  }

  /** Back on a lost level: the campaign list alone, the room in co-op. */
  backAfterRun() {
    if (this.session?.role === 'host') { this.coop.returnToRoom(); return; }
    this.leaveToMenu(this.resultRules?.mode === CAMPAIGN.id ? 'campaign' : 'main');
  }

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
    if (s.role === 'host' && s.connection() === 'lost' && !this.lostToastShown && (this.screen === 'none' || this.screen === 'won' || this.screen === 'gameover')) {
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
  // Building and starting runs
  // ---------------------------------------------------------------------------

  /** Changed tuning or switches: such runs count for nothing. */
  private devValuesActive(): boolean {
    const t = this.settings.tuning;
    const tuningChanged = (Object.keys(TUNING_DEFAULT) as (keyof Tuning)[]).some((k) => t[k] !== TUNING_DEFAULT[k]);
    const flagsChanged = FLAG_DEFS.some((f) => this.settings.flags[f.id] !== f.value);
    return tuningChanged || flagsChanged;
  }

  private seedParam(): number | undefined {
    const fixed = this.params.get('seed');
    return fixed !== null && fixed !== '' && Number.isFinite(Number(fixed)) ? Number(fixed) : undefined;
  }

  /**
   * What the app tells a mode about a new run. Saved tuning and switches only go in when a
   * developer tool is in play; otherwise every run plays with the standard values.
   */
  private runEnv(choice: RunChoice, names: string[], handTiers: number[]): RunEnv {
    const env: RunEnv = { names, fieldW: fieldForAspect(innerWidth / innerHeight), handTiers, seed: this.seedParam() };
    const quick = (choice.quickStart ?? 0) > 0 || (choice.devWave ?? 0) > 0 || (choice.wave ?? 1) > 1;
    if (quick || this.devValuesActive()) {
      env.tuning = { ...this.settings.tuning };
      env.flags = { ...this.settings.flags };
      env.devRun = true;
    }
    return env;
  }

  private buildSetup(mode: GameMode, choice: RunChoice, names: string[], handTiers: number[]): RunSetup {
    return mode.buildRun(this.profile, choice, this.runEnv(choice, names, handTiers));
  }

  /** The host's run for what the co-op room plans. */
  coopSetup(plan: RoomPlan, names: string[], handTiers: number[]): RunSetup {
    return this.buildSetup(plan.mode === CAMPAIGN.id ? CAMPAIGN : ENDLESS, this.planChoice(plan), names, handTiers);
  }

  private planChoice(plan: RoomPlan): RunChoice {
    if (plan.mode === CAMPAIGN.id) return { world: plan.world, level: plan.level ?? 1 };
    return { world: plan.world, difficulty: plan.difficulty ?? this.settings.difficulty, ...this.endlessStart() };
  }

  /** The developer menu's endless start wave: a quick start at its own waves, any other wave as a free developer start. */
  private endlessStart(): Pick<RunChoice, 'quickStart' | 'devWave'> {
    if (this.startWave <= 1) return {};
    return quickStartFor(this.startWave) ? { quickStart: this.startWave } : { devWave: this.startWave };
  }

  startPlanSolo(plan: RoomPlan) {
    this.startSoloRun(plan.mode === CAMPAIGN.id ? CAMPAIGN : ENDLESS, this.planChoice(plan), true);
  }

  /**
   * Starts a run alone. A new player gets the tutorial first, unless this is a developer start,
   * a continued level, or the tutorial itself is what follows (`skipTutorial`).
   */
  private startSoloRun(mode: GameMode, choice: RunChoice, skipTutorial = false) {
    const dev = (choice.quickStart ?? 0) > 0 || (choice.devWave ?? 0) > 0 || (choice.wave ?? 1) > 1 || !!choice.resume;
    if (!skipTutorial && !dev && this.tutorialDue()) { this.startTutorial(); return; }
    this.coop.closeRoom();
    // "Try again" starts a continued level from its first wave.
    const again: RunChoice = choice.resume ? { world: choice.world, level: choice.resume.rules.level ?? 1 } : choice;
    this.lastPick = { mode: mode.id, choice: again };
    const setup = this.buildSetup(mode, choice, [this.playerName()], [this.profile.data.keep.handTier]);
    this.useSession(new HostSession(setup, false));
  }

  startTutorial() {
    this.coop.closeRoom();
    this.lastPick = null;
    const setup = TUTORIAL.buildRun(this.profile, { world: this.world }, {
      names: [this.playerName()], fieldW: fieldForAspect(innerWidth / innerHeight), handTiers: [this.profile.data.keep.handTier],
    });
    this.useSession(new HostSession(setup, false));
  }

  startCampaign(level: number) {
    if (!CAMPAIGN.canPlay(this.profile, this.world, level)) return;
    this.startSoloRun(CAMPAIGN, { world: this.world, level });
  }

  startEndless() {
    this.startSoloRun(ENDLESS, {
      world: this.world, difficulty: this.settings.difficulty, ...this.endlessStart(),
    });
  }

  continueLevel() {
    const p = this.pendingRun();
    if (!p) { this.show('main'); return; }
    this.startSoloRun(CAMPAIGN, { world: p.rules.world, resume: { rules: p.rules, start: p.start, seed: p.seed } }, true);
  }

  restartRun() {
    if (this.session?.role === 'host') { this.coop.restartCoop(); return; }
    const pick = this.lastPick;
    if (!pick) { this.leaveToMenu(); return; }
    this.startSoloRun(MODES[pick.mode] ?? ENDLESS, pick.choice, true);
  }

  playerName(): string { return this.profile.data.name.trim() || 'Player'; }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  private resetRunState() {
    this.lastPhase = '';
    this.lastWave = -1;
    this.lastMetaRev = -1;
    this.bannerKey = '';
    this.popup.clear();
  }

  useSession(s: Session) {
    this.session?.dispose();
    this.session = s;
    this.scene.resetForNewGame();
    this.scene.session = s;
    this.resetRunState();
    this.show('none');
    this.applyView();
  }

  releaseSession(alsoFromScene = false) {
    this.session = null;
    if (alsoFromScene) this.scene.session = null;
  }

  /** Leaves a finished co-op run but keeps the link to the other player open. */
  leaveRunForRoom() {
    this.session = null;
    this.scene.session = null;
    this.scene.resetForNewGame();
    this.resetRunState();
    this.audio.startMusic('menu');
  }

  onGuestRestart() {
    this.scene.resetForNewGame();
    this.resetRunState();
    this.show('none');
  }

  leaveToMenu(screen: ScreenId = 'main') {
    this.coop.hangUp(this.session?.role === 'host');
    this.session?.dispose();
    this.session = null;
    this.scene.session = null;
    this.scene.resetForNewGame();
    this.resetRunState();
    this.coop.reset();
    this.audio.startMusic('menu');
    this.show(screen);
  }

  // ---------------------------------------------------------------------------
  // Screens: one file each in screens/, shown by the ScreenManager.
  // ---------------------------------------------------------------------------

  show(screen: ScreenId, arg?: string) { this.screens.show(screen, arg); this.lobby.sync(); }

  /** A station in the lobby was tapped: the same as the menu button with that `data-a`. */
  lobbyAction(id: string) { mainScreen.onAction?.(id, this.ui, this); }

  query<T extends Element>(selector: string): T | null { return this.screens.query<T>(selector); }
}
