import { ENEMIES, LAIR_ENEMIES as L } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import { overlaps, type Point } from '../geom';
import { moveBody } from '../physics';
import type { SpawnPoint } from '../level';
import type { World } from '../World';
import { Bot } from './Bot';
import { Enemy } from './Enemy';

/**
 * Враги уровня 9 «Студия Конца Истории» — по разбору ROM оригинала
 * (docs/refs/level9/LEVEL9_FATCAT_LAIR.md, раздел 2), облик — враги прошлых уровней (ТЗ: «все
 * типы врагов»).
 */

/**
 * Птица оригинала → панический заголовок уровня 2: летит справа налево 2 px/кадр по пологой
 * волне ±8 px, ниже своей высоты не опускается (замер).
 */
export class Bird extends Enemy {
  private phase = 0;
  private readonly baseY: number;
  /** Сколько пролетел, px. */
  protected flown = 0;

  constructor(at: Point, spawnId: number) {
    super('headline', ENEMIES.headline.width, ENEMIES.headline.height, at, spawnId);
    this.baseY = this.y;
  }

  protected update(_world: World): void {
    this.x -= L.bird.speed;
    this.flown += L.bird.speed;
    this.phase += L.bird.frequency;
    // Ниже своей высоты не спускается: волна только вверх.
    this.y = this.baseY - Math.abs(Math.sin(this.phase)) * L.bird.amplitude;
  }
}

/**
 * Птица с яйцом (код 35): пролетев ~90 px, роняет «яйцо» — у нас бот-комментатор уровня 1,
 * он падает на платформу и идёт по ней (птенец оригинала бежит влево и подпрыгивает).
 */
export class EggBird extends Bird {
  private dropped = false;

  protected override update(world: World): void {
    super.update(world);
    if (this.dropped || this.flown < L.eggBird.dropAfter) return;
    this.dropped = true;
    const chick = new Bot({ x: this.x + this.w / 2, y: this.y + this.h + 16 }, -this.spawnId);
    chick.facing = -1;
    world.addEnemy(chick);
  }
}

/**
 * Точка вылета птиц (коды 36 и 35): невидима. Пока она на экране, каждые 160 кадров у правого
 * края экрана на её высоте появляется птица (замер: одна в 160 кадров, бесконечно).
 */
export class Nest extends Enemy {
  private timer: number = L.nest.firstFrames;

  constructor(
    at: Point,
    spawnId: number,
    private readonly eggs = false,
  ) {
    super(eggs ? 'eggNest' : 'nest', 16, 16, at, spawnId);
  }

  override get harmful(): boolean {
    return false;
  }

  override get invulnerable(): boolean {
    return true;
  }

  override get hidden(): boolean {
    return true;
  }

  protected update(world: World): void {
    if (--this.timer > 0) return;
    this.timer = L.nest.everyFrames;
    const at = { x: world.camera.x + world.camera.w + 8, y: this.y + this.h };
    world.addEnemy(this.eggs ? new EggBird(at, this.spawnId) : new Bird(at, this.spawnId));
  }
}

/**
 * Лазер пресса (код 3B): луч из сопла вниз до ленты. Цикл 241 кадр: 120 горит (ранит),
 * 121 нет (замер). Перед включением сопло мигает (знак, у нас — warnFrames кадров).
 * Неуязвим. Точка — низ луча (верх ленты); h — длина луча, phase — сдвиг цикла, кадры.
 */
export class Laser extends Enemy {
  private t: number;
  private readonly phase: number;

  constructor(at: Pick<SpawnPoint, 'x' | 'y' | 'h' | 'phase'>, spawnId: number) {
    super('laser', L.laser.width, at.h ?? 48, at, spawnId);
    this.phase = at.phase ?? 0;
    this.t = this.phase;
  }

  private get cycle(): number {
    return L.laser.onFrames + L.laser.offFrames;
  }

  /** Луч горит. */
  get on(): boolean {
    return this.t % this.cycle < L.laser.onFrames;
  }

  /** Скоро включится: сопло мигает. */
  get warning(): boolean {
    return !this.on && this.t % this.cycle >= this.cycle - L.laser.warnFrames;
  }

  override get harmful(): boolean {
    return this.alive && this.on;
  }

  override get invulnerable(): boolean {
    return true;
  }

  override get hidden(): boolean {
    return !this.on;
  }

