import { ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import { Projectile } from '../Projectile';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.rigger;

/**
 * Бот-такелажник в люльке на блоке (как обезьяна в ведре на мачте в оригинале): ездит
 * вверх-вниз на канате и раз в 2 с кидает гайку дугой туда, где стоит игрок.
 */
export class Rigger extends Enemy {
  private readonly bottom: number;
  private dir: 1 | -1 = -1;
  private throwTimer: number = C.throwEveryFrames;
  /** Кадры позы броска. */
  private throwing = 0;
  /** Верх каната (точка подвеса): над верхней точкой хода. */
  readonly ropeTop: number;

  constructor(at: Point, spawnId: number) {
    super('rigger', C.width, C.height, at, spawnId);
    this.bottom = this.y;
    this.ropeTop = this.y - C.travel - 40;
  }

  override get pose(): string | null {
    return this.throwing > 0 ? 'throw' : null;
  }

  protected update(world: World): void {
    if (this.throwing > 0) this.throwing--;
    this.y += C.speed * this.dir;
    if (this.y <= this.bottom - C.travel) {
      this.y = this.bottom - C.travel;
      this.dir = 1;
    } else if (this.y >= this.bottom) {
      this.y = this.bottom;
      this.dir = -1;
    }
    const p = world.nearestPlayer(this);
    if (p) this.facing = p.x + p.w / 2 >= this.x + this.w / 2 ? 1 : -1;
    if (--this.throwTimer > 0 || !p) return;
    this.throwTimer = C.throwEveryFrames;
    this.throwing = 12;
    const sx = this.x + this.w / 2;
    const sy = this.y + 4;
    const t = C.nutFrames;
    const dx = p.x + p.w / 2 - sx;
    const dy = p.y + p.h / 2 - sy;
    world.projectiles.push(
      new Projectile(
        'nut',
        sx,
        sy,
        C.nutSize,
        C.nutSize,
        dx / t,
        (dy - 0.5 * C.nutGravity * t * t) / t,
        C.nutGravity,
      ),
    );
  }
}
