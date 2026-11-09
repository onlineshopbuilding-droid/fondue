import Phaser from 'phaser';
import { PROPS } from '../art/props';
import { AudioEngine } from '../audio/audio';
import { ENEMIES } from '../config/enemies';
import { GAME_NAME } from '../config/game';
import { SHOP_ITEMS, SHOP_TABS, type ShopTab } from '../config/shop';
import { DIFFICULTIES, type Difficulty } from '../config/waves';
import { WORLD } from '../config/world';
import { GuestSession, HostSession, type Session } from '../game/session';
import { addScore, loadScores, loadSettings, saveSettings, type Settings } from '../game/storage';
import { loopbackTransport } from '../net/loopback';
import { peerTransport } from '../net/peer';
import { PROTOCOL_VERSION, type NetMessage } from '../net/protocol';
import { relayTransport } from '../net/relay';
import type { ViewState } from '../net/snapshot';
import { makeRoomCode, normalizeRoomCode, withLatency, type RoomHost, type Transport, type TransportKind } from '../net/transport';
import { GameScene } from '../render/scene';
import { buildTextures } from '../render/textures';
import type { Meta } from '../sim/types';
import { CREDITS_HTML, HELP_SLIDES, LOADING_TIPS } from './content';
import { TuningPanel } from './tuningPanel';

declare const __GAME_VERSION__: string;
// A test can pretend to be an out-of-date client with ?fakever=x.
const BUILD = new URLSearchParams(location.search).get('fakever') ?? `${PROTOCOL_VERSION}-${__GAME_VERSION__}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const artUri = (name: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PROPS[name].svg)}`;

type Screen =
  | 'none' | 'main' | 'play' | 'host' | 'join' | 'options' | 'help' | 'scores' | 'credits'
  | 'results' | 'shop' | 'gameover' | 'pause' | 'lostHost' | 'lostGuest';

/** Owns the DOM screens and the session lifecycle. */
export class App {
  game!: Phaser.Game;
  scene!: GameScene;
  session: Session | null = null;
  readonly audio = new AudioEngine();
  private settings: Settings = loadSettings();
  private ui: HTMLElement;
  private overlay: HTMLDivElement | null = null;
  private toasts: HTMLDivElement;
  private badge: HTMLDivElement;
  private debugEl: HTMLDivElement | null = null;
  private screen: Screen = 'none';
  private tuning: TuningPanel;
  private params = new URLSearchParams(location.search);

  // Lobby state
  private room: RoomHost | null = null;
  private lobbyLink: Transport | null = null;
  private guestName = '';
  private code = '';
  private joinLink: Transport | null = null;
  private lobbyStatus = '';
  private lobbyError = false;

  private shopTab: ShopTab = 'gates';
  private helpIndex = 0;
  private lastPhase = '';
  private lastMetaRev = -1;
  private scoreSaved = false;
  private tipShownDay = 0;
  private loadingTip = LOADING_TIPS[0];
  private lastGuestName = '';