  // Оглушение дуэтом лазер не выключает: это механизм.
  override step(world: World): void {
    this.stun = 0;
    this.update(world);
  }

  // Цикл — по общему времени части, а не с появления на экране: иначе соседние лучи,
  // появившиеся в разное время, горят не в такт и «окна» между ними нет.
  protected update(world: World): void {
    this.t = world.frame + this.phase;
  }
}

/** Шар пушки: отскакивает от стен, пола, потолка и ящиков, как бильярдный; неуязвим (замер). */
export class CannonBall extends Enemy {
  constructor(at: Point, spawnId: number, dir: 1 | -1) {
    super('cannonBall', L.cannonBall.size, L.cannonBall.size, at, spawnId);
    this.vx = L.cannonBall.speed * dir;
    this.vy = L.cannonBall.speed;
  }

  override get invulnerable(): boolean {
    return true;
  }

  override blocked(_world: World): void {
    this.vx = -this.vx;
    this.vy = -this.vy;
  }

  protected update(world: World): void {
    const solids = world.solidsFor(this);
    const hits = () => world.grid.rectHitsSolid(this) || solids.some((r) => overlaps(r, this));
    this.x += this.vx;
    if (hits()) {
      this.x -= this.vx;
      this.vx = -this.vx;
    }
    this.y += this.vy;
    if (hits()) {
      this.y -= this.vy;
      this.vy = -this.vy;
    }
  }
}

/**
 * Пушка на потолочном рельсе (код 18): ездит туда-сюда в пределах ±15 px и стреляет шаром
 * в сторону героя. Пока её шар на экране, новый не вылетает (замер). Сбить — брошенным вверх
 * (или вперёд с уступа) ящиком.
 */
export class Cannon extends Enemy {
  private readonly homeX: number;
  private dir: 1 | -1 = 1;
  private reload: number = L.cannon.reloadFrames;
  private ball: CannonBall | null = null;

  constructor(at: Point, spawnId: number) {
    super('cannon', L.cannon.width, L.cannon.height, at, spawnId);
    this.homeX = this.x;
  }

  protected update(world: World): void {
    this.x += this.dir * L.cannon.speed;
    if (Math.abs(this.x - this.homeX) >= L.cannon.travel) this.dir = this.dir > 0 ? -1 : 1;
    if (this.ball && this.ball.alive) return;
    this.ball = null;
    if (--this.reload > 0) return;
    const p = world.nearestPlayer(this);
    if (!p) return;
    this.reload = L.cannon.reloadFrames;
    const cx = this.x + this.w / 2;
    this.facing = p.x + p.w / 2 >= cx ? 1 : -1;
    const s = L.cannonBall.size;
    this.ball = new CannonBall({ x: cx, y: this.y + this.h + s + 1 }, this.spawnId, this.facing);
    world.addEnemy(this.ball);
    world.emit({ type: 'sfx', name: 'throw' });
  }
}

/**
 * Засада (код 3A): крыса спит невидимой. Уехала к левому краю экрана (x ≤ 8, то есть герой
 * прошёл мимо) — просыпается и бежит за героем сзади вприпрыжку (замер). Пока спит — не ранит
 * и бросок её не берёт.
 */
export class AmbushRat extends Enemy {
  awake = false;

  constructor(at: Point, spawnId: number) {
    super('ambushRat', L.ambush.width, L.ambush.height, at, spawnId);
  }

  override get harmful(): boolean {
    return this.awake && super.harmful;
  }

  override get invulnerable(): boolean {
    return !this.awake;
  }

  override get hidden(): boolean {
    return !this.awake;
  }

  protected update(world: World): void {
    if (!this.awake) {
      if (this.x > world.camera.x + L.ambush.wakeX) return;
      this.awake = true;
      world.emit({ type: 'sfx', name: 'enemyHit' });
    }
    const p = world.nearestPlayer(this);
    if (p) this.facing = p.x + p.w / 2 >= this.x + this.w / 2 ? 1 : -1;
    this.vx = L.ambush.speed * this.facing;
    if (this.onGround) this.vy = L.ambush.hopVy;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    moveBody(this, world.grid, {
      solids: world.solidsFor(this),
      platforms: world.platformsFor(this),
    });
    if (this.y > world.grid.heightPx) this.alive = false;
  }
}
