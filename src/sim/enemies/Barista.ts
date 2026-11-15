import { ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { groundAhead, moveBody } from '../physics';
import { Projectile } from '../Projectile';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.barista;

/** Бариста-бот: едет к игроку на колёсике и раз в 2 с брызгает каплей латте по дуге. */
export class Barista extends Enemy {
  private shotTimer: number = C.shotIntervalFrames;

  constructor(at: Point, spawnId: number) {
    super('barista', C.width, C.height, at, spawnId);
  }

  protected update(world: World): void {
    const target = world.nearestPlayer(this);
    if (target) this.facing = target.x + target.w / 2 >= this.x + this.w / 2 ? 1 : -1;
    const solids = world.solidsFor(this);
    const canGo = this.onGround ? groundAhead(this, this.facing, world.grid, solids) : true;
    this.vx = canGo ? C.speed * this.facing : 0;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    moveBody(this, world.grid, { solids, platforms: world.platformsFor(this) });

    if (--this.shotTimer <= 0) {
      this.shotTimer = C.shotIntervalFrames;
      world.projectiles.push(
        new Projectile(
          'latte',
          this.x + this.w / 2,
          this.y,
          C.dropSize,
          C.dropSize,
          C.dropVx * this.facing,
          C.dropVy,
          C.dropGravity,
        ),
      );
    }
  }
}
