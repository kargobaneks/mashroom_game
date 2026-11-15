import { ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { groundAhead, moveBody } from '../physics';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.bot;

/** Бот-комментатор: ходит влево-вправо по платформе, разворачивается у края и стены. */
export class Bot extends Enemy {
  constructor(at: Point, spawnId: number) {
    super('bot', C.width, C.height, at, spawnId);
  }

  protected update(world: World): void {
    this.vx = C.speed * this.facing;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    const solids = world.solidsFor(this);
    const res = moveBody(this, world.grid, { solids, platforms: world.platformsFor(this) });
    if (res.hitWall || (this.onGround && !groundAhead(this, this.facing, world.grid, solids))) {
      this.facing = this.facing > 0 ? -1 : 1;
    }
  }
}
