import { AGRANOVICH as C, BOSS_RULES } from '../../config/balance';
import type { Point, Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { Rng } from '../Rng';

/**
 * intro — ждёт конца реплики при входе на арену; fly — перелетает к точке (неуязвима);
 * hover — стоит, в конце подаёт знак; shoot — выстрел (один кадр); recover — стоит после выстрела;
 * defeated — побеждена.
 */
export type AgranovichState = 'intro' | 'fly' | 'hover' | 'shoot' | 'recover' | 'defeated';

/** То, что боссу нужно от мира. Узкий интерфейс — босса легко тестировать отдельно. */
export interface BossWorld {
  readonly rng: Rng;
  /** Центр ближайшего игрока, null — игроков нет. */
  target(from: Rect): Point | null;
  spawn(p: Projectile): void;
  emit(ev: { type: 'bossPhase' } | { type: 'bossDefeated' } | { type: 'sfx'; name: string }): void;
}

/**
 * Босс 1: Екатерина Агранович. Перелетает между 4 точками, останавливается на 1 с и стреляет
 * веером струй латте в сторону игрока. Струи не летят выше её точки — держаться выше безопасно.
 * После 3 попаданий — вторая фаза: 5 пейнтбольных шариков. 6 попаданий.
 */
export class Agranovich implements Rect {
  readonly w = C.width;
  readonly h = C.height;
  x: number;
  y: number;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: AgranovichState = 'intro';
  timer = 0;
  invuln = 0;
  phase: 1 | 2 = 1;
  /** Сколько шариков осталось в очереди (вторая фаза). */
  volleyLeft = 0;
  /** Куда летит вся очередь: положение игрока в её начале. */
  private volleyTarget: Point | null = null;
  private pointIndex = 0;

  /** points — центры точек зависания, в координатах уровня. */
  constructor(readonly points: readonly Point[]) {
    if (points.length < 2) throw new Error('Agranovich needs at least 2 points');
    const p = points[0]!;
    this.x = p.x - this.w / 2;
    this.y = p.y - this.h / 2;
  }

  readonly name = 'agranovich';

  /** Где она встанет, когда придёт в себя: на уровне пола под самой низкой точкой. */
  get restY(): number {
    return Math.max(...this.points.map((p) => p.y)) + C.freedRestBelowLowestPoint;
  }

  /** Стоит ли уже на полу после победы. */
  get landed(): boolean {
    return this.defeated && this.y >= this.restY - this.h;
  }

  /** Бить можно, только когда стоит. */
  get vulnerable(): boolean {
    return (
      (this.state === 'hover' || this.state === 'shoot' || this.state === 'recover') &&
      this.invuln === 0
    );
  }

  /** Подаёт знак перед выстрелом. */
  get telegraphing(): boolean {
    return this.state === 'hover' && this.timer <= this.scaled(C.telegraphFrames);
  }

  get defeated(): boolean {
    return this.state === 'defeated';
  }

  /** Касание ранит игрока. */
  get harmful(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated';
  }

  /** Множитель таймингов: на половине жизни всё быстрее на 25%. */
  get timingFactor(): number {
    return this.hp <= this.maxHp / 2 ? BOSS_RULES.halfHpTimingFactor : 1;
  }

  private scaled(frames: number): number {
    return Math.max(1, Math.round(frames * this.timingFactor));
  }

  /** Конец вступительной реплики — начинаем бой. */
  begin(world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.flyToNext(world);
  }

  /** Попадание брошенным предметом. true — урон прошёл. */
  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    this.hp -= 1;
    this.invuln = BOSS_RULES.hitInvulnerableFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      world.emit({ type: 'bossDefeated' });
    } else if (this.phase === 1 && this.maxHp - this.hp >= C.phase2AfterHits) {
      this.phase = 2;
      world.emit({ type: 'bossPhase' });
    }
    return true;
  }

  update(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    switch (this.state) {
      case 'intro':
        return;
      case 'defeated': {
        // Приведена в чувство: заглушка слетела, она плавно опускается на пол и остаётся с героями.
        const restY = this.restY - this.h;
        if (this.y < restY) this.y = Math.min(restY, this.y + C.freedDescendSpeed);
        return;
      }
      case 'fly': {
        const p = this.points[this.pointIndex]!;
        const dx = p.x - (this.x + this.w / 2);
        const dy = p.y - (this.y + this.h / 2);
        const dist = Math.hypot(dx, dy);
        const speed = C.flySpeed / this.timingFactor;
        if (dist <= speed) {
          this.x = p.x - this.w / 2;
          this.y = p.y - this.h / 2;
          this.state = 'hover';
          this.timer = this.scaled(C.hoverFrames);
        } else {
          this.x += (dx / dist) * speed;
          this.y += (dy / dist) * speed;
        }
        return;
      }
      case 'hover':
        if (--this.timer <= 0) {
          this.state = 'shoot';
          this.volleyLeft = C.paintballs.count;
          this.timer = 0;
          // Очередь целится туда, где игрок сейчас, — и больше не следит за ним.
          this.volleyTarget = world.target(this);
        }
        return;
      case 'shoot':
        if (this.phase === 1) {
          this.shootFan(world);
          this.endShooting();
        } else if (--this.timer <= 0) {
          // Очередь: по шарику с интервалом, каждый — туда, где игрок сейчас.
          this.shootAt(world, 'paintball', C.paintballs);
          this.volleyLeft--;
          this.timer = C.paintballs.intervalFrames;
          if (this.volleyLeft <= 0) this.endShooting();
        }
        return;
      case 'recover':
        if (--this.timer <= 0) this.flyToNext(world);
        return;
    }
  }

  /** Следующая точка — любая другая из четырёх (ТЗ: «перелетает между 4 точками арены»). */
  private flyToNext(world: BossWorld): void {
    const n = this.points.length;
    this.pointIndex = (this.pointIndex + world.rng.int(1, n - 1)) % n;
    this.state = 'fly';
  }

  /** Выстрел в сторону игрока. Ни один снаряд не летит вверх. */
  private endShooting(): void {
    this.state = 'recover';
    this.timer = this.scaled(C.recoverFrames);
  }

  /** Направление на цель (по умолчанию — игрок); вверх не стреляет — такие летят горизонтально. */
  private aim(
    world: BossWorld,
    offset = 0,
    at: Point | null = world.target(this),
  ): { vx: number; vy: number } {
    const ox = this.x + this.w / 2;
    const oy = this.y + this.h / 2;
    const t = at;
    const a = (t ? Math.atan2(t.y - oy, t.x - ox) : Math.PI / 2) + offset;
    let vx = Math.cos(a);
    let vy = Math.sin(a);
    if (vy < 0) {
      vy = 0;
      vx = vx >= 0 ? 1 : -1;
    }
    return { vx, vy };
  }

  /** Первая фаза: веер из трёх струй латте в сторону игрока. */
  private shootFan(world: BossWorld): void {
    const s = C.streams;
    const mid = (s.count - 1) / 2;
    for (let i = 0; i < s.count; i++) {
      const d = this.aim(world, (i - mid) * s.spreadRad);
      world.spawn(
        new Projectile(
          'stream',
          this.x + this.w / 2,
          this.y + this.h / 2,
          s.size,
          s.size,
          d.vx * s.speed,
          d.vy * s.speed,
        ),
      );
    }
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Один выстрел очереди — в точку, запомненную в начале очереди. */
  private shootAt(world: BossWorld, kind: 'paintball', cfg: { speed: number; size: number }): void {
    const d = this.aim(world, 0, this.volleyTarget);
    world.spawn(
      new Projectile(
        kind,
        this.x + this.w / 2,
        this.y + this.h / 2,
        cfg.size,
        cfg.size,
        d.vx * cfg.speed,
        d.vy * cfg.speed,
      ),
    );
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }
}
