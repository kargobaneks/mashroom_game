import { ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.headline;

/** Панический заголовок: быстро летит справа налево по синусоиде, сквозь стены. */
export class Headline extends Enemy {
  private phase = 0;
  private readonly baseY: number;

  constructor(at: Point, spawnId: number) {
    super('headline', C.width, C.height, at, spawnId);
    this.baseY = this.y;
  }

  protected update(_world: World): void {
    this.x -= C.speed;
    this.phase += C.frequency;
    this.y = this.baseY + Math.sin(this.phase) * C.amplitude;
  }
}
