import Phaser from 'phaser';
import { RIGS } from '../art/characters';
import type { Anim, CharacterRig, RigPart } from '../art/types';
import { BEHAVIOUR, ENEMIES } from '../config/enemies';
import { WORLD } from '../config/field';
import type { ViewEnemy } from '../net/snapshot';
import { CHAR_SCALE } from '../config/field';
import { partKey, propKey, TEX_SCALE } from './textures';

/** A raider melting in the pot behind the road is drawn this much smaller, like the pot itself. */
const POT_FIGURE_SCALE = 0.72;
/** Largest swing, in radians, of a raider hanging on the eagle hook. */
const HOOK_SWING = 0.12;
/** How much higher a hooked balloonist hangs than the simulation's collar point. */
const HOOK_BALLOON_LIFT = 34;
/** Health bar of a boss day's big raider: wider, and red so that it reads as a boss. */
const BIG_BAR_WIDTH = 96;
const BIG_BAR_COLOR = 0xd1495b;

interface PartSprite {
  img: Phaser.GameObjects.Image;
  part: RigPart;
  name: string;
}

/** A figure made of separate parts, animated procedurally from its state. */
class Puppet {
  readonly root: Phaser.GameObjects.Container;
  readonly parts: PartSprite[] = [];

  constructor(scene: Phaser.Scene, readonly rigName: string, rig: CharacterRig) {
    this.root = scene.add.container(0, 0);
    for (const part of rig.parts) {
      const img = scene.add.image(part.x, part.y, partKey(rigName, part.name));
      img.setOrigin(part.art.px / part.art.w, part.art.py / part.art.h);
      img.setScale(1 / TEX_SCALE);
      this.root.add(img);
      this.parts.push({ img, part, name: part.name });
    }
  }

  setPartVisible(name: string, visible: boolean) {
    for (const p of this.parts) if (p.name === name) p.img.setVisible(visible);
  }

  setPartScale(name: string, sx: number, sy: number) {
    for (const p of this.parts) if (p.name === name) p.img.setScale(sx / TEX_SCALE, sy / TEX_SCALE);
  }

  pose(fn: (anim: Anim, part: RigPart) => { rot: number; dy: number }) {
    for (const { img, part } of this.parts) {
      const q = fn(part.anim, part);
      img.rotation = q.rot;
      img.y = part.y + q.dy;
    }
  }
}

/** Visual for one enemy. Reused through a pool, so per-enemy state is reset in `bind`. */
export class EnemyView {
  private puppets = new Map<string, Puppet>();
  private current: Puppet | null = null;
  private shadow: Phaser.GameObjects.Image;
  private ice: Phaser.GameObjects.Image;
  private bubble: Phaser.GameObjects.Image;
  private star: Phaser.GameObjects.Image;
  private barBack: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  id = -1;
  private seed = 0;
  private squash = 0;
  speed = 0;
  private lastX = 0;
  private lastY = 0;
  private cookFromX = NaN;
  private cookFromY = NaN;
  private cookAge = 0;
  /** 0 to 1: how far a shake has got towards loosening this raider's keg. */
  private kegShake = 0;

  constructor(private scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'fx:shadow').setDepth(15).setVisible(false);
    this.ice = scene.add.image(0, 0, propKey('iceBlock')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setVisible(false);
    this.bubble = scene.add.image(0, 0, propKey('shieldBubble')).setScale(1 / TEX_SCALE).setVisible(false);
    this.star = scene.add.image(0, 0, propKey('star')).setScale(1 / TEX_SCALE).setVisible(false);
    this.barBack = scene.add.rectangle(0, 0, 64, 9, 0x2b2118).setVisible(false).setOrigin(0, 0.5);
    this.bar = scene.add.rectangle(0, 0, 60, 5, 0xe9b44c).setVisible(false).setOrigin(0, 0.5);
  }

  private puppet(rigName: string): Puppet {
    let p = this.puppets.get(rigName);
    if (!p) {
      p = new Puppet(this.scene, rigName, RIGS[rigName as keyof typeof RIGS]);
      this.puppets.set(rigName, p);
    }
    return p;
  }

