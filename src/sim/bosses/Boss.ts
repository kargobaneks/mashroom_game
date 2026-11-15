import type { Point, Rect } from '../geom';
import type { Projectile } from '../Projectile';
import type { Rng } from '../Rng';

/** То, что боссу нужно от мира. Узкий интерфейс — босса легко тестировать отдельно. */
export interface BossWorld {
  readonly rng: Rng;
  /** Центр ближайшего игрока, null — игроков нет. */
  target(from: Rect): Point | null;
  spawn(p: Projectile): void;
  emit(ev: { type: 'bossPhase' } | { type: 'bossDefeated' } | { type: 'sfx'; name: string }): void;
}

/** Общее у всех боссов: мир ведёт бой, сцена и HUD рисуют. */
export interface BossBase extends Rect {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly invuln: number;
  readonly timer: number;
  readonly defeated: boolean;
  /** Касание ранит игрока. */
  readonly harmful: boolean;
  /** Брошенный предмет наносит урон. */
  readonly vulnerable: boolean;
  /** Подаёт знак перед атакой. */
  readonly telegraphing: boolean;
  /** После победы уже стоит на полу (можно говорить). */
  readonly landed: boolean;
  /** Ждёт конца вступительной реплики. */
  readonly waiting: boolean;
  /** Летит (для покачивания спрайта). */
  readonly flying: boolean;
  begin(world: BossWorld): void;
  hit(world: BossWorld): boolean;
  update(world: BossWorld): void;
  /** Ветер, px/кадр по горизонтали, для тела (0 — безветрие). */
  windFor(body: Rect): number;
}
