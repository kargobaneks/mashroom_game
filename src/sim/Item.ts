import { ITEMS, THROW_PHYSICS } from '../config/physics';
import type { Facing, Point } from './geom';
import { moveBody, type Body } from './physics';
import type { PickupKind } from './Pickup';
import type { Player } from './Player';
import type { World } from './World';

export type ItemKind = 'box' | 'case' | 'letter' | 'gear' | 'card' | 'metal' | 'scrap';
/** Какая буква (для рисунка): ять, і десятеричное, фита. */
export type LetterGlyph = 'yat' | 'i' | 'fita';
export type ThrowDir = 'forward' | 'up' | 'ground';
/**
 * resting — лежит (можно взять; кейс — платформа), falling — падает, carried — в руках,
 * hiding — игрок под ним прячется, thrown — летит, gone — разбился или улетел.
 */
export type ItemState = 'resting' | 'falling' | 'carried' | 'hiding' | 'thrown' | 'gone';

let nextItemId = 1;

/** Доля скорости, с которой отбитый предмет отлетает вниз. */
const DEFLECT_BOUNCE = 0.5;

/** Предмет для броска: коробка с реквизитом (лёгкая) или кейс с аппаратурой (тяжёлый). */
export class Item implements Body {
  readonly id = nextItemId++;
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  vx = 0;
  vy = 0;
  onGround = false;
  state: ItemState = 'falling';
  owner: Player | null = null;
  throwDir: ThrowDir = 'forward';
  /** Кадры, пока брошенный предмет не задевает бросившего. */
  ownerImmune = 0;
  /** Сколько пролетел по горизонтали с момента броска, px. */
  flown = 0;
  /** Сброшен краном Бордачёва: пока его не бросил игрок, падая, босса не бьёт. */
  fromCrane = false;
  /** Что спрятано под ящиком: появляется на его месте, когда ящик поднимают. */
  contents: PickupKind | null = null;
  /** Буква: какая (рисунок). */
  glyph: LetterGlyph = 'yat';
  /** Сколько кадров ещё нельзя поднять (карта на арене уровня 7 «созревает» 1 с, ТЗ). */
  lock = 0;
  /** Металлический блок прилип к магниту: висит под ним твёрдым блоком. */
  stuck = false;

  constructor(
    readonly kind: ItemKind,
    /** Низ-центр. */
    at: Point,
    /** Точка уровня, из которой предмет появился (для сброса сегмента); null — сброшен сверху. */
    readonly spawnId: number | null = null,
  ) {
    this.w = ITEMS[kind].width;
    this.h = ITEMS[kind].height;
    this.x = at.x - this.w / 2;
    this.y = at.y - this.h;
  }

  get heavy(): boolean {
    return ITEMS[this.kind].heavy;
  }

  get hideable(): boolean {
    return ITEMS[this.kind].hideable;
  }

  /** Лежащий предмет — твёрдый блок: в него упираются, на него встают. */
  get isSolid(): boolean {
    // Прилипший к магниту блок — часть магнита: герой отталкивается от него, не ударяясь головой.
    return this.state === 'resting' && !this.stuck;
  }

  get canBePickedUp(): boolean {
    return this.state === 'resting' && this.lock === 0 && !this.stuck;
  }

  launch(owner: Player, dir: ThrowDir, facing: Facing): void {
    this.state = 'thrown';
    this.fromCrane = false;
    this.owner = owner;
    this.throwDir = dir;
    this.ownerImmune = THROW_PHYSICS.ownerImmuneFrames;
    this.flown = 0;
    this.vx = 0;
    this.vy = 0;
    if (dir === 'forward') this.vx = THROW_PHYSICS.forwardSpeed * facing;
    else if (dir === 'up') this.vy = -THROW_PHYSICS.upSpeed;
    else this.vx = THROW_PHYSICS.groundSpeed * facing;
  }

  /** Предмет во что-то врезался: коробка разбивается, кейс падает и остаётся лежать. */
  impact(): void {
    // Кейс и металлический блок не бьются: падают и остаются лежать.
    if (this.heavy || this.kind === 'metal') {
      this.state = 'falling';
      this.vx = 0;
      this.vy = 0;
      this.owner = null;
    } else {
      this.state = 'gone';
    }
  }

  /** Отбит (босс неуязвим): отскакивает назад и падает, а не исчезает молча. */
  deflect(): void {
    this.state = 'falling';
    this.vx = 0;
    this.vy = Math.abs(this.vy) * DEFLECT_BOUNCE;
    this.owner = null;
  }

  /** Выпал из рук (игрока ударили): падает вниз. */
  drop(): void {
    this.state = 'falling';
    this.vx = 0;
    this.vy = 0;
    this.owner = null;
  }

  update(world: World): void {
    if (this.ownerImmune > 0) this.ownerImmune--;
    if (this.lock > 0) this.lock--;
    if (this.stuck) return;
    switch (this.state) {
      case 'resting':
      case 'falling': {
        this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
        moveBody(this, world.grid, {
          solids: world.solidsFor(this),
          platforms: world.platformsFor(this),
        });
        this.state = this.onGround ? 'resting' : 'falling';
        if (this.y > world.grid.heightPx) this.state = 'gone';
        return;
      }
      case 'thrown': {
        if (this.throwDir === 'ground')
          this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
        const res = moveBody(this, world.grid, { ignoreOneway: this.throwDir !== 'ground' });
        this.flown += Math.abs(this.vx);
        if (res.hitWall || res.hitCeiling) this.impact();
        else if (this.x + this.w < world.camera.x || this.y + this.h < world.camera.y) {
          // За левый (или верхний) край экрана — исчезает, как в оригинале.
          this.state = 'gone';
        } else if (this.throwDir !== 'up' && this.flown >= THROW_PHYSICS.missRange) {
          // Ни во что не попал — падает на ближайшую платформу и остаётся лежать.
          this.drop();
        } else if (!world.camera.sees(this, 0)) {
          this.drop();
        }
        return;
      }
      case 'carried':
      case 'hiding':
      case 'gone':
        return;
    }
  }
}