  constructor() {
    this.ui = document.getElementById('ui')!;
    this.toasts = document.createElement('div');
    this.toasts.className = 'toast-area';
    this.ui.appendChild(this.toasts);
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
    });
    this.applyAudioSettings();
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('pointerdown', () => this.audio.resume());
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
      isInputBlocked: () => this.overlay !== null,
      onBuyNotice: (t) => { if (this.session?.role !== 'solo') this.toast(t); },
    };
    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: 'app',
      width: WORLD.width,
      height: WORLD.height,
      backgroundColor: '#1c2a33',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false },
      fps: { smoothStep: false },
      banner: false,
      scene: [],
    });
    await new Promise<void>((r) => this.game.events.once(Phaser.Core.Events.READY, () => r()));
    await buildTextures(this.game);
    this.game.scene.add('game', this.scene, true);
    (window as unknown as Record<string, unknown>).__fondue = this;

    if (this.params.get('relay')) this.settings.relayAddress = this.params.get('relay')!;
    const invite = this.params.get('join');
    if (invite) {
      this.show('join');
      const input = this.overlay?.querySelector<HTMLInputElement>('#code');
      if (input) input.value = normalizeRoomCode(invite);
    } else {
      this.show('main');
    }
  }

  private applyAudioSettings() {
    this.audio.setMusicVolume(this.settings.musicVolume);
    this.audio.setSfxVolume(this.settings.sfxVolume);
    this.audio.setMuted(this.settings.muted);
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'F1' || e.key === '^') { e.preventDefault(); this.tuning.toggle(); }
    if (e.key === 'F3') { e.preventDefault(); this.toggleDebug(); }
  }

  private toggleDebug() {
    if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; return; }
    this.debugEl = document.createElement('div');
    this.debugEl.id = 'debug';
    this.ui.appendChild(this.debugEl);
  }

  private toast(text: string, kind = '', ms = 2600) {
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
    this.syncPause(view, meta);
    this.syncConnection();
    if (view.phase === 'banner' && meta && this.tipShownDay !== view.day) {
      this.tipShownDay = view.day;
      for (const t of meta.newTipTypes) this.toast(ENEMIES[t].tip, 'tip', 7000);
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
        if (meta && !this.scoreSaved) {
          this.scoreSaved = true;
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

  private syncPause(view: ViewState, meta: Meta | null) {
    const isLoss = meta?.pausedBy === 'Connection lost';
    if (view.paused && !isLoss && this.screen === 'none') this.show('pause');
    if (!view.paused && this.screen === 'pause') this.show('none');
  }

  private syncConnection() {
    const s = this.session;
    if (!s) return;
    if (s.role === 'host' && s.connection() === 'lost' && this.screen === 'none') this.show('lostHost');
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

  private togglePause() {
    const s = this.session;
    if (!s) return;
    const v = s.view();
    if (!v) return;
    s.send({ k: 'pause', paused: !v.paused });
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  private transport(): TransportKind {
    if (this.params.get('net') === 'loopback') return loopbackTransport;
    const relay = this.settings.relayAddress.trim();
    return relay ? relayTransport(relay) : peerTransport;
  }

  private shaped(link: Transport): Transport {
    const lat = Number(this.params.get('lat') ?? 0);
    if (lat <= 0) return link;
    return withLatency(link, {
      latencyMs: lat,
      jitterMs: Number(this.params.get('jit') ?? 0),
      loss: Number(this.params.get('loss') ?? 0),
    });
  }

  private useSession(s: Session) {
    this.session?.dispose();
    this.session = s;
    this.scene.resetForNewGame();
    this.scene.session = s;
    this.lastPhase = '';
    this.lastMetaRev = -1;
    this.scoreSaved = false;
    this.tipShownDay = 0;
    this.show('none');
  }

  private seed(): number {
    const fixed = this.params.get('seed');
    return fixed ? Number(fixed) : Math.floor(Math.random() * 2 ** 31);
  }

  startSolo() {
    this.useSession(new HostSession({
      seed: this.seed(), difficulty: this.settings.difficulty, names: [this.playerName()], tuning: this.settings.tuning, coop: false,
    }));
  }

  private playerName(): string { return this.settings.name.trim() || 'Player'; }

  private leaveToMenu() {
    if (this.session?.role === 'host') this.lobbyLink?.send({ k: 'leftGame' });
    this.lobbyLink?.close();
    this.joinLink?.close();
    this.session?.dispose();
    this.session = null;
    this.scene.session = null;
    this.scene.resetForNewGame();
    this.room?.close();
    this.room = null;
    this.lobbyLink = null;
    this.joinLink = null;
    this.guestName = '';
    this.audio.startMusic('menu');
    this.show('main');
  }

  // Host side ------------------------------------------------------------------

  async openRoom() {
    this.code = makeRoomCode();
    this.lobbyStatus = 'Opening room...';
    this.lobbyError = false;
    this.show('host');
    try {
      this.room = await this.transport().host(
        this.code,
        (raw) => this.onGuestLink(this.shaped(raw)),
        (msg) => { this.lobbyStatus = msg; this.lobbyError = true; if (this.screen === 'host') this.show('host'); },
      );
      this.lobbyStatus = 'Waiting for your friend...';
    } catch (err) {
      this.lobbyStatus = (err as Error).message;
      this.lobbyError = true;
    }
    if (this.screen === 'host') this.show('host');
  }

  private onGuestLink(link: Transport) {
    link.onMessage = (m) => {
      if (m.k !== 'hello') return;
      if (m.ver !== BUILD) {
        link.send({ k: 'reject', reason: 'version', hostVer: BUILD });
        return;
      }
      this.guestName = m.name || 'Guest';
      this.lastGuestName = this.guestName;
      this.lobbyLink = link;
      const s = this.session;
      if (s instanceof HostSession && s.role === 'host') {
        link.send({ k: 'welcome', names: s.sim.s.meta.names, inGame: true, difficulty: s.sim.s.meta.difficulty });
        s.attach(link);
        this.toast(`${this.guestName} is back`);
        return;
      }
      link.send({ k: 'welcome', names: [this.playerName(), this.guestName], inGame: false, difficulty: this.settings.difficulty });
      this.lobbyStatus = `${this.guestName} joined!`;
      this.lobbyError = false;
      link.onClose = () => {
        this.lobbyLink = null;
        this.guestName = '';
        this.lobbyStatus = 'Your friend left. Waiting...';
        if (this.screen === 'host') this.show('host');
      };
      if (this.screen === 'host') this.show('host');
    };
  }

  startCoopAsHost() {
    if (!this.lobbyLink) return;
    const session = new HostSession({
      seed: this.seed(), difficulty: this.settings.difficulty, names: [this.playerName(), this.guestName], tuning: this.settings.tuning, coop: true,
    });
    const link = this.lobbyLink;
    this.lobbyLink = link;
    session.attach(link);
    link.send({ k: 'start' });
    // dispose() on the previous session would close the shared link; drop it first.
    this.session = null;
    this.useSession(session);
  }

  private restartCoop() {
    const connected = this.session?.connection() === 'connected';
    if (!connected || !this.lobbyLink) { this.startSolo(); return; }
    // The link stays open across runs, so the old session must not close it.
    this.session = null;
    this.guestName = this.lastGuestName;
    this.startCoopAsHost();
  }

  // Guest side -----------------------------------------------------------------

  async joinRoom(rawCode: string) {
    const code = normalizeRoomCode(rawCode);
    if (!code) return;
    this.code = code;
    this.lobbyStatus = 'Connecting...';
    this.lobbyError = false;
    this.show('join', code);
    try {
      const link = this.shaped(await this.transport().join(code));
      this.joinLink = link;
      link.onClose = () => { this.lobbyStatus = 'Connection closed.'; this.lobbyError = true; if (this.screen === 'join') this.show('join', code); };
      link.onMessage = (m) => this.onHostMessage(m, link, code);
      link.send({ k: 'hello', ver: BUILD, name: this.playerName() });
    } catch (err) {
      this.lobbyStatus = (err as Error).message;
      this.lobbyError = true;
      if (this.screen === 'join') this.show('join', code);
    }
  }

  private onHostMessage(m: NetMessage, link: Transport, code: string) {
    switch (m.k) {
      case 'welcome':
        if (m.inGame) { this.enterGuest(link); return; }
        this.lobbyStatus = `In the room with ${m.names[0]}. Waiting for the host to start.`;
        this.lobbyError = false;
        this.show('join', code);
        break;
      case 'reject':
        this.lobbyStatus = 'Your game version differs from the host. Please reload the page (Ctrl+F5) on both sides.';
        this.lobbyError = true;
        this.show('join', code);
        link.close();
        break;
      case 'start':
        this.enterGuest(link);
        break;
      default:
        break;
    }
  }

  private enterGuest(link: Transport) {
    this.session = null;
    const s = new GuestSession(link);
    s.onRestart = () => {
      this.scene.resetForNewGame();
      this.lastPhase = '';
      this.lastMetaRev = -1;
      this.scoreSaved = false;
      this.tipShownDay = 0;
      this.show('none');
    };
    this.useSession(s);
  }

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------

  show(screen: Screen, arg?: string) {
    this.screen = screen;
    if (screen === 'none') {
      this.overlay?.remove();
      this.overlay = null;
      return;
    }
    const html = this.render(screen, arg);
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'overlay';
      this.overlay.addEventListener('click', (e) => this.onClick(e));
      this.overlay.addEventListener('input', (e) => this.onInput(e));
      this.ui.insertBefore(this.overlay, this.toasts);
    }
    const focused = document.activeElement as HTMLInputElement | null;
    const focusId = focused?.id;
    const caret = focused?.selectionStart ?? null;
    this.overlay.innerHTML = html;
    if (focusId) {
      const el = this.overlay.querySelector<HTMLInputElement>(`#${focusId}`);
      if (el) { el.focus(); if (caret !== null) el.setSelectionRange(caret, caret); }
    }
  }

  private render(screen: Screen, arg?: string): string {
    const back = '<button class="secondary" data-a="main">Back</button>';
    switch (screen) {
      case 'main':
        return `<div class="panel narrow"><div class="logo">${esc(GAME_NAME)}</div>
          <div class="tagline">Grab them. Fling them. Hold the gate.</div>
          <div class="stack">
            <button data-a="play">Play</button>
            <button class="secondary" data-a="scores">Scores</button>
            <button class="secondary" data-a="options">Options</button>
            <button class="secondary" data-a="help">Help</button>
            <button class="secondary" data-a="credits">Credits</button>
          </div>
          <div class="version">build ${esc(__GAME_VERSION__)}</div></div>`;
      case 'play':
        return `<div class="panel narrow"><h2>Play</h2>
          <div class="stack">
            <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(this.settings.name)}" placeholder="Player"></label>
            <button data-a="solo">Single Player</button>
            <button class="alt" data-a="openRoom">Host Co-op</button>
            <button class="alt" data-a="gotoJoin">Join Co-op</button>
            ${back}
          </div></div>`;
      case 'host':
        return this.renderHost();
      case 'join':
        return this.renderJoin(arg ?? this.code);
      case 'options':
        return this.renderOptions(back);
      case 'help':
        return this.renderHelp(back);
      case 'scores':
        return this.renderScores(back);
      case 'credits':
        return `<div class="panel"><h2>Credits</h2>${CREDITS_HTML}<div class="row">${back}</div></div>`;
      case 'results':
        return this.renderResults();
      case 'shop':
        return this.renderShop();
      case 'gameover':
        return this.renderGameOver();
      case 'pause':
        return `<div class="panel narrow"><h2>Paused</h2>
          <p style="text-align:center">Paused by ${esc(this.session?.meta()?.pausedBy ?? '')}</p>
          <div class="stack"><button data-a="resume">Resume</button>
          <button class="secondary" data-a="options">Options</button>
          <button class="alt" data-a="quit">Quit to menu</button></div></div>`;
      case 'lostHost':
        return `<div class="panel narrow"><h2>Connection lost</h2>
          <p style="text-align:center">Your friend dropped out. They can rejoin with code <b>${esc(this.code)}</b>.</p>
          <div class="stack"><button data-a="aloneOn">Continue alone</button><button class="alt" data-a="quit">Quit to menu</button></div></div>`;
      case 'lostGuest':
        return `<div class="panel narrow"><h2>Connection lost</h2>
          <p style="text-align:center">The link to the host broke.</p>
          <div class="stack"><button data-a="rejoin">Rejoin</button><button class="alt" data-a="quit">Quit to menu</button></div></div>`;
      default:
        return '';
    }
  }

  private inviteLink(): string {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('join', this.code);
    if (this.settings.relayAddress.trim()) url.searchParams.set('relay', this.settings.relayAddress.trim());
    return url.toString();
  }

  private renderHost(): string {
    const ready = this.lobbyLink !== null;
    const opts = (Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => `<option value="${d}" ${d === this.settings.difficulty ? 'selected' : ''}>${DIFFICULTIES[d].label}</option>`).join('');
    return `<div class="panel narrow"><h2>Host Co-op</h2>
      <p style="text-align:center;margin:0">Room code</p>
      <div class="code" id="roomCode">${esc(this.code)}</div>
      <div class="status ${this.lobbyError ? 'err' : ''}" id="status">${esc(this.lobbyStatus)}</div>
      <div class="stack">
        <button class="secondary" data-a="copyInvite">Copy invite link</button>
        <label class="field">Difficulty<select id="difficulty">${opts}</select></label>
        <label class="field">Relay server (optional, only if the direct link fails)
          <input id="relay" type="text" value="${esc(this.settings.relayAddress)}" placeholder="https://....trycloudflare.com"></label>
        <button data-a="reopen" class="small secondary">Re-open room with this relay setting</button>
        <button id="startCoop" data-a="startCoop" ${ready ? '' : 'disabled'}>Start</button>
        <button class="secondary" data-a="quit">Back</button>
      </div></div>`;
  }

  private renderJoin(code: string): string {
    return `<div class="panel narrow"><h2>Join Co-op</h2>
      <div class="stack">
        <label class="field">Your name<input id="name" type="text" maxlength="14" value="${esc(this.settings.name)}" placeholder="Player"></label>
        <label class="field">Room code<input id="code" type="text" maxlength="8" value="${esc(code)}" style="text-transform:uppercase"></label>
        <label class="field">Relay server (optional)
          <input id="relay" type="text" value="${esc(this.settings.relayAddress)}" placeholder="https://....trycloudflare.com"></label>
        <div class="status ${this.lobbyError ? 'err' : ''}" id="status">${esc(this.lobbyStatus)}</div>
        <button data-a="doJoin">Join</button>
        <button class="secondary" data-a="quit">Back</button>
      </div></div>`;
  }

  private renderOptions(back: string): string {
    const s = this.settings;
    const opts = (Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => `<option value="${d}" ${d === s.difficulty ? 'selected' : ''}>${DIFFICULTIES[d].label}</option>`).join('');
    const returnBtn = this.session ? '<button class="secondary" data-a="backPause">Back</button>' : back;
    return `<div class="panel narrow"><h2>Options</h2><div class="stack">
      <label class="field">Difficulty (applies to new games)<select id="difficulty">${opts}</select></label>
      <label class="field">Music volume<input id="music" type="range" min="0" max="1" step="0.05" value="${s.musicVolume}"></label>
      <label class="field">Effects volume<input id="sfx" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}"></label>
      <label class="field" style="flex-direction:row;align-items:center"><input id="mute" type="checkbox" ${s.muted ? 'checked' : ''}> Mute everything</label>
      ${returnBtn}</div></div>`;
  }

  private renderHelp(back: string): string {
    const slide = HELP_SLIDES[this.helpIndex];
    return `<div class="panel"><h2>${esc(slide.title)}</h2>
      <div class="slide"><img src="${artUri(slide.icon)}" alt=""><p>${esc(slide.text)}</p></div>
      <div class="dots">${this.helpIndex + 1} / ${HELP_SLIDES.length}</div>
      <div class="row" style="margin-top:12px">
        <button class="secondary" data-a="helpPrev">Previous</button><button data-a="helpNext">Next</button>${back}
      </div></div>`;
  }

  private renderScores(back: string): string {
    const list = loadScores();
    const rows = list.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.names)}</td><td>${e.coop ? 'Co-op' : 'Solo'}</td><td>${DIFFICULTIES[e.difficulty].label}</td><td>${e.day}</td><td>${e.score}</td></tr>`).join('');
    return `<div class="panel"><h2>Scores</h2>
      <table class="scores"><thead><tr><th>#</th><th>Name</th><th>Mode</th><th>Level</th><th>Day</th><th>Score</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No runs yet. Go hold that gate.</td></tr>'}</tbody></table>
      <div class="row" style="margin-top:14px">${back}</div></div>`;
  }

  private readyLine(meta: Meta): string {
    if (meta.names.length < 2) return '';
    const me = this.session?.me ?? 0;
    const other = 1 - me;
    const mine = meta.ready[me];
    return `<div class="status" id="readyStatus">${mine ? `Waiting for ${esc(meta.names[other])}...` : meta.ready[other] ? `${esc(meta.names[other])} is ready!` : ''}</div>`;
  }

  private nextButtons(meta: Meta): string {
    const me = this.session?.me ?? 0;
    const label = meta.names.length > 1 ? (meta.ready[me] ? 'Not ready' : 'Ready') : 'Next Day';
    const force = this.session?.role === 'host' && meta.ready[0] ? '<button class="alt" data-a="force">Start anyway</button>' : '';
    return `<button id="ready" data-a="ready">${label}</button>${force}`;
  }

  private renderResults(): string {
    const meta = this.session?.meta();
    if (!meta?.lastDay) return '<div class="panel narrow"><h2>Results</h2></div>';
    const d = meta.lastDay;
    return `<div class="panel narrow"><h2>Day ${d.day} results</h2>
      <div class="stats">
        <span>Raiders defeated</span><b id="kills">${d.kills}</b>
        <span>Gold earned</span><b>${d.goldEarned}</b>
        <span>Offerings</span><b>${d.offeringsEarned}</b>
        <span>Gate left</span><b>${d.gatePct}%</b>
        <span>Score</span><b>${d.score}</b>
      </div>
      <p style="text-align:center;font-style:italic">${esc(this.loadingTip)}</p>
      ${this.readyLine(meta)}
      <div class="row" style="margin-top:10px"><button class="secondary" id="toShop" data-a="toShop">Market</button>${this.nextButtons(meta)}</div></div>`;
  }

  private renderShop(): string {
    const s = this.session;
    const meta = s?.meta();
    const v = s?.view();
    if (!s || !meta || !v) return '';
    const tabs = SHOP_TABS.map((t) => `<div class="tab ${t.id === this.shopTab ? 'on' : ''}" data-tab="${t.id}">${t.label}</div>`).join('');
    const coin = `<img src="${artUri('coin')}" alt="gold">`;
    const off = `<img src="${artUri('offering')}" alt="offerings">`;
    const items = SHOP_ITEMS.filter((i) => i.tab === this.shopTab).map((i) => {
      const owned = meta.owned.includes(i.id);
      const locked = !!i.requires && !meta.owned.includes(i.requires);
      const afford = v.gold >= i.gold && v.offerings >= i.offerings;
      const isEquipped = i.tab === 'horns' ? meta.hornEquipped === i.id : owned;
      let action = '';
      if (owned) {
        action = i.tab === 'horns' && !isEquipped
          ? `<button class="small secondary" data-equip="${i.id}">Equip</button>`
          : '<span class="tag">Equipped</span>';
      } else if (locked) {
        action = '<span class="tag">Locked</span>';
      } else {
        action = `<button class="small" data-buy="${i.id}" ${afford ? '' : 'disabled'}>Buy</button>`;
      }
      const price = i.gold === 0 && i.offerings === 0 ? '' : `<span class="price">${coin}${i.gold}${i.offerings > 0 ? `${off}${i.offerings}` : ''}</span>`;
      return `<div class="item ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}" data-item="${i.id}">
        <div class="name">${esc(i.name)}</div><div class="desc">${esc(i.desc)}</div>
        <div class="foot">${price}${action}</div></div>`;
    }).join('');
    return `<div class="panel wide"><h2>The Market</h2>
      <div class="purse"><span>${coin}<span id="gold">${v.gold}</span></span><span>${off}<span id="offerings">${v.offerings}</span></span></div>
      <div class="tabs">${tabs}</div><div class="items">${items}</div>
      ${this.readyLine(meta)}
      <div class="row" style="margin-top:14px"><button class="secondary" data-a="toResults">Results</button>${this.nextButtons(meta)}</div></div>`;
  }

  private renderGameOver(): string {
    const meta = this.session?.meta();
    const v = this.session?.view();
    if (!meta || !v) return '';
    const restart = this.session?.role === 'guest' ? '<p style="text-align:center">The host can start a new run.</p>' : '<button data-a="restart" id="restart">Play again</button>';
    return `<div class="panel narrow"><h2>The gate has fallen</h2>
      <div class="stats">
        <span>Days survived</span><b>${Math.max(0, v.day - 1)}</b>
        <span>Raiders defeated</span><b>${meta.totalKills}</b>
        <span>Final score</span><b id="finalScore">${meta.totalScore}</b>
      </div>
      <div class="stack">${restart}<button class="secondary" data-a="scores2">Scores</button><button class="alt" data-a="quit">Quit to menu</button></div></div>`;
  }

  private onInput(e: Event) {
    const t = e.target as HTMLInputElement;
    const s = this.settings;
    switch (t.id) {
      case 'name': s.name = t.value; break;
      case 'difficulty': s.difficulty = t.value as Difficulty; break;
      case 'music': s.musicVolume = Number(t.value); break;
      case 'sfx': s.sfxVolume = Number(t.value); break;
      case 'mute': s.muted = t.checked; break;
      case 'relay': s.relayAddress = t.value; break;
      default: return;
    }
    saveSettings(s);
    this.applyAudioSettings();
  }

  private onClick(e: Event) {
    const el = e.target as HTMLElement;
    const tab = el.closest<HTMLElement>('[data-tab]');
    if (tab) { this.audio.play('uiClick'); this.shopTab = tab.dataset.tab as ShopTab; this.show('shop'); return; }
    const btn = el.closest<HTMLButtonElement>('button');
    if (!btn || btn.disabled) return;
    this.audio.resume();
    this.audio.play('uiClick');
    if (btn.dataset.buy) { this.session?.send({ k: 'buy', item: btn.dataset.buy }); return; }
    if (btn.dataset.equip) { this.session?.send({ k: 'equip', item: btn.dataset.equip }); return; }
    switch (btn.dataset.a) {
      case 'main': this.helpIndex = 0; this.show('main'); break;
      case 'play': this.show('play'); break;
      case 'options': this.show('options'); break;
      case 'help': this.show('help'); break;
      case 'scores': this.show('scores'); break;
      case 'scores2': this.show('scores'); break;
      case 'credits': this.show('credits'); break;
      case 'solo': this.startSolo(); break;
      case 'openRoom': void this.openRoom(); break;
      case 'gotoJoin': this.lobbyStatus = ''; this.show('join', ''); break;
      case 'doJoin': void this.joinRoom(this.overlay?.querySelector<HTMLInputElement>('#code')?.value ?? ''); break;
      case 'copyInvite':
        void navigator.clipboard?.writeText(this.inviteLink());
        this.toast('Invite link copied');
        break;
      case 'reopen':
        this.room?.close();
        this.room = null;
        void this.openRoom();
        break;
      case 'startCoop': this.startCoopAsHost(); break;
      case 'helpPrev': this.helpIndex = (this.helpIndex + HELP_SLIDES.length - 1) % HELP_SLIDES.length; this.show('help'); break;
      case 'helpNext': this.helpIndex = (this.helpIndex + 1) % HELP_SLIDES.length; this.show('help'); break;
      case 'toShop': this.show('shop'); break;
      case 'toResults': this.show('results'); break;
      case 'ready': this.clickReady(); break;
      case 'force': this.session?.send({ k: 'forceStart' }); break;
      case 'restart': this.session?.role === 'host' ? this.restartCoop() : this.startSolo(); break;
      case 'resume': this.togglePause(); break;
      case 'backPause': this.show(this.session?.view()?.paused ? 'pause' : 'none'); break;
      case 'aloneOn': (this.session as HostSession).continueAlone(); this.show('none'); break;
      case 'rejoin': this.enterRejoin(); break;
      case 'quit': this.leaveToMenu(); break;
    }
  }

  private clickReady() {
    const s = this.session;
    const meta = s?.meta();
    if (!s || !meta) return;
    s.send({ k: 'ready', ready: !meta.ready[s.me] });
  }

  private enterRejoin() {
    const code = this.code;
    this.session = null;
    this.scene.session = null;
    this.show('join', code);
    void this.joinRoom(code);
  }
}
