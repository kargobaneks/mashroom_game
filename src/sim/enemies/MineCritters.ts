import { MINE_ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { moveBody } from '../physics';
import { Projectile } from '../Projectile';
import type { World } from '../World';
import { Enemy } from './Enemy';

const PC = MINE_ENEMIES.porcupine;
const M = MINE_ENEMIES.moth;
const DM = MINE_ENEMIES.diveMoth;

/** Дикобраз: бегает по полкам и бочкам ~2,5 px/кадр, разворачивается к герою, спрыгивает с краёв. */
export class Porcupine extends Enemy {
  constructor(at: Point, spawnId: number) {
    super('porcupine', PC.width, PC.height, at, spawnId);
  }

  protected update(world: World): void {
    const p = world.nearestPlayer(this);
    // Разворачивается к герою, только стоя на опоре (в прыжке с края — летит дальше).
    if (p && this.onGround) {
      const dx = p.x + p.w / 2 - (this.x + this.w / 2);
      if (Math.abs(dx) > 8) this.facing = dx > 0 ? 1 : -1;
    }
    this.vx = PC.speed * this.facing;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    const res = moveBody(this, world.grid, {
      solids: world.solidsFor(this),
      platforms: world.platformsFor(this),
    });
    if (res.hitWall) this.facing = this.facing > 0 ? -1 : 1;
    if (this.y > world.grid.heightPx) this.alive = false;
  }
}

/** Моль: кружит по овалу 24×25 и раз в 100–200 кадров роняет снаряд вертикально вниз. */
export class Moth extends Enemy {
  private phase = 0;
  private timer: number;
  private readonly home: Point;

  constructor(at: Point, spawnId: number) {
    super('moth', M.width, M.height, at, spawnId);
    this.home = { x: at.x, y: at.y - M.height / 2 };
    this.timer = M.dropMin + ((spawnId * 37) % (M.dropMax - M.dropMin));
  }

  protected update(world: World): void {
    const before = this.x;
    this.phase += (Math.PI * 2) / M.circleFrames;
    this.x = this.home.x + Math.cos(this.phase) * M.radiusX - this.w / 2;
    this.y = this.home.y + Math.sin(this.phase) * M.radiusY - this.h / 2;
    this.facing = this.x >= before ? 1 : -1;
    if (--this.timer > 0) return;
    this.timer = world.rng.int(M.dropMin, M.dropMax);
    world.projectiles.push(
      new Projectile(
        'mothShot',
        this.x + this.w / 2,
        this.y + this.h,
        M.shotSize,
        M.shotSize,
        0,
        M.shotSpeed,
      ),
    );
  }
}

/** Моль-пикировщик: ждёт у потолка; герой близко — пикирует по диагонали, потом падает вниз. */
export class DiveMoth extends Enemy {
  state: 'wait' | 'dive' | 'fall' = 'wait';
  private dvx = 0;

  constructor(at: Point, spawnId: number) {
    super('diveMoth', DM.width, DM.height, at, spawnId);
  }

  override get pose(): string | null {
    return this.state === 'wait' ? null : 'dive';
  }

  protected update(world: World): void {
    const p = world.nearestPlayer(this);
    if (this.state === 'wait') {
      if (!p) return;
      const dx = p.x + p.w / 2 - (this.x + this.w / 2);
      if (Math.abs(dx) <= DM.triggerDx) {
        this.dvx = Math.sign(dx || 1) * DM.speed * Math.SQRT1_2;
        this.facing = dx >= 0 ? 1 : -1;
        this.state = 'dive';
      }
      return;
    }
    if (this.state === 'dive') {
      this.x += this.dvx;
      this.y += DM.speed * Math.SQRT1_2;
      // Поравнялся с героем по горизонтали — дальше вниз.
      if (p && Math.abs(p.x + p.w / 2 - (this.x + this.w / 2)) < 4) this.state = 'fall';
      return;
    }
    this.y += DM.fallSpeed;
    if (!world.camera.sees(this, 16)) this.alive = false;
  }
}
