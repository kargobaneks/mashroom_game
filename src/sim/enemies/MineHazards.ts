import { MINE_ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import type { World } from '../World';
import { Enemy } from './Enemy';

const B = MINE_ENEMIES.boulder;
const PD = MINE_ENEMIES.pendulum;
const BAT = MINE_ENEMIES.bat;

/**
 * Валун под потолком шахты: герой ближе ~47 px по горизонтали — срывается и падает с ускорением,
 * у пути (верх рельса под ним) разбивается. На тормозе падает впереди вагонетки.
 */
export class Boulder extends Enemy {
  falling = false;

  constructor(at: Point, spawnId: number) {
    super('boulder', B.width, B.height, at, spawnId);
  }

  override get invulnerable(): boolean {
    return true;
  }

  protected update(world: World): void {
    const cx = this.x + this.w / 2;
    if (!this.falling) {
      const p = world.nearestPlayer(this);
      if (p && cx - (p.x + p.w / 2) <= B.triggerDx && cx - (p.x + p.w / 2) > -this.w) {
        this.falling = true;
        world.emit({ type: 'sfx', name: 'deflect' });
      }
      return;
    }
    this.vy = Math.min(this.vy + B.gravity, B.maxFall);
    this.y += this.vy;
    const rail = world.railBelow(cx, this.y + this.h - this.vy);
    if ((rail !== null && this.y + this.h >= rail) || !world.camera.sees(this, 32)) {
      this.alive = false;
      world.emit({ type: 'sfx', name: 'enemyHit' });
    }
  }
}

/**
 * Маятник: ядро на цепи, точка подвеса — точка карты. Ходит ступенчато: 7 положений по 12 кадров
 * туда и обратно, размах ±37 px. Длина цепи — свойство карты (по умолчанию 57, как в оригинале).
 */
export class Pendulum extends Enemy {
  readonly pivot: Point;
  private t = 0;
  private fitted = false;

  constructor(
    at: Point,
    spawnId: number,
    public length = 57,
  ) {
    super('pendulum', PD.width, PD.height, at, spawnId);
    this.pivot = { x: at.x, y: at.y };
    this.place();
  }

  override get invulnerable(): boolean {
    return true;
  }

  /** Номер положения 0..6 (туда и обратно). */
  get position(): number {
    const n = PD.positions - 1;
    const k = Math.floor(this.t / PD.stepFrames) % (2 * n);
    return k <= n ? k : 2 * n - k;
  }

  /** Центр ядра. */
  get ball(): Point {
    const n = PD.positions - 1;
    const dx = -PD.swing + (2 * PD.swing * this.position) / n;
    const dy = Math.sqrt(Math.max(0, this.length * this.length - dx * dx));
    return { x: this.pivot.x + dx, y: this.pivot.y + dy };
  }

  private place(): void {
    const b = this.ball;
    this.x = b.x - this.w / 2;
    this.y = b.y - this.h / 2;
  }

  protected update(world: World): void {
    // Длина цепи — под путь (у нас прыжок и вагонетка ниже, чем в оригинале): в крайних
    // положениях ядро проходит над головой героя в вагонетке, посередине — бьёт.
    if (!this.fitted) {
      this.fitted = true;
      const rail = world.railBelow(this.pivot.x, this.pivot.y);
      // Над головой проходит в двух крайних положениях с каждой стороны (0–1 и 5–6): проскочить,
      // пока ядро ушло в сторону, — как советует прохождение оригинала.
      const n = PD.positions - 1;
      const dx1 = PD.swing - (2 * PD.swing) / n;
      if (rail !== null) this.length = Math.hypot(rail - 34 - this.pivot.y, dx1);
    }
    this.t++;
    this.place();
  }
}

/** Летучая мышь: влетает справа и, поравнявшись с героем, пикирует на него. Сбивается броском. */
export class Bat extends Enemy {
  diving = false;
  private dvx = 0;
  private dvy = 0;

  constructor(at: Point, spawnId: number) {
    super('bat', BAT.width, BAT.height, at, spawnId);
  }

  override get pose(): string | null {
    return this.diving ? 'dive' : null;
  }

  protected update(world: World): void {
    const p = world.nearestPlayer(this);
    if (!this.diving) {
      this.x -= BAT.speed;
      this.facing = -1;
      if (p && this.x + this.w / 2 - (p.x + p.w / 2) <= BAT.diveDx) {
        const dx = p.x + p.w / 2 - (this.x + this.w / 2);
        const dy = p.y + p.h / 2 - (this.y + this.h / 2);
        const d = Math.hypot(dx, dy) || 1;
        this.dvx = (dx / d) * BAT.diveSpeed;
        this.dvy = (dy / d) * BAT.diveSpeed;
        this.diving = true;
      }
      return;
    }
    this.x += this.dvx;
    this.y += this.dvy;
  }
}

const SB = MINE_ENEMIES.snakeBox;

/** Змея в коробке (последний экран 7-4): герой рядом — выскакивает вперёд и прячется. */
export class SnakeBox extends Enemy {
  private t = 0;
  out = 0;

  constructor(at: Point, spawnId: number) {
    super('snakeBox', SB.width, SB.height, at, spawnId);
  }

  /** В коробке — неуязвима и безопасна; выскочила — ранит, и её можно сбить. */
  override get invulnerable(): boolean {
    return this.out === 0;
  }

  override get harmful(): boolean {
    return super.harmful && this.out > 0;
  }

  override get pose(): string | null {
    return this.out > 0 ? 'out' : null;
  }

  protected update(world: World): void {
    const p = world.nearestPlayer(this);
    if (this.out > 0) {
      this.out--;
      return;
    }
    if (this.t > 0) {
      this.t--;
      return;
    }
    if (!p) return;
    const dx = p.x + p.w / 2 - (this.x + this.w / 2);
    if (Math.abs(dx) <= SB.reach && Math.abs(p.y + p.h - (this.y + this.h)) < 40) {
      this.facing = dx >= 0 ? 1 : -1;
      this.out = SB.outFrames;
      this.t = SB.coolFrames;
    }
  }
}
