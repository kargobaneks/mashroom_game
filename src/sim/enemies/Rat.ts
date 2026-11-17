import { CLOCK_ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { groundAhead, moveBody } from '../physics';
import { Projectile } from '../Projectile';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = CLOCK_ENEMIES.rat;

/**
 * Крыса-напоминалка (электрокрыса оригинала): бегает по полу и уступам, разворачивается у края;
 * раз в ~4,5 с встаёт и бьёт себя током — пока искрит, неуязвима, и по полу в обе стороны бегут
 * разряды. Бить — когда перестанет искрить.
 */
export class Rat extends Enemy {
  private timer: number = C.sparkEveryFrames;
  sparking = 0;

  constructor(at: Point, spawnId: number) {
    super('rat', C.width, C.height, at, spawnId);
  }

  override get invulnerable(): boolean {
    return this.sparking > 0;
  }

  override get pose(): string | null {
    if (this.sparking === 0) return null;
    return Math.floor(this.sparking / 4) % 2 === 0 ? 'spark1' : 'spark2';
  }

  protected update(world: World): void {
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    if (this.sparking > 0) {
      this.sparking--;
      this.vx = 0;
      moveBody(this, world.grid, { platforms: world.platformsFor(this) });
      return;
    }
    if (--this.timer <= 0 && this.onGround) {
      this.timer = C.sparkEveryFrames;
      this.sparking = C.sparkFrames;
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h - C.boltHeight / 2;
      for (const dir of [-1, 1])
        world.projectiles.push(
          new Projectile('bolt', cx, cy, C.boltWidth, C.boltHeight, C.boltSpeed * dir, 0),
        );
      world.emit({ type: 'sfx', name: 'deflect' });
      return;
    }
    this.vx = C.speed * this.facing;
    const solids = world.solidsFor(this);
    const res = moveBody(this, world.grid, { solids, platforms: world.platformsFor(this) });
    if (res.hitWall || (this.onGround && !groundAhead(this, this.facing, world.grid, solids)))
      this.facing = this.facing > 0 ? -1 : 1;
  }
}
