import { FUTURE_ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { groundAhead, moveBody } from '../physics';
import { Projectile } from '../Projectile';
import type { World } from '../World';
import { Enemy } from './Enemy';

const SR = FUTURE_ENEMIES.slingRat;
const MD = FUTURE_ENEMIES.mechDog;

/**
 * Крыса с рогаткой (уровень 8, по оригиналу): стоит на месте, смотрит на героя и раз в ~2 с
 * натягивает рогатку (знак) и стреляет камешком дугой в его сторону.
 */
export class SlingRat extends Enemy {
  private timer: number;

  constructor(at: Point, spawnId: number) {
    super('slingRat', SR.width, SR.height, at, spawnId);
    this.timer = SR.everyFrames / 2 + ((spawnId * 23) % 30);
  }

  override get pose(): string | null {
    return this.timer <= SR.aimFrames ? 'aim' : null;
  }

  protected update(world: World): void {
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    this.vx = 0;
    moveBody(this, world.grid, {
      solids: world.solidsFor(this),
      platforms: world.platformsFor(this),
    });
    if (this.y > world.grid.heightPx) this.alive = false;
    const p = world.nearestPlayer(this);
    if (!p) return;
    const cx = this.x + this.w / 2;
    const dx = p.x + p.w / 2 - cx;
    if (this.timer > SR.aimFrames) this.facing = dx >= 0 ? 1 : -1;
    if (--this.timer > 0) return;
    this.timer = SR.everyFrames;
    if (Math.abs(dx) > SR.range) return;
    world.projectiles.push(
      new Projectile(
        'pebble',
        cx + this.facing * 6,
        this.y + 4,
        SR.shotSize,
        SR.shotSize,
        SR.shotVx * this.facing,
        SR.shotVy,
        SR.gravity,
      ),
    );
    world.emit({ type: 'sfx', name: 'throw' });
  }
}

/**
 * Механический пёс на колёсах (уровень 8, по оригиналу): катается по своей платформе, не
 * съезжает с края; герой рядом и примерно на той же высоте — гонится за ним быстрее.
 */
export class MechDog extends Enemy {
  constructor(at: Point, spawnId: number) {
    super('mechDog', MD.width, MD.height, at, spawnId);
  }

  /** Гонится (для рисунка — уши торчком). */
  chasing = false;

  override get pose(): string | null {
    return null;
  }

  protected update(world: World): void {
    const p = world.nearestPlayer(this);
    const cx = this.x + this.w / 2;
    this.chasing = false;
    if (p && this.onGround) {
      const dx = p.x + p.w / 2 - cx;
      const dy = p.y + p.h - (this.y + this.h);
      if (Math.abs(dx) <= MD.chaseDx && Math.abs(dy) <= MD.chaseDy) {
        this.chasing = true;
        if (Math.abs(dx) > 4) this.facing = dx > 0 ? 1 : -1;
      }
    }
    this.vx = (this.chasing ? MD.chaseSpeed : MD.speed) * this.facing;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    const solids = world.solidsFor(this);
    const platforms = world.platformsFor(this);
    // Не съезжает со своей платформы: у края — стоп (гонится) или разворот (катается).
    if (this.onGround && !groundAhead(this, this.facing, world.grid, [...solids, ...platforms])) {
      if (!this.chasing) this.facing = this.facing > 0 ? -1 : 1;
      this.vx = 0;
    }
    const res = moveBody(this, world.grid, { solids, platforms });
    if (res.hitWall && !this.chasing) this.facing = this.facing > 0 ? -1 : 1;
    if (this.y > world.grid.heightPx) this.alive = false;
  }
}