  bind(id: number) {
    this.id = id;
    this.seed = (id * 2654435761) % 1000 / 1000;
    this.squash = 0;
    this.speed = 0;
    this.lastX = NaN;
    this.cookFromX = NaN;
    this.cookAge = 0;
    this.kegShake = 0;
  }

  /** Feedback while the player shakes this Keg Hauler: the keg wobbles harder with each reversal. */
  setKegShake(progress: number) { this.kegShake = progress; }

  hide() {
    this.id = -1;
    this.current?.root.setVisible(false);
    this.current = null;
    this.shadow.setVisible(false);
    this.ice.setVisible(false);
    this.bubble.setVisible(false);
    this.star.setVisible(false);
    this.barBack.setVisible(false);
    this.bar.setVisible(false);
  }

  /** Called when a soft landing happens. */
  bump() { this.squash = 1; }

  /** potProgress is how far the melt has got, from 0 to 1. */
  update(e: ViewEnemy, time: number, dt: number, potProgress = 0) {
    const rigName = e.crow ? 'crow' : e.type;
    const pup = this.puppet(rigName);
    if (this.current !== pup) {
      this.current?.root.setVisible(false);
      this.current = pup;
      pup.root.setVisible(true);
    }

    if (!Number.isNaN(this.lastX) && dt > 0) {
      this.speed = Math.hypot(e.x - this.lastX, e.y - this.lastY) / dt;
    }
    const cooking = e.st === 'cooking';
    let drawX = e.x;
    let drawY = e.y;
    if (cooking) {
      if (Number.isNaN(this.cookFromX)) {
        this.cookFromX = Number.isNaN(this.lastX) ? e.x : this.lastX;
        this.cookFromY = Number.isNaN(this.lastX) ? e.y : this.lastY;
        this.cookAge = 0;
      }
      this.cookAge += dt;
      // The pull into the pot is quick, but it is seen.
      const k = Math.min(1, this.cookAge / 0.14);
      drawX = this.cookFromX + (e.x - this.cookFromX) * k;
      drawY = this.cookFromY + (e.y - this.cookFromY) * k;
    }
    this.lastX = drawX;
    this.lastY = drawY;
    if (e.st !== 'cooking') this.cookFromX = NaN;

    const def = ENEMIES[e.type];
    const ground = WORLD.groundY + e.lane;
    // Raiders of a boss day are drawn bigger; their grip area in the simulation grows with them.
    const big = e.big ? BEHAVIOUR.big.scale : 1;
    const h = (e.crow ? 40 : def.height) * 0.5 * big;
    const rot = e.rot;
    // Rotate around the belly rather than the feet, otherwise a thrown figure looks pinned.
    const cx = drawX;
    const cy = drawY - h;
    const ox = cx - Math.sin(rot) * h;
    const oy = cy + Math.cos(rot) * h;

    const root = pup.root;
    // A held keg rattles harder the further the shake has got.
    const rattle = e.st === 'held' && e.armed ? this.kegShake : 0;
    root.setPosition(ox + (rattle > 0 ? Math.sin(time * 0.09) * rattle * 4 : 0), oy);
    root.setRotation(rot + (rattle > 0 ? Math.sin(time * 0.07) * rattle * 0.12 : 0));
    if (e.st === 'hooked') {
      // It swings from the hook: the pivot is the top of the figure, where the hook holds it.
      const a = Math.sin(time * 0.006 + this.seed * 6) * HOOK_SWING;
      // A balloonist is caught by its balloon, so it hangs higher, the balloon in the hook's bend.
      const top = drawY - 2 * h - (e.type === 'balloonist' && !e.crow ? HOOK_BALLOON_LIFT : 0);
      root.setPosition(drawX - Math.sin(a) * 2 * h, top + Math.cos(a) * 2 * h).setRotation(a);
    }
    // A raider melting in the cauldron sits between the pot's back and its front, behind the road.
    root.setDepth(cooking ? 8.6 : 20 + e.lane / 100 + (e.st === 'held' ? 5 : 0) + (e.st === 'air' ? 3 : 0));

    this.squash = Math.max(0, this.squash - dt * 5);
    const sq = this.squash * 0.35;
    const size = CHAR_SCALE * big;
    root.setScale(size * (1 + sq), size * (1 - sq));
    if (cooking) {
      // It sinks and melts away while cheese takes its place; the pot behind the road is drawn smaller.
      const sink = Math.min(1, potProgress * 1.5);
      const k = POT_FIGURE_SCALE * (1 - sink * 0.75);
      root.setScale(CHAR_SCALE * k, CHAR_SCALE * k * (1 - sink * 0.2));
      root.y += sink * 34 * POT_FIGURE_SCALE;
    }

    pup.setPartVisible('keg', e.armed);
    // On the hook the balloon stays: it is snagged and sags, wobbling as the air goes out of it.
    pup.setPartVisible('balloon', e.st === 'float' || e.st === 'hooked');
    if (e.st === 'hooked') pup.setPartScale('balloon', 0.9 + Math.sin(time * 0.02) * 0.04, 0.82 + Math.sin(time * 0.017) * 0.05);
    else pup.setPartScale('balloon', 1, 1);
    root.setAlpha(e.hidden ? 0.1 + Math.abs(Math.sin(time * 0.01 + this.seed * 10)) * 0.1 : cooking ? Math.max(0, 1 - potProgress * 1.4) : 1);

    this.applyPose(pup, e, time, rattle);

    // Shadow shrinks with height above the ground.
    const height = Math.max(0, ground - e.y);
    const k = Math.max(0.25, 1 - height / 520);
    this.shadow.setVisible(!e.hidden && !cooking && e.st !== 'hooked');
    this.shadow.setPosition(e.x, ground + 2);
    this.shadow.setScale((def.radius / 44) * k * CHAR_SCALE * big, k * Math.sqrt(big));
    this.shadow.setAlpha(0.4 + k * 0.5);

    const depth = root.depth + 0.01;
    this.ice.setVisible(e.frozen && e.st === 'frozen');
    if (this.ice.visible) this.ice.setPosition(e.x, e.y + 6).setDepth(depth);
    this.bubble.setVisible(e.shield);
    if (this.bubble.visible) {
      const s = 1 + Math.sin(time * 0.012) * 0.04;
      this.bubble.setPosition(e.x, e.y - def.height * 0.5 * big).setScale((s * big) / TEX_SCALE).setDepth(depth).setAlpha(0.6);
    }
    this.star.setVisible(e.st === 'stun');
    if (this.star.visible) {
      const a = time * 0.01;
      this.star.setPosition(e.x + Math.cos(a) * 24 * big, e.y - def.height * CHAR_SCALE * big - 6 + Math.sin(a) * 6).setDepth(depth);
    }
    // Tough and big raiders show how close they are to breaking; a big one always does.
    const showBar = !cooking && e.st !== 'hooked' && (e.big || ((e.type === 'siegeCart' || e.type === 'yeti') && e.hpFrac < 0.999));
    this.barBack.setVisible(showBar);
    this.bar.setVisible(showBar);
    if (showBar) {
      const w = e.big ? BIG_BAR_WIDTH : 60;
      const top = e.y - def.height * (e.big ? CHAR_SCALE * big : 1) - 12;
      this.barBack.setPosition(e.x - w / 2 - 2, top).setSize(w + 4, 9).setDepth(depth);
      this.bar.setPosition(e.x - w / 2, top).setSize(w * Math.max(0, e.hpFrac), 5).setDepth(depth + 0.01);
      this.bar.setFillStyle(e.big ? BIG_BAR_COLOR : 0xe9b44c);
    }
  }

