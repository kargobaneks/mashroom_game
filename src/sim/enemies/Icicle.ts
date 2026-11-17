import { FREEZER_ENEMIES, LAIR_ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import { moveBody } from '../physics';
import type { World } from '../World';
import { Enemy } from './Enemy';

type IcicleConfig = typeof FREEZER_ENEMIES.icicle | typeof LAIR_ENEMIES.rubble;

export type IcicleState = 'hang' | 'shake' | 'fall' | 'regrow';

/**
 * Сосулька (уровень 4, ТЗ): висит под трубой; игрок прошёл под ней — дрожит 0,5 с и падает.
 * Неуязвима: предметы её не берут. Разбилась об пол, игрока или ящик-укрытие — через 3 с
 * нарастает на прежнем месте (как в оригинале, где сосульки капают снова).
 */
export class Icicle extends Enemy {
  state: IcicleState = 'hang';
  private timer = 0;
  private readonly homeY: number;

  private readonly C: IcicleConfig;

  /** rubble — обломок потолка при побеге (уровень 9): то же поведение, свой размер. */
  constructor(at: Point, spawnId: number, kind: 'icicle' | 'rubble' = 'icicle') {
    const C = kind === 'rubble' ? LAIR_ENEMIES.rubble : FREEZER_ENEMIES.icicle;
    super(kind, C.width, C.height, at, spawnId);
    this.C = C;
    this.homeY = this.y;
  }

  override get harmful(): boolean {
    return super.harmful && this.state !== 'regrow';
  }

  override get invulnerable(): boolean {
    return true;
  }

  override get hidden(): boolean {
    return this.state === 'regrow';
  }

  override get pose(): string | null {
    return this.state === 'shake' && this.timer % 4 < 2 ? 'shake' : null;
  }

  override blocked(world: World): void {
    this.shatter(world);
  }

  override touchedPlayer(world: World): void {
    if (this.state === 'fall') this.shatter(world);
  }

  protected update(world: World): void {
    const C = this.C;
    switch (this.state) {
      case 'hang': {
        const cx = this.x + this.w / 2;
        const below = world.players.some(
          (p) =>
            p.active &&
            p.state !== 'respawn' &&
            p.y > this.y &&
            Math.abs(p.x + p.w / 2 - cx) <= C.triggerDx,
        );
        if (below) {
          this.state = 'shake';
          this.timer = C.shakeFrames;
        }
        return;
      }
      case 'shake':
        if (--this.timer <= 0) {
          this.state = 'fall';
          this.vy = 0;
        }
        return;
      case 'fall': {
        this.vy = Math.min(this.vy + C.gravity, C.maxFallSpeed);
        const res = moveBody(this, world.grid, { platforms: world.platformsFor(this) });
        if (res.landed || this.y > world.camera.y + world.camera.h) this.shatter(world);
        return;
      }
      case 'regrow':
        if (--this.timer <= 0) {
          this.y = this.homeY;
          this.vy = 0;
          this.state = 'hang';
        }
        return;
    }
  }

  private shatter(world: World): void {
    if (this.state === 'regrow') return;
    this.state = 'regrow';
    this.timer = this.C.regrowFrames;
    this.vy = 0;
    world.emit({ type: 'sfx', name: 'deflect' });
  }
}
