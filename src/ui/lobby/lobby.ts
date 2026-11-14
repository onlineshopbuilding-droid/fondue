// The lobby controller: decides when the hall inside the keep is on screen, runs the camera move
// between battlefield and hall, lets the King talk, opens the storybook and offers test hooks
// (`window.__fondue.lobby.spots()`, `.tap(id)`). The hall itself is drawn by LobbyScene.
import type Phaser from 'phaser';
import type { AudioEngine } from '../../audio/audio';
import { WEAPONS } from '../../config/weapons';
// The story texts of the one world there is; a second world would bring its own.
import { KING_LOBBY_LINES, STORYBOOK } from '../../config/worlds/fondue/story';
import type { Session } from '../../game/session';
import { SLOT_COUNT } from '../../config/slots';
import { ENDLESS, unlockLevelOf } from '../../modes';
import type { Profile } from '../../profile';
import { diveOf, fadeOf, stepLobby } from '../../render/lobby/dive';
import { linesFor, pagesFor, pickLine, STATIONS, type StationId } from '../../render/lobby/layout';
import { LobbyScene, type LobbySpot, type LobbyState } from '../../render/lobby/lobbyScene';
import type { GameScene } from '../../render/scene';
import type { PendingRun } from '../screens/context';
import { ENDLESS_LOCKED, pendingWave } from '../screens/main';
import { htmlMenuWanted, OVER_LOBBY } from './mode';
import { StorybookWindow } from './storybook';

/** What the lobby needs from the app. */
export interface LobbyHost {
  readonly profile: Profile;
  readonly world: string;
  readonly session: Session | null;
  readonly screen: string;
  readonly audio: AudioEngine;
  pendingRun(): PendingRun | null;
  /** Runs a main menu action (`data-a` of the old menu buttons). */
  lobbyAction(id: string): void;
}

/** Seconds before the King's first remark, and the pause between two remarks. */
const FIRST_LINE = 3;
const LINE_GAP = [13, 19] as const;

export class Lobby {
  /** False with `?menu=html`: the plain HTML menu is used and the hall never shows. */
  readonly enabled = !htmlMenuWanted();
  private scene: LobbyScene | null = null;
  private gameScene: GameScene | null = null;
  private readonly book: StorybookWindow;
  /** 0 on the battlefield, 1 in the hall; the camera move runs between. */
  private k = 0;
  private inLobby = false;
  private first = true;
  private lineIn = FIRST_LINE;
  private lastLine = '';

  constructor(private host: LobbyHost, root: HTMLElement) {
    this.book = new StorybookWindow(root, () => this.click());
    // A tap anywhere during the camera move skips it.
    window.addEventListener('pointerdown', () => { if (this.moving) this.skip(); }, true);
  }

  /** Adds the hall scene above the battlefield. Called once at boot, after the game scene. */
  attach(game: Phaser.Game, gameScene: GameScene) {
    if (!this.enabled) return;
    this.gameScene = gameScene;
    const scene = new LobbyScene();
    scene.hooks = {
      state: () => this.state(),
      canTap: () => this.inLobby && this.k >= 1 && this.host.screen === 'main' && !this.book.isOpen,
      tap: (id) => this.tap(id),
      tapKing: () => this.say(),
      step: (dt) => this.step(dt),
    };
    scene.fade = 0;
    this.scene = scene;
    game.scene.add('lobby', scene, true);
  }

  /** Follows the app: called after every screen change. */
  sync() {
    const want = this.enabled && !this.host.session && OVER_LOBBY.has(this.host.screen);
    if (want !== this.inLobby) this.lineIn = FIRST_LINE;
    this.inLobby = want;
    // The first screen of the page appears at once; later changes move the camera.
    if (this.first && this.scene) { this.first = false; this.k = want ? 1 : 0; this.apply(); }
    if (!want || this.host.screen !== 'main') this.book.close();
  }

  private state(): LobbyState {
    const p = this.host.profile;
    const pending = this.host.pendingRun();
    return {
      levelDone: p.highestLevelDone(this.host.world),
      weapons: WEAPONS.filter((w) => w.enabled && p.hasWeapon(w.id)).map((w) => w.id),
      pending: pending ? { level: pending.rules.level ?? 1, wave: pendingWave(pending) } : null,
      endless: ENDLESS.isAvailable(p, this.host.world),
      endlessHint: `Opens after level ${unlockLevelOf(this.host.world, 'slot', SLOT_COUNT - 1) ?? '?'}`,
    };
  }

  private step(dt: number) {
    const before = this.k;
    this.k = stepLobby(this.k, this.inLobby, dt);
    if (this.k !== before) this.apply();
    if (this.k >= 1 && this.host.screen === 'main' && !this.book.isOpen) {
      this.lineIn -= dt;
      if (this.lineIn <= 0 && !this.scene?.speaking) this.say();
    }
  }

  private apply() {
    if (this.scene) this.scene.fade = fadeOf(this.k);
    if (this.gameScene) {
      this.gameScene.lobbyDive = diveOf(this.k);
      // Hidden behind the hall, the battlefield need not be drawn at all.
      this.gameScene.cameras.main?.setVisible(this.k < 1);
    }
  }

  private click() {
    this.host.audio.resume();
    this.host.audio.play('uiClick');
  }

  /** Uses a station, exactly like the old menu button with the same `data-a`. */
  tap(id: StationId | string) {
    if (!STATIONS.some((s) => s.id === id)) return;
    this.click();
    if (id === 'storybook') { this.openBook(); return; }
    if (id === 'play' && !ENDLESS.isAvailable(this.host.profile, this.host.world)) { this.say(ENDLESS_LOCKED); return; }
    this.host.lobbyAction(id);
  }

  private openBook() {
    const done = this.host.profile.highestLevelDone(this.host.world);
    const pages = pagesFor(STORYBOOK, done);
    this.book.open(pages, STORYBOOK.length - pages.length);
  }

  /** The King says one of the remarks that fit the campaign so far (or `line`). */
  say(line?: string) {
    const done = this.host.profile.highestLevelDone(this.host.world);
    const text = line ?? pickLine(linesFor(KING_LOBBY_LINES, done).map((l) => l.text), this.lastLine);
    this.lastLine = text;
    this.scene?.say(text);
    this.lineIn = LINE_GAP[0] + Math.random() * (LINE_GAP[1] - LINE_GAP[0]);
  }

  /** Ends the camera move at once. */
  skip() {
    this.k = this.inLobby ? 1 : 0;
    this.apply();
  }

  // --- For tests ---------------------------------------------------------------------------

  /** True while the hall is (becoming) the screen. */
  get visible(): boolean { return this.inLobby; }
  /** True while the camera moves between battlefield and hall. */
  get moving(): boolean { return this.k > 0 && this.k < 1; }
  /** Where the move stands: 0 battlefield, 1 hall. */
  get progress(): number { return this.k; }
  get storybookOpen(): boolean { return this.book.isOpen; }
  get storybookPage(): string { return this.book.pageId; }
  /** The King's remark on show, or ''. */
  get kingLine(): string { return this.scene?.bubbleLine ?? ''; }
  /** Every station on show: id, label, centre and radius in CSS pixels. */
  spots(): LobbySpot[] { return this.scene && this.k >= 1 ? this.scene.spots() : []; }
  closeStorybook() { this.book.close(); }
}
