import Phaser from 'phaser';
import { RIGS } from '../art/characters';
import type { Anim, CharacterRig, RigPart } from '../art/types';
import { ENEMIES } from '../config/enemies';
import { WORLD } from '../config/world';
import type { ViewEnemy } from '../net/snapshot';
import { CHAR_SCALE } from '../config/world';
import { partKey, propKey, TEX_SCALE } from './textures';

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
  private fuse: Phaser.GameObjects.Image;
  id = -1;
  private seed = 0;
  private squash = 0;
  speed = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(private scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'fx:shadow').setDepth(15).setVisible(false);
    this.ice = scene.add.image(0, 0, propKey('iceBlock')).setOrigin(0.5, 1).setScale(1 / TEX_SCALE).setVisible(false);
    this.bubble = scene.add.image(0, 0, propKey('shieldBubble')).setScale(1 / TEX_SCALE).setVisible(false);
    this.star = scene.add.image(0, 0, propKey('star')).setScale(1 / TEX_SCALE).setVisible(false);
    this.fuse = scene.add.image(0, 0, propKey('spark')).setScale(1 / TEX_SCALE).setVisible(false);
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
  }

  hide() {
    this.id = -1;
    this.current?.root.setVisible(false);
    this.current = null;
    this.shadow.setVisible(false);
    this.ice.setVisible(false);
    this.bubble.setVisible(false);
    this.star.setVisible(false);
    this.fuse.setVisible(false);
  }

  /** Called when a soft landing happens. */
  bump() { this.squash = 1; }

  update(e: ViewEnemy, time: number, dt: number) {
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
    this.lastX = e.x;
    this.lastY = e.y;

    const def = ENEMIES[e.type];
    const ground = WORLD.groundY + e.lane;
    const h = (e.crow ? 40 : def.height) * 0.5;
    const rot = e.rot;
    // Rotate around the belly rather than the feet, otherwise a thrown figure looks pinned.
    const cx = e.x;
    const cy = e.y - h;
    const ox = cx - Math.sin(rot) * h;
    const oy = cy + Math.cos(rot) * h;

    const root = pup.root;
    root.setPosition(ox, oy);
    root.setRotation(rot);
    root.setDepth(20 + e.lane / 100 + (e.st === 'held' ? 5 : 0) + (e.st === 'air' ? 3 : 0));

    this.squash = Math.max(0, this.squash - dt * 5);
    const sq = this.squash * 0.35;
    root.setScale(CHAR_SCALE * (1 + sq), CHAR_SCALE * (1 - sq));

    pup.setPartVisible('keg', e.armed);
    pup.setPartVisible('balloon', e.st === 'float' || e.st === 'attack');
    root.setAlpha(e.hidden ? 0.1 + Math.abs(Math.sin(time * 0.01 + this.seed * 10)) * 0.1 : 1);

    this.applyPose(pup, e, time);

    // Shadow shrinks with height above the ground.
    const height = Math.max(0, ground - e.y);
    const k = Math.max(0.25, 1 - height / 520);
    this.shadow.setVisible(!e.hidden);
    this.shadow.setPosition(e.x, ground + 2);
    this.shadow.setScale((def.radius / 44) * k * CHAR_SCALE, k);
    this.shadow.setAlpha(0.4 + k * 0.5);

    const depth = root.depth + 0.01;
    this.ice.setVisible(e.frozen && e.st === 'frozen');
    if (this.ice.visible) this.ice.setPosition(e.x, e.y + 6).setDepth(depth);
    this.bubble.setVisible(e.shield);
    if (this.bubble.visible) {
      const s = 1 + Math.sin(time * 0.012) * 0.04;
      this.bubble.setPosition(e.x, e.y - def.height * 0.5).setScale(s / TEX_SCALE).setDepth(depth);
    }
    this.star.setVisible(e.st === 'stun');
    if (this.star.visible) {
      const a = time * 0.01;
      this.star.setPosition(e.x + Math.cos(a) * 24, e.y - def.height * CHAR_SCALE - 6 + Math.sin(a) * 6).setDepth(depth);
    }
    this.fuse.setVisible(e.fuse);
    if (this.fuse.visible) this.fuse.setPosition(e.x, e.y - 20).setScale((1 + Math.sin(time * 0.05)) / TEX_SCALE).setDepth(depth);
  }

  private applyPose(pup: Puppet, e: ViewEnemy, time: number) {
    const t = time * 0.001 + this.seed * 10;
    const def = ENEMIES[e.type];
    const stride = (def.speed / 96) * 8.5;
    const walk = Math.sin(t * stride);

    pup.pose((anim) => {
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
        case 'hooked':
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
