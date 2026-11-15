import Phaser from 'phaser';
import { HERO_SPRITE, heroPoseFor } from '../art/heroes';
import { SPRITE_ANIM, spriteFrameName, type SpriteId } from '../art/sprites';
import { PLAYER_PHYSICS } from '../config/physics';
import type { Boss } from '../sim/World';
import type { Enemy } from '../sim/enemies';
import type { Rect } from '../sim/geom';
import type { TiledMap } from '../sim/level';
import type { Player } from '../sim/Player';
import type { World } from '../sim/World';
import { FONT_KEY } from '../ui/font';
import { heroFrameName, HEROES_TEXTURE } from './heroSprites';
import { SPRITES_TEXTURE } from './spriteAtlas';

export const TILESET_KEY = 'tiles-placeholder';
const TILEMAP_KEY_PREFIX = 'map-';
const LABEL_SIZE = 8;

const DEPTH = {
  mechanism: 2,
  pickup: 2,
  item: 3,
  enemy: 4,
  hero: 5,
  carried: 10,
  boss: 6,
  projectile: 7,
  water: 8,
  overlay: 100,
} as const;

/** Вода в раковине: полупрозрачная, со светлой кромкой. */
const WATER = { color: 0x3cbcfc, alpha: 0.65, surface: 0xa4e4fc, surfaceH: 2 } as const;

/** Мигание раз в N кадров. */
function blink(timer: number): boolean {
  return Math.floor(timer / PLAYER_PHYSICS.invulnerableBlinkFrames) % 2 === 0;
}

/** Двухкадровая анимация по счётчику кадров. */
function alt(frame: number, per: number, a: string, b: string): string {
  return Math.floor(frame / per) % 2 === 0 ? a : b;
}

interface SpriteView {
  readonly id: SpriteId;
  readonly frame: string;
  readonly rect: Rect;
  readonly depth: number;
  readonly flip?: boolean;
  readonly visible?: boolean;
  readonly alpha?: number;
  /** Залить белым (вспышка-предупреждение). */
  readonly flash?: boolean;
  readonly offsetY?: number;
}

/**
 * Рисует мир: тайлы из карты Tiled, сущности — спрайтами из art/. Логика мира
 * о рисовании не знает: этот слой только читает её состояние каждый кадр.
 */
