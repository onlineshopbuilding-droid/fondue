// Sets up co-op: opening a room as host, joining one as guest, getting back in after a drop, and returning to the room between runs.
// It owns the room state the host and join screens show (who is in, what will be played) and talks to the App through `CoopRoomHost`.
import type { Difficulty } from '../../config/waves';
import { GuestSession, HostSession, type Session } from '../../game/session';
import { CAMPAIGN, ENDLESS } from '../../modes';
import { loopbackTransport } from '../../net/loopback';
import { peerTransport } from '../../net/peer';
import { PROTOCOL_VERSION, type NetMessage, type RoomPlan } from '../../net/protocol';
import { relayTransport } from '../../net/relay';
import { makeRoomCode, normalizeRoomCode, withLatency, type RoomHost, type Transport, type TransportKind } from '../../net/transport';
import type { Profile } from '../../profile';
import type { RunSetup } from '../../sim/rules';
import type { ScreenId } from '../screens/screen';

declare const __GAME_VERSION__: string;
/** Both players must run the same build. A test can pretend to be an out-of-date client with ?fakever=x. */
export const BUILD = new URLSearchParams(location.search).get('fakever') ?? `${PROTOCOL_VERSION}-${__GAME_VERSION__}`;

/** Seats in a room. The network code knows one guest today; the room list is built for more. */
export const ROOM_SEATS = 2;

/** What the co-op setup needs from the App. */
export interface CoopRoomHost {
  readonly profile: Profile;
  readonly world: string;
  /** The page's query parameters (test switches such as ?net=loopback and ?lat=). */
  readonly params: URLSearchParams;
  readonly session: Session | null;
  readonly screen: ScreenId;
  show(screen: ScreenId, arg?: string): void;
  toast(text: string): void;
  playerName(): string;
  /** Builds the host's run for what the room plans to play. */
  coopSetup(plan: RoomPlan, names: string[], handTiers: number[]): RunSetup;
  /** Makes this session the running game and disposes of the previous one. */
  useSession(session: Session): void;
  /** Lets go of the running session without disposing of it, so its link stays open. */
  releaseSession(alsoFromScene?: boolean): void;
  /** Plays the room's plan alone, because the friend is gone. */
  startPlanSolo(plan: RoomPlan): void;
  /** The host started a new run; the guest's screens and counters start over. */
  onGuestRestart(): void;
  /** Leaves the finished run without closing the link, on the way back into the room. */
  leaveRunForRoom(): void;
}

export class CoopRoom {
  /** The room code: the one made as host or the one last joined as guest. */
  code = '';
  /** One line about the state of the room, shown on the host and join screens. */
  status = '';
  error = false;
  /** Host side: the link to the guest, from the room on and through the game. */
  lobbyLink: Transport | null = null;
  /** What the host plans to play. The guest learns it with `welcome` and `lobby`. */
  plan: RoomPlan;
  /** Guest side: the names in the room as the host sent them, and whether the guest is inside. */
  roomNames: string[] = [];
  joined = false;

  private room: RoomHost | null = null;
  private joinLink: Transport | null = null;
  private guestName = '';
  private lastGuestName = '';
  /** The guest's hand tier as it last told the host. */
  private guestHand = 1;
  /** Bumped whenever the room is left, so that slow connection attempts know they are stale. */
  private token = 0;
  private joining = false;

  constructor(private app: CoopRoomHost) {
    this.plan = { mode: 'endless', world: app.world, level: null, difficulty: 'medium' };
  }

  clearStatus() { this.status = ''; }

  /** Who is in the room, one entry per seat; null is a free seat. The own name comes first. */
  members(): (string | null)[] {
    const me = this.app.playerName();
    let others: string[];
    if (this.isHosting()) others = this.guestName ? [this.guestName] : [];
    else others = this.joined ? this.roomNames.filter((_, i) => i !== 1) : [];
    const list: (string | null)[] = [me, ...others];
    while (list.length < ROOM_SEATS) list.push(null);
    return list;
  }

  /** True while this device has a room open as host. */
  isHosting(): boolean { return this.room !== null || this.app.screen === 'host'; }

