import { SHCHELIN as C } from '../../config/balance';
import type { Facing, Point, Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/**
 * intro — ждёт конца реплики; ride — вступление: катается по полу сквозь края экрана;
 * move — едет к точке на другой стороне; wait — стоит на точке; bounce — подпрыгивает на месте
 * (знак); throw — бросает 3 шестерёнки; defeated — побеждён.
 */
export type ShchelinState = 'intro' | 'ride' | 'move' | 'wait' | 'bounce' | 'throw' | 'defeated';

/** Что Щелину нужно от мира сверх общего: есть ли на арене подбираемая шестерёнка. */
export interface ShchelinWorld extends BossWorld {
  gearsOnArena(): number;
}

type PointName = keyof typeof C.points;
const LEFT: readonly PointName[] = ['ledgeL', 'floorL'];
const RIGHT: readonly PointName[] = ['ledgeR', 'floorR'];

/**
 * Босс 6: Павел Щелин на моноцикле-шестерне (страус часовой башни оригинала). Вступление —
 * круги по полу; дальше от точки к точке на другой стороне (уступы и пол), на точке ждёт,
 * подпрыгивает и бросает очередь из трёх шестерёнок: первая падает на пол и лежит — её бросают
 * в него, остальные — снаряды. Бить только шестерёнкой. Дата на циферблате — фаза (ТЗ):
 * 1991 — шестерёнки летят назад, к нему; 2007 — замедление ×0,6; 2026 — ускорение ×1,3.
 */
export class Shchelin implements BossBase {
  readonly name = 'shchelin';
  readonly w: number = C.width;
  readonly h: number = C.height;
  x = 0;
  y = 0;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: ShchelinState = 'intro';
  timer = 0;
  invuln = 0;
  facing: Facing = -1;
  /** Где стоит / куда едет. */
  at: PointName = 'floorR';
  private from: Point = { x: 0, y: 0 };
  private to: Point = { x: 0, y: 0 };
  /** Доля пути 0..1 и форма дуги. */
  private u = 0;
  private arc: 'roll' | 'sag' | 'hop' = 'roll';
  /** Сколько шестерёнок уже брошено в очереди. */
  private thrown = 0;
  /** Колесо: угол поворота шестерни (для рисунка), растёт с пройденным путём. */
  wheel = 0;

  constructor(
    /** Арена (левый верх — начало координат точек). */
    readonly arena: Rect,
  ) {
    // Вступление начинается с левого края пола.
    this.place(this.p('floorL'));
  }

  // ——— геометрия ———

  private p(name: PointName): Point {
    const q = C.points[name];
    return { x: this.arena.x + q.x, y: this.arena.y + q.y };
  }

  private get floorY(): number {
    return this.arena.y + C.points.floorL.y;
  }

  private place(feet: Point): void {
    this.x = feet.x - this.w / 2;
    this.y = feet.y - this.h;
  }

  get feet(): Point {
    return { x: this.x + this.w / 2, y: this.y + this.h };
  }

  // ——— фазы ———

  get phase(): number {
    const lost = this.maxHp - this.hp;
    return C.phaseAtHits.filter((n) => lost >= n).length;
  }

  /** Год на циферблате. */
  get year(): number {
    return C.phases[Math.min(this.phase, C.phases.length - 1)]!.year;
  }

  private get factor(): number {
    return C.phases[Math.min(this.phase, C.phases.length - 1)]!.factor;
  }

  private frames(n: number): number {
    return Math.max(1, Math.round(n / this.factor));
  }

  // ——— BossBase ———

  get vulnerable(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated' && this.invuln === 0;
  }

  get harmful(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated';
  }

  get telegraphing(): boolean {
    return this.state === 'bounce';
  }

  get defeated(): boolean {
    return this.state === 'defeated';
  }

  get landed(): boolean {
    return this.defeated && this.y + this.h >= this.floorY;
  }

  get waiting(): boolean {
    return this.state === 'intro';
  }

  get flying(): boolean {
    return false;
  }

  windFor(_body: Rect): number {
    return 0;
  }

  begin(_world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.state = 'ride';
    this.timer = C.intro.frames;
    this.facing = 1;
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    const before = this.phase;
    this.hp -= 1;
    this.invuln = C.invulnFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.timer = 0;
      world.emit({ type: 'bossDefeated' });
    } else if (this.phase !== before) world.emit({ type: 'bossPhase' });
    return true;
  }

  /** Игрок погиб: как в оригинале, здоровье босса восстанавливается. */
  restore(): void {
    if (this.defeated) return;
    this.hp = this.maxHp;
  }

  update(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    switch (this.state) {
      case 'intro':
        return;
      case 'defeated': {
        // Съезжает на пол, если был на уступе.
        const rest = this.floorY - this.h;
        if (this.y < rest) this.y = Math.min(rest, this.y + 2);
        return;
      }
      case 'ride': {
        // Круги по полу 4 px/кадр: ушёл за правый край — появился слева.
        this.x += C.intro.speed;
        this.wheel += C.intro.speed;
        if (this.x > this.arena.x + this.arena.w) this.x = this.arena.x - this.w;
        this.y = this.floorY - this.h;
        if (--this.timer > 0) return;
        // Доезжает до правой точки пола и начинает бой.
        this.startMove('floorR', world);
        return;
      }
      case 'move': {
        const dist = Math.abs(this.to.x - this.from.x) || 1;
        const step = C.speed * this.factor;
        this.u = Math.min(1, this.u + step / dist);
        this.wheel += step;
        const u = this.u;
        const x = this.from.x + (this.to.x - this.from.x) * u;
        let y = this.from.y + (this.to.y - this.from.y) * u;
        if (this.arc === 'sag')
          y += 4 * (this.floorY - C.sagAboveFloor - this.from.y) * u * (1 - u);
        else if (this.arc === 'hop') y -= 4 * C.hopHeight * u * (1 - u);
        this.place({ x, y });
        if (this.u >= 1) {
          this.state = 'wait';
          this.timer = this.frames(world.rng.int(C.waitMin, C.waitMax));
          this.face(world);
        }
        return;
      }
      case 'wait':
        this.face(world);
        if (--this.timer <= 0) {
          this.state = 'bounce';
          this.timer = this.frames(C.bounce.frames);
        }
        return;
      case 'bounce': {
        // Подпрыгивает на месте: count раз за bounce.frames (знак перед броском).
        const total = this.frames(C.bounce.frames);
        const t = (total - this.timer) / total;
        const hop = Math.abs(Math.sin(t * Math.PI * C.bounce.count)) * C.bounce.height;
        this.place({ x: this.p(this.at).x, y: this.p(this.at).y - hop });
        if (--this.timer <= 0) {
          this.place(this.p(this.at));
          this.state = 'throw';
          this.thrown = 0;
          this.timer = 0;
        }
        return;
      }
      case 'throw': {
        if (this.timer > 0) {
          this.timer--;
          return;
        }
        this.throwGear(world);
        this.thrown++;
        this.timer = this.frames(C.throwInterval);
        if (this.thrown >= C.gearVx.length) {
          this.timer = this.frames(C.throwInterval);
          const side = LEFT.includes(this.at) ? RIGHT : LEFT;
          this.startMove(side[world.rng.int(0, side.length - 1)]!, world);
        }
        return;
      }
    }
  }

  /** Смотрит в сторону героя, а на точке у края — всегда к середине арены. */
  private face(world: BossWorld): void {
    const t = world.target(this);
    const mid = this.arena.x + this.arena.w / 2;
    const cx = this.x + this.w / 2;
    this.facing = t ? (t.x >= cx ? 1 : -1) : cx < mid ? 1 : -1;
  }

  private startMove(to: PointName, world: BossWorld): void {
    this.from = this.feet;
    this.to = this.p(to);
    this.at = to;
    this.u = 0;
    const fromFloor = Math.abs(this.from.y - this.floorY) < 1;
    const toFloor = to.startsWith('floor');
    this.arc = fromFloor && toFloor ? 'roll' : !fromFloor && !toFloor ? 'sag' : 'hop';
    this.facing = this.to.x >= this.from.x ? 1 : -1;
    this.state = 'move';
    void world;
  }

  /** Шестерёнка дугой к середине арены; первая в очереди (если на арене нет другой) — ляжет. */
  private throwGear(world: BossWorld): void {
    const sw = world as ShchelinWorld;
    const phase = C.phases[Math.min(this.phase, C.phases.length - 1)]!;
    const k = this.factor;
    const mid = this.arena.x + this.arena.w / 2;
    const dir = this.x + this.w / 2 < mid ? 1 : -1;
    const vx = C.gearVx[this.thrown]! * dir * k;
    const pr = new Projectile(
      'gear',
      this.x + this.w / 2 + dir * 8,
      this.y + 12,
      C.gearSize,
      C.gearSize,
      vx,
      C.gearVy * k,
      C.gearGravity * k * k,
    );
    const first = this.thrown === 0 && sw.gearsOnArena() === 0;
    pr.landsAsItem = first;
    // 1991: время идёт назад — шестерёнки тормозят и возвращаются к нему (кроме той, что ляжет).
    if (!first && phase.pullBack > 0) pr.ax = -dir * phase.pullBack * k * k;
    world.spawn(pr);
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }
}
