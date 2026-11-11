// Sets up co-op: opening a room as host, joining one as guest, and getting back in after a drop.
// It owns the lobby state the host and join screens show and talks to the App through `CoopRoomHost`.
import { GuestSession, HostSession, type Session } from '../../game/session';
import type { Settings } from '../../game/storage';
import { loopbackTransport } from '../../net/loopback';
import { peerTransport } from '../../net/peer';
import { PROTOCOL_VERSION, type NetMessage } from '../../net/protocol';
import { relayTransport } from '../../net/relay';
import { makeRoomCode, normalizeRoomCode, withLatency, type RoomHost, type Transport, type TransportKind } from '../../net/transport';
import type { ScreenId } from '../screens/screen';

declare const __GAME_VERSION__: string;
/** Both players must run the same build. A test can pretend to be an out-of-date client with ?fakever=x. */
export const BUILD = new URLSearchParams(location.search).get('fakever') ?? `${PROTOCOL_VERSION}-${__GAME_VERSION__}`;

type HostOptions = ConstructorParameters<typeof HostSession>[0];

/** What the co-op setup needs from the App. */
export interface CoopRoomHost {
  readonly settings: Settings;
  /** The page's query parameters (test switches such as ?net=loopback and ?lat=). */
  readonly params: URLSearchParams;
  readonly session: Session | null;
  readonly screen: ScreenId;
  show(screen: ScreenId, arg?: string): void;
  toast(text: string): void;
  playerName(): string;
  /** What a new game takes from the host's settings and screen. */
  gameOptions(): Omit<HostOptions, 'names' | 'coop'>;
  /** Makes this session the running game and disposes of the previous one. */
  useSession(session: Session): void;
  /** Lets go of the running session without disposing of it, so its link stays open. */
  releaseSession(alsoFromScene?: boolean): void;
  startSolo(): void;
  /** The host started a new run; the guest's screens and counters start over. */
  onGuestRestart(): void;
}

export class CoopRoom {
  /** The room code: the one made as host or the one last joined as guest. */
  code = '';
  /** One line about the state of the lobby, shown on the host and join screens. */
  status = '';
  error = false;
  /** Host side: the link to the guest, from the lobby on and through the game. */
  lobbyLink: Transport | null = null;

  private room: RoomHost | null = null;
  private joinLink: Transport | null = null;
  private guestName = '';
  private lastGuestName = '';
  /** Bumped whenever the lobby is left, so that slow connection attempts know they are stale. */
  private token = 0;
  private joining = false;

  constructor(private app: CoopRoomHost) {}

  clearStatus() { this.status = ''; }

  inviteLink(): string {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('join', this.code);
    const relay = this.app.settings.relayAddress.trim();
    if (relay) url.searchParams.set('relay', relay);
    return url.toString();
  }

  private transport(): TransportKind {
    if (this.app.params.get('net') === 'loopback') return loopbackTransport;
    const relay = this.app.settings.relayAddress.trim();
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
  }

  // Host side ------------------------------------------------------------------

  async openRoom() {
    const token = ++this.token;
    this.code = makeRoomCode();
    this.status = 'Opening room...';
    this.error = false;
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
    link.onMessage = (m) => {
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
      this.lobbyLink = link;
      if (s instanceof HostSession && s.role === 'host') {
        link.send({ k: 'welcome', names: s.sim.s.meta.names, inGame: true, difficulty: s.sim.s.meta.difficulty });
        s.attach(link);
        this.app.toast(`${this.guestName} is back`);
        return;
      }
      link.send({ k: 'welcome', names: [this.app.playerName(), this.guestName], inGame: false, difficulty: this.app.settings.difficulty });
      this.status = `${this.guestName} joined!`;
      this.error = false;
      link.onClose = () => {
        if (this.lobbyLink !== link) return;
        this.lobbyLink = null;
        this.guestName = '';
        this.status = 'Your friend left. Waiting...';
        this.redraw('host');
      };
      this.redraw('host');
    };
  }

  startCoopAsHost() {
    if (!this.lobbyLink) return;
    const session = new HostSession({ ...this.app.gameOptions(), names: [this.app.playerName(), this.guestName], coop: true });
    const link = this.lobbyLink;
    session.attach(link);
    link.send({ k: 'start' });
    // dispose() on the previous session would close the shared link; drop it first.
    this.app.releaseSession();
    this.app.useSession(session);
  }

  restartCoop() {
    const connected = this.app.session?.connection() === 'connected';
    if (!connected || !this.lobbyLink) { this.app.startSolo(); return; }
    // The link stays open across runs, so the old session must not close it.
    this.app.releaseSession();
    this.guestName = this.lastGuestName;
    this.startCoopAsHost();
  }

  // Guest side -----------------------------------------------------------------

  async joinRoom(rawCode: string) {
    const code = normalizeRoomCode(rawCode);
    if (!code || this.joining) return;
    this.joinLink?.close();
    this.joinLink = null;
    this.joining = true;
    const token = ++this.token;
    this.code = code;
    this.status = 'Connecting...';
    this.error = false;
    this.app.show('join', code);
    try {
      const link = this.shaped(await this.transport().join(code));
      if (token !== this.token) { link.close(); return; }
      this.joining = false;
      this.joinLink = link;
      link.onClose = () => { this.status = 'Connection closed.'; this.error = true; this.redraw('join', code); };
      link.onMessage = (m) => this.onHostMessage(m, link, code);
      link.send({ k: 'hello', ver: BUILD, name: this.app.playerName() });
    } catch (err) {
      this.joining = false;
      if (token !== this.token) return;
      this.status = (err as Error).message;
      this.error = true;
      this.redraw('join', code);
    }
  }

  private onHostMessage(m: NetMessage, link: Transport, code: string) {
    switch (m.k) {
      case 'welcome':
        if (m.inGame) { this.enterGuest(link); return; }
        this.status = `In the room with ${m.names[0]}. Waiting for the host to start.`;
        this.error = false;
        this.app.show('join', code);
        break;
      case 'reject':
        this.status = m.reason === 'full'
          ? 'This room already has two players.'
          : 'Your game version differs from the host. Please reload the page (Ctrl+F5) on both sides.';
        this.error = true;
        this.app.show('join', code);
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
    this.app.releaseSession();
    const s = new GuestSession(link);
    s.onRestart = () => this.app.onGuestRestart();
    this.app.useSession(s);
  }

  /** After a broken link the guest goes back through the join screen with the same code. */
  enterRejoin() {
    const code = this.code;
    this.app.releaseSession(true);
    this.app.show('join', code);
    void this.joinRoom(code);
  }
}
