import { FREEZER_ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { moveBody } from '../physics';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = FREEZER_ENEMIES.phone;

/**
 * Замороженный телефон-раскладушка (уровень 4, ТЗ): скользит по льду и отскакивает от стен.
 * С края платформы не разворачивается — соскальзывает вниз; от краёв экрана отскакивает. На месте фиолетового «на доске» оригинала.
 */
export class Phone extends Enemy {
  constructor(at: Point, spawnId: number) {
    super('phone', C.width, C.height, at, spawnId);
  }

  protected update(world: World): void {
    this.vx = C.speed * this.facing;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    const res = moveBody(this, world.grid, {
      solids: world.solidsFor(this),
      platforms: world.platformsFor(this),
    });
    // Стен в холодильнике мало — отскакивает и от краёв экрана, как шайба.
    const v = world.camera;
    const atEdge =
      (this.facing < 0 && this.x <= v.x) || (this.facing > 0 && this.x + this.w >= v.x + v.w);
    if (res.hitWall || atEdge) this.facing = this.facing > 0 ? -1 : 1;
  }
}
