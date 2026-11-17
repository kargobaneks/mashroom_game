import { CLOCK_ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import { Projectile } from '../Projectile';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = CLOCK_ENEMIES.mole;
const CYCLE = C.hiddenFrames + C.riseFrames + C.outFrames;

/**
 * Крот-дедлайн в каске (крот уровня часовой башни оригинала): стоит на уступе, прячется в каску,
 * высовывается и бросает два гаечных ключа дугой в сторону героя.
 */
export class Mole extends Enemy {
  private t: number;

  constructor(at: Point, spawnId: number) {
    super('mole', C.width, C.height, at, spawnId);
    // Только что появился — сначала сидит в каске.
    this.t = 0;
  }

  /** Сидит в каске: не ранит, бросок отскакивает. */
  get hiding(): boolean {
    return this.t < C.hiddenFrames;
  }

  override get harmful(): boolean {
    return super.harmful && !this.hiding;
  }

  override get invulnerable(): boolean {
    return this.hiding;
  }

  override get pose(): string | null {
    if (this.hiding) return 'hide';
    if (this.t < C.hiddenFrames + C.riseFrames) return 'peek';
    const out = this.t - C.hiddenFrames - C.riseFrames;
    return C.throwAt.some((a) => out >= a - 8 && out < a + 6) ? 'throw' : 'out';
  }

  protected update(world: World): void {
    this.t = (this.t + 1) % CYCLE;
    const p = world.nearestPlayer(this);
    if (!p) return;
    const cx = this.x + this.w / 2;
    this.facing = p.x + p.w / 2 >= cx ? 1 : -1;
    const out = this.t - C.hiddenFrames - C.riseFrames;
    if (!(C.throwAt as readonly number[]).includes(out)) return;
    if (Math.abs(p.x + p.w / 2 - cx) > C.range) return;
    world.projectiles.push(
      new Projectile(
        'wrench',
        cx + this.facing * 6,
        this.y + 4,
        C.wrenchSize,
        C.wrenchSize,
        C.wrenchVx * this.facing,
        C.wrenchVy,
        C.wrenchGravity,
      ),
    );
  }
}
