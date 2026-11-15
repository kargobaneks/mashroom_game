import type { Rect } from './geom';
import type { World } from './World';

export type ProjectileKind = 'latte' | 'stream' | 'paintball';

/** Снаряд врага или босса. Ранит игрока при касании, гаснет о стену или за экраном. */
export class Projectile implements Rect {
  alive = true;
  x: number;
  y: number;

  constructor(
    readonly kind: ProjectileKind,
    /** Центр. */
    cxStart: number,
    cyStart: number,
    readonly w: number,
    readonly h: number,
    public vx: number,
    public vy: number,
    readonly gravity = 0,
    /** Пробивает укрытие в ящике (кран, луч призрака — на следующих уровнях). */
    readonly ignoresHide = false,
  ) {
    this.x = cxStart - w / 2;
    this.y = cyStart - h / 2;
  }

  update(world: World): void {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    if (world.grid.rectHitsSolid(this) || !world.camera.sees(this, 16)) this.alive = false;
  }
}
