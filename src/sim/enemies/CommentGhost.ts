import { ARCHIVE_ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ARCHIVE_ENEMIES.commentGhost;

/**
 * Призрак удалённого комментария (ТЗ, уровень 5): медленно плывёт к ближайшему игроку сквозь
 * стены и пропадает на 1 с каждые 3 с — тогда не ранит, и брошенный предмет проходит насквозь.
 */
export class CommentGhost extends Enemy {
  private t = 0;

  constructor(at: Point, spawnId: number) {
    super('commentGhost', C.width, C.height, at, spawnId);
  }

  /** Пропал (последняя секунда цикла). */
  get gone(): boolean {
    return this.t % C.cycleFrames >= C.cycleFrames - C.goneFrames;
  }

  override get hidden(): boolean {
    return this.gone;
  }

  override get invulnerable(): boolean {
    return this.gone;
  }

  override get harmful(): boolean {
    return super.harmful && !this.gone;
  }

  protected update(world: World): void {
    this.t++;
    const p = world.nearestPlayer(this);
    if (!p) return;
    const dx = p.x + p.w / 2 - (this.x + this.w / 2);
    const dy = p.y + p.h / 2 - (this.y + this.h / 2);
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    this.facing = dx >= 0 ? 1 : -1;
    // Сквозь стены: тайлы не мешают.
    this.x += (dx / d) * C.speed;
    this.y += (dy / d) * C.speed;
  }
}