export class LevelView {
  private readonly sprites = new Map<object, Phaser.GameObjects.Sprite>();
  private readonly heroes = new Map<
    Player,
    { sprite: Phaser.GameObjects.Sprite; slow: Phaser.GameObjects.BitmapText }
  >();
  private readonly debug: Phaser.GameObjects.Graphics;
  private readonly collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private phaseOverlay: Phaser.GameObjects.Rectangle | null = null;
  private readonly water = new Map<
    object,
    { body: Phaser.GameObjects.Rectangle; top: Phaser.GameObjects.Rectangle }
  >();
  private hitboxes = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World,
    map: TiledMap,
    levelKey: string,
    art: { tileset: string; textureKey: string } | null,
  ) {
    const key = TILEMAP_KEY_PREFIX + levelKey;
    if (!scene.cache.tilemap.exists(key)) {
      scene.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: map });
    }
    const tm = scene.make.tilemap({ key });
    if (art) {
      const artSet = tm.addTilesetImage(art.tileset, art.textureKey);
      if (!artSet) throw new Error(`Art tileset not found: ${art.tileset}`);
      tm.createLayer('art', artSet, 0, 0);
    }
    // Столкновения: без арта — видны (заглушка), с артом — только по F4.
    const tileset = tm.addTilesetImage('placeholder', TILESET_KEY);
    if (!tileset) throw new Error('Tileset not found');
    for (const name of ['solid', 'oneway', 'hazard']) {
      const layer = tm.createLayer(name, tileset, 0, 0);
      if (!layer) continue;
      layer
        .setVisible(!art)
        .setAlpha(art ? 0.6 : 1)
        .setDepth(DEPTH.overlay - 1);
      this.collisionLayers.push(layer);
    }
    this.hasArt = art !== null;
    this.debug = scene.add.graphics().setDepth(DEPTH.overlay);
  }

  private hasArt = false;

  get showHitboxes(): boolean {
    return this.hitboxes;
  }

  /** F4: хитбоксы и слои столкновений. */
  set showHitboxes(on: boolean) {
    this.hitboxes = on;
    for (const l of this.collisionLayers) l.setVisible(on || !this.hasArt);
  }

  /** Подсветить прямоугольник (вторая фаза босса: «съёмочная площадка»). */
  tintArea(r: Rect, color: number, alpha: number): void {
    this.phaseOverlay?.destroy();
    this.phaseOverlay = this.scene.add
      .rectangle(r.x, r.y, r.w, r.h, color, alpha)
      .setOrigin(0)
      .setDepth(DEPTH.pickup - 1);
  }

  sync(): void {
    const w = this.world;
    const f = w.frame;
    const seen = new Set<object>();
    const draw = (key: object, v: SpriteView): void => {
      seen.add(key);
      let s = this.sprites.get(key);
      if (!s) {
        s = this.scene.add
          .sprite(0, 0, SPRITES_TEXTURE, spriteFrameName(v.id, v.frame))
          .setOrigin(0);
        this.sprites.set(key, s);
      }
      s.setFrame(spriteFrameName(v.id, v.frame));
      s.setPosition(Math.round(v.rect.x), Math.round(v.rect.y + (v.offsetY ?? 0)));
      s.setDepth(v.depth)
        .setFlipX(v.flip ?? false)
        .setVisible(v.visible ?? true)
        .setAlpha(v.alpha ?? 1);
      if (v.flash) s.setTintFill(0xffffff);
      else s.clearTint();
    };

    const P = SPRITE_ANIM.pickupFramesPerPose;
    for (const pk of w.pickups) {
      if (!pk.taken)
        draw(pk, { id: pk.kind, frame: alt(f, P, 'a', 'b'), rect: pk, depth: DEPTH.pickup });
    }

    // Предмет в руках — над головой спрайта (спрайт выше хитбокса).
    const lift = HERO_SPRITE.height - PLAYER_PHYSICS.hitboxStanding.height;
    for (const it of w.items) {
      const held = it.state === 'carried' || it.state === 'hiding';
      draw(it, {
        id: it.kind,
        frame: 'idle',
        rect: it,
        depth: held ? DEPTH.carried : DEPTH.item,
        offsetY: it.state === 'carried' ? -lift : 0,
      });
    }

    for (const e of w.enemies) draw(e, this.enemyView(e, f));
    for (const p of w.players) this.syncHero(p);
    if (w.boss) draw(w.boss, this.bossView(w.boss, f));
    for (const pr of w.projectiles)
      draw(pr, { id: pr.kind, frame: 'idle', rect: pr, depth: DEPTH.projectile });
    for (const l of w.mech.lifts)
      draw(l, { id: 'pump', frame: 'idle', rect: l, depth: DEPTH.mechanism });
    for (const fl of w.mech.floaters) {
      if (fl.active) draw(fl, { id: 'jug', frame: 'idle', rect: fl, depth: DEPTH.mechanism });
    }
    this.syncWater();

    for (const [key, s] of this.sprites) {
      if (seen.has(key)) continue;
      s.destroy();
      this.sprites.delete(key);
    }
    this.drawDebug();
  }

  private syncWater(): void {
    for (const fl of this.world.mech.floods) {
      let v = this.water.get(fl.zone);
      if (!v) {
        v = {
          body: this.scene.add
            .rectangle(0, 0, 1, 1, WATER.color, WATER.alpha)
            .setOrigin(0)
            .setDepth(DEPTH.water),
          top: this.scene.add
            .rectangle(0, 0, 1, 1, WATER.surface)
            .setOrigin(0)
            .setDepth(DEPTH.water),
        };
        this.water.set(fl.zone, v);
      }
      const on = fl.h > 0;
      v.body.setVisible(on).setPosition(fl.x, Math.round(fl.y)).setSize(fl.w, Math.ceil(fl.h));
      v.top.setVisible(on).setPosition(fl.x, Math.round(fl.y)).setSize(fl.w, WATER.surfaceH);
    }
  }

  private enemyView(e: Enemy, f: number): SpriteView {
    const E = SPRITE_ANIM.enemyFramesPerPose;
    const frozen = e.stun > 0;
    const frame =
      e.kind === 'bot'
        ? frozen
          ? 'walk1'
          : alt(f, E, 'walk1', 'walk2')
        : e.kind === 'barista'
          ? frozen
            ? 'roll1'
            : alt(f, E, 'roll1', 'roll2')
          : frozen
            ? 'spin1'
            : alt(f, E, 'spin1', 'spin2');
    return {
      id: e.kind,
      frame,
      rect: e,
      depth: DEPTH.enemy,
      flip: e.facing < 0,
      visible: !frozen || blink(e.stun),
      alpha: frozen ? 0.6 : 1,
    };
  }

  private bossView(b: Boss, f: number): SpriteView {
    const frame = b.defeated || b.invuln > 0 ? 'hit' : b.telegraphing ? 'aim' : 'idle';
    const bob =
      b.state === 'fly' || b.state === 'intro'
        ? Math.round(
            Math.sin((f / SPRITE_ANIM.bossBobPeriod) * Math.PI * 2) * SPRITE_ANIM.bossBobAmplitude,
          )
        : 0;
    const target = this.world.target(b);
    return {
      id: b.name,
      frame,
      rect: b,
      depth: DEPTH.boss,
      flip: target !== null && target.x < b.x + b.w / 2,
      visible: b.invuln === 0 || blink(b.invuln),
      alpha: b.defeated ? 0.5 : 1,
      flash: b.telegraphing && !blink(b.timer),
      offsetY: bob,
    };
  }

  /** Ведущий — спрайт: ноги по низу хитбокса, по центру; влево — зеркально. */
  private syncHero(p: Player): void {
    let h = this.heroes.get(p);
    if (!h) {
      const sprite = this.scene.add
        .sprite(0, 0, HEROES_TEXTURE, heroFrameName(p.hero, 'idle'))
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.hero);
      const slow = this.scene.add
        .bitmapText(0, 0, FONT_KEY, '', LABEL_SIZE)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.hero + 1);
      h = { sprite, slow };
      this.heroes.set(p, h);
    }
    const pose = heroPoseFor(
      p,
      this.world.frame,
      PLAYER_PHYSICS.deathFrames,
      PLAYER_PHYSICS.throwFrames,
    );
    const blinking =
      p.state === 'dead'
        ? !blink(p.stateTimer)
        : p.vitals.invuln > 0 || p.state === 'respawn'
          ? !blink(p.vitals.invuln + p.stateTimer)
          : false;
    const visible = !p.out && pose !== null && !blinking;
    h.sprite.setVisible(visible);
    if (pose) h.sprite.setFrame(heroFrameName(p.hero, pose));
    h.sprite.setFlipX(p.facing < 0);
    h.sprite.setPosition(Math.round(p.x + p.w / 2), Math.round(p.y + p.h));
    h.sprite.setAlpha(p.state === 'stunned' ? 0.7 : 1);
    // Прилипшие звёздочки-сноски — над головой.
    h.slow.setText('*'.repeat(p.slowStacks)).setVisible(visible && p.slowStacks > 0);
    h.slow.setPosition(Math.round(p.x + p.w / 2), Math.round(p.y - 2));
  }

  private drawDebug(): void {
    this.debug.clear();
    if (!this.hitboxes) return;
    const w = this.world;
    this.debug.lineStyle(1, 0x00ff00, 1);
    const all: Rect[] = [...w.players, ...w.enemies, ...w.items, ...w.projectiles, ...w.pickups];
    if (w.boss) all.push(w.boss);
    for (const r of all) this.debug.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    this.debug.lineStyle(1, 0xffff00, 1);
    for (const p of w.players) {
      const r = p.reachRect();
      this.debug.strokeRect(r.x, r.y, r.w, r.h);
    }
    this.debug.lineStyle(1, 0x00ffff, 1);
    for (const z of w.level.zones) this.debug.strokeRect(z.x, z.y, z.w, z.h);
  }
}