  private applyPose(pup: Puppet, e: ViewEnemy, time: number, rattle = 0) {
    const t = time * 0.001 + this.seed * 10;
    const def = ENEMIES[e.type];
    const stride = (def.speed / 96) * 8.5;
    const walk = Math.sin(t * stride);

    pup.pose((anim, part) => {
      switch (e.st) {
        case 'walk':
        case 'flee':
          switch (anim) {
            case 'legFront': return { rot: walk * 0.55, dy: 0 };
            case 'legBack': return { rot: -walk * 0.55, dy: 0 };
            case 'armFront': return { rot: -walk * 0.4, dy: 0 };
            case 'armBack': return { rot: walk * 0.4, dy: 0 };
            case 'body': return { rot: Math.sin(t * stride * 2) * 0.03, dy: Math.abs(walk) * -2.4 };
            case 'head': return { rot: Math.sin(t * stride) * 0.05, dy: Math.abs(walk) * -2.4 };
            case 'spin': return { rot: -t * 6, dy: 0 };
            default: return { rot: 0, dy: Math.abs(walk) * -1.2 };
          }
        case 'attack': {
          const hit = Math.sin(t * (6.2 / Math.max(0.6, def.strikeEvery)));
          switch (anim) {
            case 'armFront': return { rot: 0.6 + hit * 1.1, dy: 0 };
            case 'armBack': return { rot: -0.3 + hit * 0.2, dy: 0 };
            case 'body': return { rot: hit * 0.1, dy: 0 };
            case 'head': return { rot: hit * 0.12, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        }
        case 'held': {
          const flail = Math.sin(t * 26);
          const flail2 = Math.sin(t * 31 + 1);
          if (rattle > 0 && part.name === 'keg') return { rot: Math.sin(t * 46) * rattle * 0.35, dy: Math.sin(t * 52) * rattle * 3 };
          switch (anim) {
            case 'legFront': return { rot: flail * 0.85, dy: 0 };
            case 'legBack': return { rot: -flail2 * 0.85, dy: 0 };
            case 'armFront': return { rot: 1.5 + flail2 * 0.9, dy: 0 };
            case 'armBack': return { rot: -1.5 + flail * 0.9, dy: 0 };
            case 'head': return { rot: Math.sin(t * 13) * 0.22, dy: 0 };
            case 'body': return { rot: 0, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        }
        case 'air': {
          switch (anim) {
            case 'legFront': return { rot: 0.7, dy: 0 };
            case 'legBack': return { rot: -0.7, dy: 0 };
            case 'armFront': return { rot: 2.2 + Math.sin(t * 40) * 0.3, dy: 0 };
            case 'armBack': return { rot: -2.2 + Math.sin(t * 37) * 0.3, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        }
        case 'hop':
          switch (anim) {
            case 'legFront': return { rot: 0.5, dy: 0 };
            case 'legBack': return { rot: -0.5, dy: 0 };
            case 'armFront': return { rot: 1.1, dy: 0 };
            case 'armBack': return { rot: -1.1, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        case 'float': {
          const flap = Math.sin(t * 16);
          switch (anim) {
            case 'armFront': return { rot: e.crow ? flap * 0.9 : 0.1 + Math.sin(t * 2) * 0.1, dy: 0 };
            case 'armBack': return { rot: e.crow ? -flap * 0.9 : 0, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        }
        case 'stun':
          switch (anim) {
            case 'head': return { rot: Math.sin(t * 9) * 0.35, dy: 0 };
            case 'armFront':
            case 'armBack': return { rot: Math.sin(t * 5) * 0.2, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        case 'cooking':
        case 'hooked':
          // A crow on the hook beats its wings; a raider kicks with arms raised.
          if (e.crow && (anim === 'armFront' || anim === 'armBack')) {
            const flap = Math.sin(t * 22);
            return { rot: anim === 'armFront' ? flap * 0.9 : -flap * 0.9, dy: 0 };
          }
          switch (anim) {
            case 'legFront': return { rot: Math.sin(t * 18) * 0.7, dy: 0 };
            case 'legBack': return { rot: -Math.sin(t * 21) * 0.7, dy: 0 };
            case 'armFront': return { rot: 2.6, dy: 0 };
            case 'armBack': return { rot: -2.6, dy: 0 };
            default: return { rot: 0, dy: 0 };
          }
        default:
          return { rot: 0, dy: 0 };
      }
    });
  }
}