  inviteLink(): string {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('join', this.code);
    const relay = this.app.profile.data.settings.relayAddress.trim();
    if (relay) url.searchParams.set('relay', relay);
    return url.toString();
  }

  private transport(): TransportKind {
    if (this.app.params.get('net') === 'loopback') return loopbackTransport;
    const relay = this.app.profile.data.settings.relayAddress.trim();
    return relay ? relayTransport(relay) : peerTransport;
  }

  private shaped(link: Transport): Transport {
    const params = this.app.params;
    const lat = Number(params.get('lat') ?? 0);
    if (lat <= 0) return link;
    return withLatency(link, {
      latencyMs: lat,
      jitterMs: Number(params.get('jit') ?? 0),
      loss: Number(params.get('loss') ?? 0),
    });
  }

  private redraw(screen: 'host' | 'join', arg?: string) {
    if (this.app.screen === screen) this.app.show(screen, arg);
  }

  // Plan ---------------------------------------------------------------------------

  /** A sensible plan for a freshly opened room: endless if it is open, else the host's next level. */
  private defaultPlan(difficulty: Difficulty): RoomPlan {
    const p = this.app.profile;
    const world = this.app.world;
    if (ENDLESS.isAvailable(p, world)) return { mode: 'endless', world, level: null, difficulty };
    return { mode: 'campaign', world, level: CAMPAIGN.nextLevel(p, world), difficulty: null };
  }

  /** Host: changes what will be played and tells the guest. */
  setPlan(change: Partial<RoomPlan>) {
    const p = this.app.profile;
    const world = this.app.world;
    const next: RoomPlan = { ...this.plan, ...change, world };
    if (next.mode === 'campaign') {
      const level = next.level ?? CAMPAIGN.nextLevel(p, world);
      next.level = CAMPAIGN.canPlay(p, world, level) ? level : CAMPAIGN.nextLevel(p, world);
      next.difficulty = null;
    } else {
      next.mode = 'endless';
      next.level = null;
      next.difficulty = next.difficulty ?? p.data.settings.difficulty;
    }
    this.plan = next;
    this.sendLobby();
    this.redraw('host');
  }

  private sendLobby() {
    if (!this.lobbyLink || this.app.session) return;
    this.lobbyLink.send({ k: 'lobby', names: [this.app.playerName(), this.guestName], plan: this.plan });
  }

  // Leaving ---------------------------------------------------------------------

  /** A solo game needs no room; the link is only forgotten because a session may still own it. */
  closeRoom() {
    this.room?.close();
    this.room = null;
    this.lobbyLink = null;
  }

  /** First half of leaving to the menu: cancels pending attempts and closes both links. */
  hangUp(tellGuest: boolean) {
    this.token++;
    this.joining = false;
    if (tellGuest) this.lobbyLink?.send({ k: 'leftGame' });
    this.lobbyLink?.close();
    this.joinLink?.close();
  }

  /** Second half, once the session is gone: closes the room and forgets everyone. */
  reset() {
    this.closeRoom();
    this.joinLink = null;
    this.guestName = '';
    this.roomNames = [];
    this.joined = false;
  }

  // Host side ------------------------------------------------------------------

  async openRoom() {
    const token = ++this.token;
    this.code = makeRoomCode();
    this.status = 'Opening room...';
    this.error = false;
    this.plan = this.defaultPlan(this.app.profile.data.settings.difficulty);
    this.app.show('host');
    try {
      const room = await this.transport().host(
        this.code,
        (raw) => this.onGuestLink(this.shaped(raw)),
        (msg) => { this.status = msg; this.error = true; this.redraw('host'); },
      );
      if (token !== this.token) { room.close(); return; }
      this.room = room;
      this.status = 'Waiting for your friend...';
    } catch (err) {
      this.status = (err as Error).message;
      this.error = true;
    }
    this.redraw('host');
  }

  /** Drops the guest and the room and opens a new one, e.g. after the relay setting changed. */
  reopenRoom() {
    this.lobbyLink?.close();
    this.lobbyLink = null;
    this.guestName = '';
    this.room?.close();
    this.room = null;
    void this.openRoom();
  }

