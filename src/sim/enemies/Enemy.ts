import type { Facing, Point } from '../geom';
import type { Body } from '../physics';
import type { World } from '../World';

export type EnemyKind = 'bot' | 'asterisk' | 'barista';

let nextEnemyId = 1;

/** Обычный враг: гибнет от одного брошенного предмета, ранит при касании. */
export abstract class Enemy implements Body {
  readonly id = nextEnemyId++;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  onGround = false;
  facing: Facing = -1;
  alive = true;
  /** Оглушение «репликой дуэтом», кадры. */
  stun = 0;

  constructor(
    readonly kind: EnemyKind,
    readonly w: number,
    readonly h: number,
    /** Низ-центр. */
    at: Point,
    readonly spawnId: number,
  ) {
    this.x = at.x - w / 2;
    this.y = at.y - h;
  }

  /** Ранит ли касанием. */
  get harmful(): boolean {
    return this.alive && this.stun === 0;
  }

  /** Что происходит при касании игрока. По умолчанию — удар. */
  touchPlayerEffect(): 'hurt' | 'slow' {
    return 'hurt';
  }

  step(world: World): void {
    if (this.stun > 0) {
      this.stun--;
      return;
    }
    this.update(world);
  }

  protected abstract update(world: World): void;
}
