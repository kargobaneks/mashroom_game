import Phaser from 'phaser';
import { HERO_SPRITE, heroPoseFor } from '../art/heroes';
import { SPRITE_ANIM, spriteFrameName, type SpriteId } from '../art/sprites';
import { PLAYER_PHYSICS } from '../config/physics';
import type { Boss } from '../sim/World';
import { Bordachev } from '../sim/bosses/Bordachev';
import { Mikitko } from '../sim/bosses/Mikitko';
import { Shchelin } from '../sim/bosses/Shchelin';
import { Duo } from '../sim/bosses/Duo';
import { Markov } from '../sim/bosses/Markov';
import { DUO } from '../config/balance';
import { Pendulum } from '../sim/enemies/MineHazards';
import { MIKITKO } from '../config/balance';
import { Uralov } from '../sim/bosses/Uralov';
import { Rigger } from '../sim/enemies/Rigger';
import type { Enemy, EnemyKind } from '../sim/enemies';
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
  /** Свет погашен (арена Микитко): чёрное поверх арта, под всеми, кто на арене. */
  dark: 0.5,
  /** Вода — над артом, но под предметами, кораблём и героями: их всегда видно. */
  water: 1,
  mechanism: 2,
  pickup: 2,
  item: 3,
  enemy: 4,
  hero: 5,
  carried: 10,
  boss: 6,
  projectile: 7,
  overlay: 100,
} as const;

/** Облако «заглушки», слетающее с гостя после победы. */
const BURST = {
  count: 28,
  size: 3,
  radius: 40,
  rise: 16,
  ms: 900,
  colors: [0x000000, 0x940084, 0x3c3c3c, 0x7c7c7c],
} as const;

/** Вода в раковине: полупрозрачная, со светлой кромкой. */
const WATER = {
  color: 0x3cbcfc,
  alpha: 0.65,
  surface: 0xa4e4fc,
  surfaceH: 2,
  stream: 0x0058f8,
} as const;

/** Трос крана — серый, как блок крюка. Крюк и коробка под ним — по 16 px. */
const CRANE_CABLE = 0x7c7c7c;
const HOOK_SIZE = 16;
/** Цепь маятника шахты. */
const ROPE_COLOR_CHAIN = 0x7c7c7c;
/** Канат такелажника — пеньковый. */
const ROPE_COLOR = 0xac7c00;

/** Центр циферблата на арене Щелина (scripts/levels/level6_arena.mjs), от левого верха арены. */
const CLOCK_FACE = { x: 128, y: 76 } as const;

/** Мигание раз в N кадров. */
function blink(timer: number): boolean {
  return Math.floor(timer / PLAYER_PHYSICS.invulnerableBlinkFrames) % 2 === 0;
}