  private onGuestLink(link: Transport) {
    link.onMessage = (m) => this.onGuestMessage(link, m);
  }

  /** Messages from a guest while no run is going (and the hello of a guest coming back mid-run). */
  private onGuestMessage(link: Transport, m: NetMessage) {
    if (m.k === 'hand') { if (link === this.lobbyLink) this.guestHand = m.handTier; return; }
    if (m.k !== 'hello') return;
    if (m.ver !== BUILD) {
      link.send({ k: 'reject', reason: 'version', hostVer: BUILD });
      return;
    }
    const name = m.name || 'Guest';
    const s = this.app.session;
    const occupied = s instanceof HostSession ? s.connection() === 'connected' : this.lobbyLink !== null;
    // The same name again is a reload whose old link has not timed out yet.
    if (occupied && name !== this.guestName) {
      link.send({ k: 'reject', reason: 'full', hostVer: BUILD });
      return;
    }
    if (!(s instanceof HostSession) && this.lobbyLink && this.lobbyLink !== link) {
      const old = this.lobbyLink;
      old.onClose = () => {};
      old.close();
    }
    this.guestName = name;
    this.lastGuestName = this.guestName;
    this.guestHand = m.handTier;
    this.lobbyLink = link;
    if (s instanceof HostSession && s.role === 'host') {
      link.send({ k: 'welcome', names: s.sim.s.meta.names, inGame: true, plan: this.plan });
      this.attachToSession(s, link);
      this.app.toast(`${this.guestName} is back`);
      return;
    }
    link.send({ k: 'welcome', names: [this.app.playerName(), this.guestName], inGame: false, plan: this.plan });
    this.watchLobbyLink(link);
    this.status = `${this.guestName} joined!`;
    this.error = false;
    this.redraw('host');
  }

  private watchLobbyLink(link: Transport) {
    link.onMessage = (m) => this.onGuestMessage(link, m);
    link.onClose = () => {
      if (this.lobbyLink !== link) return;
      this.lobbyLink = null;
      this.guestName = '';
      this.status = 'Your friend left. Waiting...';
      this.redraw('host');
    };
  }

  /** Hands the link to the running session, but keeps listening for the guest's hand tier. */
  private attachToSession(session: HostSession, link: Transport) {
    session.attach(link);
    const inner = link.onMessage;
    link.onMessage = (m) => {
      if (m.k !== 'hand') { inner(m); return; }
      this.guestHand = m.handTier;
      // Endless hands grow with gold during the run; only a campaign hand comes from the profile.
      if (!session.sim.rules.handBuyable) session.sim.setHandTier(1, m.handTier);
    };
  }

  startCoopAsHost() {
    if (!this.lobbyLink) return;
    const names = [this.app.playerName(), this.guestName];
    const setup = this.app.coopSetup(this.plan, names, [this.app.profile.data.handTier, this.guestHand]);
    const session = new HostSession(setup, true);
    const link = this.lobbyLink;
    this.attachToSession(session, link);
    link.send({ k: 'start' });
    // dispose() on the previous session would close the shared link; drop it first.
    this.app.releaseSession();
    this.app.useSession(session);
  }

  restartCoop() {
    const connected = this.app.session?.connection() === 'connected';
    if (!connected || !this.lobbyLink) { this.app.startPlanSolo(this.plan); return; }
    // The link stays open across runs, so the old session must not close it.
    this.app.releaseSession();
    this.guestName = this.lastGuestName;
    this.startCoopAsHost();
  }

  /** Host, after a run: back into the room with the friend, who is sent there too. */
  returnToRoom() {
    const connected = this.app.session?.connection() === 'connected';
    const link = this.lobbyLink;
    this.app.leaveRunForRoom();
    if (link && connected) {
      this.guestName = this.lastGuestName;
      this.watchLobbyLink(link);
      this.status = `${this.guestName} is in the room.`;
    } else {
      link?.close();
      this.lobbyLink = null;
      this.guestName = '';
      this.status = 'Waiting for your friend...';
    }
    this.error = false;
    // Progress may have moved on: a won level makes the next one the default.
    if (this.plan.mode === 'campaign') this.plan = { ...this.plan, level: CAMPAIGN.nextLevel(this.app.profile, this.app.world) };
    this.app.show('host');
    this.sendLobby();
  }

