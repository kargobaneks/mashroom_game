import { ARCHIVE_ENEMIES } from '../../config/enemies';
import { ITEMS } from '../../config/physics';
import type { Point } from '../geom';
import { groundAhead, moveBody } from '../physics';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ARCHIVE_ENEMIES.candle;

/**
 * Свеча (по кадрам уровня 5 оригинала): ходит по полу и балкам, разворачивается у края и стены.
 * Потолочная (`candleCeil`) ходит вверх ногами под балкой (точка — под балкой, верх свечи — у её
 * низа); герой прошёл под ней — падает и дальше ходит по полу.
 */
export class Candle extends Enemy {
  ceiling: boolean;
  private t = 0;

  constructor(at: Point, spawnId: number, ceiling = false) {
    super(ceiling ? 'candleCeil' : 'candle', C.width, C.height, at, spawnId);
    this.ceiling = ceiling;
  }

  override get pose(): string | null {
    if (!this.ceiling) return null;
    return Math.floor(this.t / 10) % 2 === 0 ? 'ceil1' : 'ceil2';
  }

  protected update(world: World): void {
    this.t++;
    if (this.ceiling) {
      this.walkCeiling(world);
      return;
    }
    this.vx = C.speed * this.facing;
    this.vy = Math.min(this.vy + ITEMS.gravity, ITEMS.maxFallSpeed);
    const solids = world.solidsFor(this);
    const res = moveBody(this, world.grid, { solids, platforms: world.platformsFor(this) });
    if (res.hitWall || (this.onGround && !groundAhead(this, this.facing, world.grid, solids)))
      this.facing = this.facing > 0 ? -1 : 1;
  }

  /** Вверх ногами под балкой: до края балки и обратно; герой под ней — падает. */
  private walkCeiling(world: World): void {
    const T = world.grid.size;
    const cx = this.x + this.w / 2;
    const under = world.players.some(
      (p) => p.active && p.y > this.y && Math.abs(p.x + p.w / 2 - cx) <= C.dropDx,
    );
    if (under) {
      this.ceiling = false;
      this.vy = 0;
      return;
    }
    // Балка — ряд тайлов над верхом свечи (oneway-верх балки на ряд выше её низа).
    const row = Math.floor((this.y - 1) / T);
    const ahead = this.facing > 0 ? this.x + this.w + 1 : this.x - 1;
    const tx = Math.floor(ahead / T);
    const beam = (r: number) => world.grid.isOneway(tx, r) || world.grid.isSolid(tx, r);
    if (!beam(row) && !beam(row - 1)) this.facing = this.facing > 0 ? -1 : 1;
    else this.x += C.speed * this.facing;
  }
}
