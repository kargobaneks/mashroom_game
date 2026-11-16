import { ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { groundAhead, moveBody } from '../physics';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.crab;

/**
 * Контейнерный краб: ходит боком по платформе, разворачивается у края и стены; каждые 2 с
 * замирает с поднятыми клешнями (ТЗ). Касание ранит всегда.
 */
export class Crab extends Enemy {
  private timer: number = C.walkFrames;
  clawsUp = false;

  constructor(at: Point, spawnId: number) {
    super('crab', C.width, C.height, at, spawnId);
  }

  override get pose(): string | null {
    return this.clawsUp ? 'claws' : null;
  }

  protected update(world: World): void {
    if (--this.timer <= 0) {
      this.clawsUp = !this.clawsUp;
      this.timer = this.clawsUp ? C.clawsFrames : C.walkFrames;
    }
    this.vx = this.clawsUp ? 0 : C.speed * this.facing;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    const solids = world.solidsFor(this);
    const res = moveBody(this, world.grid, { solids, platforms: world.platformsFor(this) });
    if (
      !this.clawsUp &&
      (res.hitWall || (this.onGround && !groundAhead(this, this.facing, world.grid, solids)))
    )
      this.facing = this.facing > 0 ? -1 : 1;
  }
}