  // Guest side -----------------------------------------------------------------

  async joinRoom(rawCode: string) {
    const code = normalizeRoomCode(rawCode);
    if (!code || this.joining) return;
    this.joinLink?.close();
    this.joinLink = null;
    this.joining = true;
    this.joined = false;
    const token = ++this.token;
    this.code = code;
    this.status = 'Connecting...';
    this.error = false;
    this.app.show('join', code);
    try {
      const link = this.shaped(await this.transport().join(code));
      if (token !== this.token) { link.close(); return; }
      this.joining = false;
      this.listenAsGuest(link, code);
      link.send({ k: 'hello', ver: BUILD, name: this.app.playerName(), handTier: this.app.profile.data.handTier });
    } catch (err) {
      this.joining = false;
      if (token !== this.token) return;
      this.status = (err as Error).message;
      this.error = true;
      this.redraw('join', code);
    }
  }

  private listenAsGuest(link: Transport, code: string) {
    this.joinLink = link;
    link.onClose = () => { this.joined = false; this.status = 'Connection closed.'; this.error = true; this.redraw('join', code); };
    link.onMessage = (m) => this.onHostMessage(m, link, code);
  }

  /** The guest's hand may have grown since the last run; the host needs it for the next one. */
  private sendHand(link: Transport) {
    link.send({ k: 'hand', handTier: this.app.profile.data.handTier });
  }

  private planText(): string {
    const p = this.plan;
    if (p.mode === 'campaign') return `Campaign: level ${p.level ?? 1}`;
    return `Endless${p.difficulty ? ` (${p.difficulty[0].toUpperCase()}${p.difficulty.slice(1)})` : ''}`;
  }

  private onHostMessage(m: NetMessage, link: Transport, code: string) {
    switch (m.k) {
      case 'welcome':
        this.roomNames = m.names;
        this.plan = m.plan;
        this.joined = true;
        if (m.inGame) { this.enterGuest(link); return; }
        this.status = `In the room with ${m.names[0]}. Next: ${this.planText()}. Waiting for the host to start.`;
        this.error = false;
        this.app.show('join', code);
        break;
      case 'lobby':
        this.roomNames = m.names;
        this.plan = m.plan;
        this.joined = true;
        this.sendHand(link);
        this.status = `In the room with ${m.names[0]}. Next: ${this.planText()}. Waiting for the host to start.`;
        this.error = false;
        this.app.show('join', code);
        break;
      case 'reject':
        this.joined = false;
        this.status = m.reason === 'full'
          ? 'This room already has two players.'
          : 'Your game version differs from the host. Please reload the page (Ctrl+F5) on both sides.';
        this.error = true;
        this.app.show('join', code);
        link.close();
        break;
      case 'start':
        this.sendHand(link);
        this.enterGuest(link);
        break;
      default:
        break;
    }
  }

  private enterGuest(link: Transport) {
    this.app.releaseSession();
    const s = new GuestSession(link);
    s.onRestart = () => this.app.onGuestRestart();
    const inner = link.onMessage;
    link.onMessage = (m) => {
      if (m.k === 'lobby') { this.backToRoomAsGuest(link, m); return; }
      if (m.k === 'start') this.sendHand(link);
      inner(m);
    };
    this.app.useSession(s);
  }

  /** The host went back to the room after a run: the guest follows, on the same link. */
  private backToRoomAsGuest(link: Transport, m: NetMessage) {
    this.app.leaveRunForRoom();
    this.listenAsGuest(link, this.code);
    this.onHostMessage(m, link, this.code);
  }

  /** After a broken link the guest goes back through the join screen with the same code. */
  enterRejoin() {
    const code = this.code;
    this.app.releaseSession(true);
    this.app.show('join', code);
    void this.joinRoom(code);
  }
}
