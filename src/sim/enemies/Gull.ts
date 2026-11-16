import { ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.gull;

/**
 * Чайка-дрон: кружит вверху над точкой появления; раз в 2,5 с пикирует туда, где игрок стоял
 * 0,5 с назад (ТЗ), и возвращается наверх. Летит сквозь стены.
 */
export class Gull extends Enemy {
  state: 'circle' | 'dive' | 'return' = 'circle';
  private phase = 0;
  private timer: number = C.diveEveryFrames;
  private readonly home: Point;
  private target: Point = { x: 0, y: 0 };
  /** Где был игрок в последние кадры (центр). */
  private readonly trail: Point[] = [];

  constructor(at: Point, spawnId: number) {
    super('gull', C.width, C.height, at, spawnId);
    this.home = { x: at.x, y: at.y - C.height / 2 };
  }

  override get pose(): string | null {
    return this.state === 'dive' ? 'dive' : null;
  }

  private center(): Point {
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }

  private moveToward(p: Point, speed: number): boolean {
    const c = this.center();
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy);
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    if (d <= speed) {
      this.x = p.x - this.w / 2;
      this.y = p.y - this.h / 2;
      return true;
    }
    this.x += (dx / d) * speed;
    this.y += (dy / d) * speed;
    return false;
  }

  private circlePoint(): Point {
    return {
      x: this.home.x + Math.cos(this.phase) * C.radius,
      y: this.home.y + Math.sin(this.phase) * C.radius * 0.4,
    };
  }

  protected update(world: World): void {
    const p = world.nearestPlayer(this);
    if (p) {
      this.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 });
      if (this.trail.length > C.lagFrames) this.trail.shift();
    }
    switch (this.state) {
      case 'circle': {
        const before = this.center().x;
        this.phase += (Math.PI * 2) / C.circleFrames;
        const c = this.circlePoint();
        this.x = c.x - this.w / 2;
        this.y = c.y - this.h / 2;
        this.facing = c.x >= before ? 1 : -1;
        if (--this.timer <= 0 && p && this.trail.length >= C.lagFrames) {
          this.target = this.trail[0]!;
          this.state = 'dive';
        }
        return;
      }
      case 'dive':
        if (this.moveToward(this.target, C.diveSpeed)) this.state = 'return';
        return;
      case 'return':
        if (this.moveToward(this.circlePoint(), C.returnSpeed)) {
          this.state = 'circle';
          this.timer = C.diveEveryFrames;
        }
        return;
    }
  }
}
