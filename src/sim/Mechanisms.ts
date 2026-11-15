import { MECHANISMS } from '../config/mechanisms';
import type { Rect } from './geom';
import { overlaps } from './geom';
import type { LevelData, Zone } from './level';
import type { Body } from './physics';

/**
 * Механизмы уровня (по частям 1-2 и 1-3 оригинала, со своими объектами):
 *  • помпа-лифт на бутылке сиропа: на неё прыгают несколько раз подряд, и она поднимается;
 *  • вентиль-триггер в раковине: открывает воду, вода поднимается, всплывает молочник-кораблик;
 *    упасть в воду — минус жизнь.
 * Движущиеся платформы везут всех, кто на них стоит.
 */

/** Кто может стоять на платформе. */
export interface Rider extends Body {
  readonly onGround: boolean;
}

const EPS = 1;

/** Платформа, на которую встают сверху; двигаясь, везёт стоящих на ней. */
export abstract class MovingPlatform implements Rect {
  abstract x: number;
  abstract y: number;
  abstract readonly w: number;
  abstract readonly h: number;
  /** Есть ли платформа сейчас (кораблик появляется только после триггера). */
  abstract get active(): boolean;

  isRider(b: Rider): boolean {
    return (
      b.onGround &&
      Math.abs(b.y + b.h - this.y) <= EPS &&
      b.x < this.x + this.w &&
      b.x + b.w > this.x
    );
  }

  /** Сдвинуть платформу и всех, кто на ней стоит. */
  moveBy(dx: number, dy: number, riders: readonly Rider[]): void {
    const on = riders.filter((r) => this.isRider(r));
    this.x += dx;
    this.y += dy;
    for (const r of on) {
      r.x += dx;
      r.y += dy;
    }
  }
}

/** Помпа-дозатор на бутылке сиропа: каждое приземление поднимает её на ступень. */
export class Lift extends MovingPlatform {
  x: number;
  y: number;
  readonly w = MECHANISMS.lift.width;
  readonly h = MECHANISMS.lift.height;
  readonly baseY: number;
  steps = 0;
  private stoodLast = new Set<Rider>();

  constructor(
    /** Низ-центр точки — верх бутылки, на котором помпа стоит. */
    cx: number,
    bottom: number,
    readonly maxSteps: number = MECHANISMS.lift.maxSteps,
  ) {
    super();
    this.x = cx - this.w / 2;
    this.y = bottom - this.h;
    this.baseY = this.y;
  }

  get active(): boolean {
    return true;
  }

  get targetY(): number {
    return this.baseY - this.steps * MECHANISMS.lift.stepPx;
  }

  /** Двигаться к цели; вызывается до шага игроков. */
  move(riders: readonly Rider[]): void {
    const d = this.targetY - this.y;
    if (d === 0) return;
    const dy = Math.sign(d) * Math.min(Math.abs(d), MECHANISMS.lift.speed);
    this.moveBy(0, dy, riders);
  }

  /** Посчитать приземления; вызывается после шага игроков. */
  countLandings(riders: readonly Rider[]): boolean {
    const now = new Set(riders.filter((r) => this.isRider(r)));
    let landed = false;
    for (const r of now) if (!this.stoodLast.has(r)) landed = true;
    this.stoodLast = now;
    if (landed && this.steps < this.maxSteps) {
      this.steps++;
      return true;
    }
    return false;
  }
}

/** Вода в раковине: после триггера поднимается от дна до верха зоны. Касание — минус жизнь. */
export class Flood implements Rect {
  readonly x: number;
  readonly w: number;
  /** Уровень воды (верх поверхности). */
  level: number;
  active = false;

  constructor(readonly zone: Zone) {
    this.x = zone.x;
    this.w = zone.w;
    this.level = zone.y + zone.h;
  }

  get y(): number {
    return this.level;
  }

  get h(): number {
    return this.zone.y + this.zone.h - this.level;
  }

  get full(): boolean {
    return this.level <= this.zone.y;
  }

  /** Насколько поднялась вода за шаг (для кораблика). */
  rise(): number {
    if (!this.active || this.full) return 0;
    const dy = Math.min(MECHANISMS.flood.riseSpeed, this.level - this.zone.y);
    this.level -= dy;
    return dy;
  }

  /** Тонет ли тело (заметно погрузилось). */
  drowns(b: Rect): boolean {
    return this.h > 0 && overlaps(b, this) && b.y + b.h > this.level + MECHANISMS.flood.drownDepth;
  }
}

/** Молочник-кораблик: всплывает, когда открыли воду, и держится на поверхности. */
export class Floater extends MovingPlatform {
  x: number;
  y: number;
  readonly w = MECHANISMS.floater.width;
  readonly h = MECHANISMS.floater.height;
  shown = false;

  constructor(
    cx: number,
    private readonly flood: Flood,
  ) {
    super();
    this.x = cx - this.w / 2;
    this.y = flood.level - this.h + MECHANISMS.floater.draft;
  }

  get active(): boolean {
    return this.shown;
  }

  follow(riders: readonly Rider[]): void {
    const target = this.flood.level - this.h + MECHANISMS.floater.draft;
    if (target !== this.y) this.moveBy(0, target - this.y, riders);
  }
}

/** Все механизмы части уровня. */
export interface Mechanisms {
  lifts: Lift[];
  floods: Flood[];
  floaters: Floater[];
  /** Зоны-триггеры: сработавшие — true. */
  triggers: { zone: Zone; fired: boolean }[];
}

export function buildMechanisms(level: LevelData): Mechanisms {
  const floods = level.zones.filter((z) => z.kind === 'flood').map((z) => new Flood(z));
  const floaters: Floater[] = [];
  for (const sp of level.spawns) {
    if (sp.type !== 'floater') continue;
    const flood = floods.find((f) => sp.x >= f.zone.x && sp.x < f.zone.x + f.zone.w);
    if (flood) floaters.push(new Floater(sp.x, flood));
  }
  return {
    lifts: level.spawns.filter((s) => s.type === 'lift').map((s) => new Lift(s.x, s.y)),
    floods,
    floaters,
    triggers: level.zones
      .filter((z) => z.kind === 'trigger')
      .map((zone) => ({ zone, fired: false })),
  };
}
