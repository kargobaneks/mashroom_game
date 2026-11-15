import { ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.asterisk;

/** Звёздочка-сноска: летит к игроку по синусоиде сквозь стены. Не ранит — прилипает и замедляет. */
export class Asterisk extends Enemy {
  private phase = 0;
  private baseY: number;

  constructor(at: Point, spawnId: number) {
    super('asterisk', C.width, C.height, at, spawnId);
    this.baseY = this.y;
  }

  override touchPlayerEffect(): 'slow' {
    return 'slow';
  }

  protected update(world: World): void {
    const target = world.nearestPlayer(this);
    if (target) {
      const tx = target.x + target.w / 2 - this.w / 2;
      const ty = target.y + target.h / 2 - this.h / 2;
      this.x += Math.sign(tx - this.x) * Math.min(C.speed, Math.abs(tx - this.x));
      this.baseY +=
        Math.sign(ty - this.baseY) * Math.min(C.followYSpeed, Math.abs(ty - this.baseY));
      this.facing = tx >= this.x ? 1 : -1;
    }
    this.phase += C.frequency;
    this.y = this.baseY + Math.sin(this.phase) * C.amplitude;
  }
}