/** Двухкадровая анимация по счётчику кадров. */
/** Два кадра анимации каждого врага (первый — когда оглушён). */
const ENEMY_FRAMES: Record<EnemyKind, readonly [string, string]> = {
  bot: ['walk1', 'walk2'],
  barista: ['roll1', 'roll2'],
  asterisk: ['spin1', 'spin2'],
  headline: ['fly1', 'fly2'],
  cable: ['roll1', 'roll2'],
  crab: ['walk1', 'walk2'],
  gull: ['fly1', 'fly2'],
  rigger: ['idle', 'idle'],
  icicle: ['hang', 'hang'],
  phone: ['slide1', 'slide2'],
  commentGhost: ['fly1', 'fly2'],
  candle: ['walk1', 'walk2'],
  candleCeil: ['walk1', 'walk2'],
  mole: ['out', 'out'],
  rat: ['walk1', 'walk2'],
  boulder: ['idle', 'idle'],
  pendulum: ['idle', 'idle'],
  bat: ['fly1', 'fly2'],
  snakeBox: ['idle', 'idle'],
  porcupine: ['walk1', 'walk2'],
  moth: ['fly1', 'fly2'],
  diveMoth: ['fly1', 'fly2'],
  slingRat: ['idle', 'idle'],
  mechDog: ['roll1', 'roll2'],
};

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
  /** Поворот спрайта, рад (вокруг центра rect). */
  readonly angle?: number;
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
  private stream: Phaser.GameObjects.Rectangle | null = null;
  private readonly water = new Map<
    object,
    { body: Phaser.GameObjects.Rectangle; top: Phaser.GameObjects.Rectangle }
  >();
  private hitboxes = false;
  /** Трос крана «принуждение к миру» (арена Бордачёва). */
  private cable: Phaser.GameObjects.Rectangle | null = null;
  private readonly ropes: Phaser.GameObjects.Rectangle[] = [];
  /** Ключ спрайта коробки, которую несёт кран. */
  private readonly craneCase = {};

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
    this.darkness = scene.add
      .rectangle(0, 0, 1, 1, 0x000000)
      .setOrigin(0)
      .setDepth(DEPTH.dark)
      .setVisible(false);
    // Пламя свечей (зоны flame): горит и в темноте.
    this.flames = world.level.zones.filter((z) => z.kind === 'flame');
    this.helpers = world.level.zones.filter((z) => z.kind === 'helper');
    this.cameos = world.level.zones.filter((z) => z.kind === 'cameo');
  }

  private readonly darkness: Phaser.GameObjects.Rectangle;
  private readonly flames: readonly Rect[];
  private readonly helpers: readonly Rect[];
  /** Камео (Стас Васильев за стойкой салуна, уровень 7): просто стоит. */
  private readonly cameos: readonly Rect[];
  /** Ключи слоёв призрака Микитко. */
  private readonly ghostLayers = { coat: {}, hair: {}, face: {} };

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
      if (v.angle !== undefined) {
        // Повёрнутый (луч): центр спрайта — в центре хитбокса, вдоль направления полёта.
        s.setOrigin(0.5, 0.5).setRotation(v.angle);
        s.setPosition(Math.round(v.rect.x + v.rect.w / 2), Math.round(v.rect.y + v.rect.h / 2));
      } else {
        s.setOrigin(0).setRotation(0);
        s.setPosition(Math.round(v.rect.x), Math.round(v.rect.y + (v.offsetY ?? 0)));
      }
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
        frame: it.kind === 'letter' ? it.glyph : 'idle',
        rect: it,
        depth: held ? DEPTH.carried : DEPTH.item,
        offsetY: it.state === 'carried' ? -lift : 0,
      });
    }

    for (const e of w.enemies) draw(e, this.enemyView(e, f));
    this.syncRopes();
    this.syncPendulums();
    for (const p of w.players) this.syncHero(p);
    if (w.boss instanceof Markov) this.syncMarkov(w.boss, f, draw);
    else if (w.boss instanceof Mikitko) this.syncMikitko(w.boss, f, draw);
    else if (w.boss instanceof Duo) this.syncDuo(w.boss, draw);
    else if (w.boss) draw(w.boss, this.bossView(w.boss, f));
    this.syncClock();
    this.syncDark(f, draw);
    this.syncCrane(draw);
    for (const pr of w.projectiles)
      draw(pr, {
        id: pr.kind,
        frame: pr.kind === 'beam' ? alt(f, 3, 'a', 'b') : 'idle',
        rect: pr,
        depth: DEPTH.projectile,
        ...(pr.kind === 'beam' ? { angle: Math.atan2(pr.vy, pr.vx) } : {}),
      });
    for (const l of w.mech.lifts)
      draw(l, { id: 'pump', frame: 'idle', rect: l, depth: DEPTH.mechanism });
    for (const c of w.mech.chains)
      draw(c, { id: 'chainPlatform', frame: 'idle', rect: c, depth: DEPTH.mechanism });
    this.syncCrushers(draw);
    // Вагонетка — поверх героя (он стоит в ней), низ спрайта — колёса ниже рельса.
    for (const c of w.mech.carts)
      draw(c, {
        id: 'cart',
        frame: 'idle',
        rect: { x: c.x, y: c.y - 16, w: 32, h: 20 },
        depth: DEPTH.hero + 0.5,
      });
    // Тающие платформы: тают — дрожат и бледнеют, растаяли — не видны.
    for (const m of w.mech.melts) {
      if (m.item === 'fold') {
        // Складная платформа: перед тем как раскрыться, дрожит; раскрытая — створки вниз.
        const shake = m.state === 'melting' && m.left < 0.35 && f % 4 < 2 ? 1 : 0;
        draw(m, {
          id: 'foldPlatform',
          frame: m.active ? 'idle' : 'open',
          rect: { x: m.x + shake, y: m.y, w: m.w, h: m.h },
          depth: DEPTH.mechanism,
        });
        continue;
      }
      const melting = m.state === 'melting';
      const jitter = melting && f % 6 < 3 ? 1 : 0;
      draw(m, {
        id: 'iceblock',
        frame: m.item === 'player' ? 'player' : 'cd',
        rect: { x: m.x + jitter, y: m.y, w: m.w, h: m.h },
        depth: DEPTH.mechanism,
        visible: m.active,
        alpha: melting ? 0.35 + 0.65 * m.left : 1,
      });
    }
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

  /**
   * «Заглушка» злодея слетает с гостя тёмным облаком частиц (ТЗ: «Победа: заглушка слетает
   * с него частицами»).
   */
  burstFrom(r: Rect): void {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    for (let i = 0; i < BURST.count; i++) {
      const a = (i / BURST.count) * Math.PI * 2;
      const color = BURST.colors[i % BURST.colors.length]!;
      const dot = this.scene.add
        .rectangle(cx, cy, BURST.size, BURST.size, color)
        .setDepth(DEPTH.projectile);
      this.scene.tweens.add({
        targets: dot,
        x: cx + Math.cos(a) * BURST.radius,
        y: cy + Math.sin(a) * BURST.radius - BURST.rise,
        alpha: 0,
        duration: BURST.ms,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** Шток давящих блоков: от верхнего положения (низ цилиндра на фоне) до блока. */
  private rods: Phaser.GameObjects.Graphics | null = null;

  private syncCrushers(draw: (key: object, v: SpriteView) => void): void {
    const cs = this.world.mech.crushers;
    if (cs.length === 0) return;
    this.rods ??= this.scene.add.graphics().setDepth(DEPTH.mechanism - 0.1);
    const g = this.rods.clear();
    for (const c of cs) {
      const h = c.y - c.topY;
      if (h > 0) {
        g.fillStyle(0x000000, 1).fillRect(c.x + c.w / 2 - 5, c.topY, 10, h);
        g.fillStyle(0xbcbcbc, 1).fillRect(c.x + c.w / 2 - 4, c.topY, 8, h);
        g.fillStyle(0xfcfcfc, 1).fillRect(c.x + c.w / 2 - 3, c.topY, 2, h);
      }
      draw(c, { id: 'crusher', frame: 'idle', rect: c, depth: DEPTH.mechanism });
    }
  }

  /** Стрела и цепь крана Маркова. */
  private craneRig: Phaser.GameObjects.Graphics | null = null;
  private readonly craneParts = { tracks: {}, body: {}, ball: {} };

  /**
   * Арена Маркова: гусеницы, корпус с кабиной (Марков в окне — позади корпуса), стрела, цепь
   * и шар. Побеждён — Марков стоит на полу перед краном.
   */
  private syncMarkov(b: Markov, f: number, draw: (key: object, v: SpriteView) => void): void {
    const cx = b.craneX;
    const top = b.arena.y;
    const tracks = b.tracks;
    draw(this.craneParts.tracks, {
      id: 'craneTracks',
      frame: Math.floor(b.travelled / 3) % 2 === 0 ? 'a' : 'b',
      rect: tracks,
      depth: DEPTH.boss - 0.2,
    });
    draw(this.craneParts.body, {
      id: 'craneBody',
      frame: 'idle',
      rect: { x: cx + 8, y: top + 104, w: 72, h: 64 },
      depth: DEPTH.boss - 0.3,
    });
    const ball = b.ball;
    // Перед ударом шар качается (знак).
    const sway = b.telegraphing ? (f % 8 < 4 ? -2 : 2) : 0;
    const ballRect = { x: ball.x + sway, y: ball.y, w: ball.w, h: ball.h };
    draw(this.craneParts.ball, {
      id: 'wreckingBall',
      frame: 'idle',
      rect: ballRect,
      depth: DEPTH.boss - 0.1,
    });
    // Стрела: от узла на корпусе вверх-влево до точки над шаром; цепь — до шара.
    this.craneRig ??= this.scene.add.graphics().setDepth(DEPTH.boss - 0.4);
    const g = this.craneRig.clear();
    const pivot = { x: cx + 30, y: top + 145 };
    const tip = { x: ball.x + ball.w / 2, y: top + 40 };
    g.lineStyle(7, 0x000000, 1).lineBetween(pivot.x, pivot.y, tip.x, tip.y);
    g.lineStyle(5, 0xd82800, 1).lineBetween(pivot.x, pivot.y, tip.x, tip.y);
    g.lineStyle(1, 0xfc7460, 1).lineBetween(pivot.x, pivot.y - 2, tip.x, tip.y - 2);
    g.fillStyle(0x000000, 1).fillCircle(tip.x, tip.y, 4);
    g.lineStyle(3, 0x000000, 1).lineBetween(tip.x, tip.y, ballRect.x + ball.w / 2, ball.y + 2);
    g.lineStyle(1, 0xbcbcbc, 1).lineBetween(tip.x, tip.y, ballRect.x + ball.w / 2, ball.y + 2);
    if (b.defeated) {
      draw(b, { id: 'markov', frame: 'freed', rect: b, depth: DEPTH.boss });
      return;
    }
    const frame = b.invuln > 0 ? 'hit' : b.telegraphing ? 'aim' : 'idle';
    draw(b, {
      id: 'markov',
      frame,
      rect: { x: b.x, y: b.y - 2, w: 24, h: 40 },
      // Позади корпуса: в окне кабины видны голова и плечи.
      depth: DEPTH.boss - 0.35,
      flip: true,
      visible: b.invuln === 0 || blink(b.invuln),
    });
  }

  /** Канаты такелажников: от блока на мачте до люльки. */
  private pendulumChains: Phaser.GameObjects.Graphics | null = null;

  /** Цепи маятников шахты: от точки подвеса до ядра. */
  private syncPendulums(): void {
    const ps = this.world.enemies.filter((e): e is Pendulum => e instanceof Pendulum);
    if (ps.length === 0 && !this.pendulumChains) return;
    this.pendulumChains ??= this.scene.add.graphics().setDepth(DEPTH.enemy - 0.1);
    const g = this.pendulumChains.clear();
    g.lineStyle(2, ROPE_COLOR_CHAIN, 1);
    for (const p of ps) {
      const b = p.ball;
      g.lineBetween(p.pivot.x, p.pivot.y, b.x, b.y);
      g.fillStyle(0x000000, 1).fillRect(p.pivot.x - 3, p.pivot.y - 3, 6, 6);
    }
  }

  private syncRopes(): void {
    const riggers = this.world.enemies.filter((e): e is Rigger => e instanceof Rigger);
    riggers.forEach((r, i) => {
      let rope = this.ropes[i];
      if (!rope) {
        rope = this.scene.add.rectangle(0, 0, 1, 1, ROPE_COLOR).setOrigin(0).setDepth(DEPTH.enemy);
        this.ropes.push(rope);
      }
      rope
        .setVisible(true)
        .setPosition(Math.round(r.x + r.w / 2 - 1), Math.round(r.ropeTop))
        .setSize(2, Math.max(0, Math.round(r.y - r.ropeTop)));
    });
    for (let i = riggers.length; i < this.ropes.length; i++) this.ropes[i]!.setVisible(false);
  }

  /** Кран Бордачёва: трос с верха экрана, крюк (мигает, пока показывается у края), коробка. */
  private syncCrane(draw: (key: object, v: SpriteView) => void): void {
    const b = this.world.boss;
    const c = b instanceof Bordachev ? b.crane : null;
    this.cable ??= this.scene.add.rectangle(0, 0, 1, 1, CRANE_CABLE).setOrigin(0);
    this.cable.setDepth(DEPTH.projectile).setVisible(c !== null);
    if (!c) return;
    const visible = c.phase === 'pass' || blink(c.timer * 2);
    const top = this.world.camera.y;
    this.cable
      .setVisible(visible)
      .setPosition(Math.round(c.x + c.w / 2 - 1), Math.round(top))
      .setSize(2, Math.max(0, Math.round(c.y - top + 1)));
    const flip = c.vx < 0;
    const hookRect = { x: c.x, y: c.y, w: c.w, h: HOOK_SIZE };
    draw(c, { id: 'hook', frame: 'idle', rect: hookRect, depth: DEPTH.projectile, flip, visible });
    if (c.carrying) {
      draw(this.craneCase, {
        id: 'box',
        frame: 'idle',
        rect: { x: c.x, y: c.y + HOOK_SIZE, w: c.w, h: HOOK_SIZE },
        depth: DEPTH.projectile,
        visible,
      });
    }
  }

  private syncWater(): void {
    // Струя из крана, пока мойка наполняется.
    const stream = this.world.level.zones.find((z) => z.kind === 'stream');
    const flood = this.world.mech.floods[0];
    if (stream && flood) {
      this.stream ??= this.scene.add
        .rectangle(0, 0, 1, 1, WATER.stream)
        .setOrigin(0)
        .setDepth(DEPTH.water);
      const on = flood.active && !flood.full;
      this.stream
        .setVisible(on)
        .setPosition(stream.x, stream.y)
        .setSize(stream.w, Math.max(0, flood.level - stream.y));
    }
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
    const [a, b] = ENEMY_FRAMES[e.kind];
    const frame = e.pose ?? (frozen ? a : alt(f, E, a, b));
    return {
      id: e.kind,
      frame,
      rect: e,
      depth: DEPTH.enemy,
      flip: e.facing < 0,
      visible: !e.hidden && (!frozen || blink(e.stun)),
      alpha: frozen ? 0.6 : 1,
    };
  }

  /** Темнота на арене архива и пламя свечей поверх неё. */
  private syncDark(f: number, draw: (key: object, v: SpriteView) => void): void {
    const cam = this.world.camera;
    const d = this.world.darkness;
    this.darkness
      .setVisible(this.world.dark)
      .setFillStyle(d.color, d.alpha)
      .setPosition(cam.x, cam.y)
      .setSize(cam.w, cam.h);
    // Помощник (Петровский) стоит в своей зоне.
    for (const z of this.helpers)
      draw(z, {
        id: 'petrovsky',
        frame: 'idle',
        rect: { x: z.x + z.w / 2 - 12, y: z.y + z.h - 40, w: 24, h: 40 },
        depth: DEPTH.enemy,
        flip: true,
      });
    for (const z of this.cameos)
      draw(z, { id: 'vasiliev', frame: 'bar', rect: z, depth: DEPTH.mechanism, flip: true });
    for (const z of this.flames)
      draw(z, {
        id: 'flame',
        frame: alt(f + Math.round(z.x), 8, 'a', 'b'),
        rect: z,
        depth: DEPTH.mechanism,
      });
  }

  /**
   * Призрак Микитко: три слоя 64×80 (пальто, волосы, лицо) в одной точке, хитбокс — внутри.
   * Проявляется и растворяется прозрачностью. Побеждён — человек 24×40 на полу.
   */
  private syncMikitko(b: Mikitko, _f: number, draw: (key: object, v: SpriteView) => void): void {
    if (b.defeated) {
      draw(b, { id: 'mikitko', frame: 'freed', rect: b, depth: DEPTH.boss, flip: b.facing < 0 });
      return;
    }
    const S = MIKITKO.sprite;
    const flip = b.facing < 0;
    // Покачивание — в самой логике (плавное, одно); здесь не добавляем второе.
    const rect = {
      x: b.x - (flip ? S.w - S.hitX - b.w : S.hitX),
      y: b.y - S.hitY,
      w: S.w,
      h: S.h,
    };
    // Рука вытянута, пока заряжает и пока луч уходит.
    const frame = b.invuln > 0 ? 'hit' : b.telegraphing || b.state === 'shoot' ? 'aim' : 'idle';
    const visible = b.opacity > 0 && (b.invuln === 0 || blink(b.invuln));
    const flash = b.telegraphing && !blink(b.timer);
    const layers = [
      ['mikitkoGhostCoat', this.ghostLayers.coat],
      ['mikitkoGhostHair', this.ghostLayers.hair],
      ['mikitkoGhostFace', this.ghostLayers.face],
    ] as const;
    layers.forEach(([id, key], i) =>
      draw(key, {
        id,
        frame,
        rect,
        depth: DEPTH.boss + i * 0.01,
        flip,
        visible,
        alpha: Math.min(1, b.opacity) * 0.92,
        flash: flash && i === 0,
      }),
    );
  }

  private bossView(b: Boss, f: number): SpriteView {
    const frame = b.defeated
      ? 'freed'
      : b.invuln > 0
        ? 'hit'
        : b instanceof Bordachev
          ? b.telegraphing
            ? 'aim'
            : b.airborne
              ? 'jump'
              : 'idle'
          : b instanceof Shchelin
            ? b.telegraphing
              ? 'aim'
              : Math.floor(b.wheel / 6) % 2 === 0
                ? 'idle'
                : 'ride'
            : b instanceof Uralov
              ? b.wingsDown
                ? 'flap'
                : 'idle'
              : b.telegraphing
                ? 'aim'
                : 'idle';
    const bob = b.flying
      ? Math.round(
          Math.sin((f / SPRITE_ANIM.bossBobPeriod) * Math.PI * 2) * SPRITE_ANIM.bossBobAmplitude,
        )
      : 0;
    const target = this.world.target(b);
    // Уралов смотрит анфас — не отражаем (ухмылка и чуб остаются на своей стороне).
    const flip =
      b instanceof Uralov
        ? false
        : b instanceof Bordachev || b instanceof Shchelin
          ? b.facing < 0
          : target !== null && target.x < b.x + b.w / 2;
    return {
      // Соболев и Лука рисуются отдельно (syncDuo).
      id: b.name === 'duo' ? 'sobolev' : b.name,
      frame,
      rect: b,
      depth: DEPTH.boss,
      flip,
      visible: b.defeated || b.invuln === 0 || blink(b.invuln),
      flash: b.telegraphing && !blink(b.timer),
      offsetY: bob,
    };
  }

  /** Соболев и Лука: тот, кто ходит, и тот, кто сидит за столом. */
  private syncDuo(b: Duo, draw: (key: object, v: SpriteView) => void): void {
    const a = b.active;
    const frame = b.defeated
      ? 'freed'
      : b.invuln > 0
        ? 'hit'
        : b.telegraphing || b.state === 'throw'
          ? 'aim'
          : 'idle';
    const top = DUO.spriteHeight - b.h;
    draw(a, {
      id: a.who,
      frame,
      rect: { x: a.x, y: a.y - top, w: b.w, h: DUO.spriteHeight },
      depth: DEPTH.boss,
      flip: a.facing < 0,
      visible: b.defeated || b.invuln === 0 || blink(b.invuln),
      flash: b.telegraphing && !blink(b.timer),
    });
    const s = b.seated;
    draw(s, {
      id: s.who,
      frame: b.state === 'swap' ? 'idle' : s.hp <= 0 ? 'freed' : 'sit',
      rect: { x: s.x, y: s.y - top, w: b.w, h: DUO.spriteHeight },
      depth: DEPTH.boss - 0.5,
      flip: s.facing < 0,
    });
  }

  private clock: Phaser.GameObjects.BitmapText | null = null;

  /** Арена Щелина: год фазы на циферблате (ТЗ: «три фазы по дате на циферблате»). */
  private syncClock(): void {
    const b = this.world.boss;
    if (!(b instanceof Shchelin)) {
      this.clock?.setVisible(false);
      return;
    }
    if (!this.clock) {
      this.clock = this.scene.add
        .bitmapText(0, 0, FONT_KEY, '', LABEL_SIZE)
        .setOrigin(0.5, 0.5)
        .setTint(0x000000)
        .setDepth(DEPTH.mechanism);
    }
    this.clock
      .setVisible(true)
      .setText(String(b.year))
      .setPosition(b.arena.x + CLOCK_FACE.x, b.arena.y + CLOCK_FACE.y);
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
