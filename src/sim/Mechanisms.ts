import { CLOCK_TOWER, FREEZER, FUTURE, MECHANISMS, MINE } from '../config/mechanisms';
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
  /** Кадров до начала подъёма после вентиля. */
  delay: number = MECHANISMS.flood.delayFrames;

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
    if (this.delay > 0) {
      this.delay--;
      return 0;
    }
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
  /** Молочник виден и твёрд с самого начала: лежит на дне раковины, вода его поднимет. */
  shown = true;

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

/** Состояние тающей платформы: стоит, тает (после касания), растаяла (ждёт возврата). */
export interface MeltTiming {
  readonly width: number;
  readonly height: number;
  /** Сколько держит после того, как встали. */
  readonly meltFrames: number;
  /** Сколько её нет (раскрыта), потом возвращается. */
  readonly goneFrames: number;
}

/** Складная платформа уровня 8: держит 120 кадров, раскрыта 40 (замер оригинала). */
export const FOLD_TIMING: MeltTiming = {
  width: FUTURE.fold.width,
  height: FUTURE.fold.height,
  meltFrames: FUTURE.fold.holdFrames,
  goneFrames: FUTURE.fold.openFrames,
};

export type MeltState = 'solid' | 'melting' | 'gone';

/**
 * Тающая платформа (уровень 4, ТЗ): замороженная вещь 2007 года. Встал — через 2 с растаяла,
 * через 4 с намёрзла снова. Стоит на месте; на неё встают сверху, снизу проходят насквозь.
 */
export class Melt extends MovingPlatform {
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  state: MeltState = 'solid';
  timer = 0;

  constructor(
    /** Низ-центр точки — верх платформы по центру. */
    cx: number,
    top: number,
    /** Что вморожено: рисунок ('fold' — складная платформа уровня 8). */
    readonly item: string,
    /** Размер и сроки: тающая вещь (уровень 4) или складная платформа (уровень 8). */
    readonly cfg: MeltTiming = FREEZER.melt,
  ) {
    super();
    this.w = cfg.width;
    this.h = cfg.height;
    this.x = cx - this.w / 2;
    this.y = top;
  }

  get active(): boolean {
    return this.state !== 'gone';
  }

  /** Доля «прочности», пока тает: 1 → 0. */
  get left(): number {
    return this.state === 'melting' ? this.timer / this.cfg.meltFrames : 1;
  }

  /** Шаг после игроков: кто-то встал — начинает таять; растаявшая отсчитывает возврат. */
  update(stood: boolean): void {
    if (this.state === 'solid') {
      if (stood) {
        this.state = 'melting';
        this.timer = this.cfg.meltFrames;
      }
    } else if (--this.timer <= 0) {
      if (this.state === 'melting') {
        this.state = 'gone';
        this.timer = this.cfg.goneFrames;
      } else {
        this.state = 'solid';
      }
    }
  }
}

/**
 * Платформа на цепи (уровень 6, по оригиналу): ездит по прямоугольной петле между шестернями
 * по часовой стрелке — левая сторона вверх, верх вправо, правая вниз, низ влево. Везёт стоящих;
 * встать можно только сверху. Путь — центр верха платформы.
 */
export class Chain extends MovingPlatform {
  x = 0;
  y = 0;
  readonly w = CLOCK_TOWER.chain.width;
  readonly h = CLOCK_TOWER.chain.height;
  /** Сдвиг по вертикали за последний шаг (для приземления на поднимающуюся платформу). */
  dy = 0;
  /** Пройденный путь по периметру от нижнего правого угла, px. */
  private s: number;

  constructor(
    /** Нижний правый угол пути. */
    readonly right: number,
    readonly bottom: number,
    readonly pathW: number,
    readonly pathH: number,
    /** Начальная фаза, доля оборота 0..1. */
    phase = 0,
  ) {
    super();
    this.s = phase * this.perimeter;
    this.place();
  }

  get active(): boolean {
    return true;
  }

  get perimeter(): number {
    return 2 * (this.pathW + this.pathH);
  }

  /** Точка пути (центр верха платформы) на расстоянии s от нижнего правого угла. */
  pointAt(s: number): { x: number; y: number } {
    const { pathW: W, pathH: H, right: R, bottom: B } = this;
    let d = ((s % this.perimeter) + this.perimeter) % this.perimeter;
    if (d < W) return { x: R - d, y: B }; // низ — влево
    d -= W;
    if (d < H) return { x: R - W, y: B - d }; // левая сторона — вверх
    d -= H;
    if (d < W) return { x: R - W + d, y: B - H }; // верх — вправо
    d -= W;
    return { x: R, y: B - H + d }; // правая сторона — вниз
  }

  private place(): void {
    const p = this.pointAt(this.s);
    this.x = p.x - this.w / 2;
    this.y = p.y;
  }

  move(riders: readonly Rider[]): void {
    const before = { x: this.x, y: this.y };
    this.s += CLOCK_TOWER.chain.speed;
    const p = this.pointAt(this.s);
    const nx = p.x - this.w / 2;
    this.x = before.x;
    this.y = before.y;
    this.dy = p.y - before.y;
    this.moveBy(nx - before.x, p.y - before.y, riders);
  }
}

export type CartState = 'parked' | 'rolling' | 'stopped';

/** Скорость по кнопкам: ← тормоз, → газ, ничего — обычная (замер оригинала). */
export function cartSpeed(left: boolean, right: boolean): number {
  if (left && !right) return MINE.cart.brake;
  if (right && !left) return MINE.cart.gas;
  return MINE.cart.coast;
}

/**
 * Вагонетка (уровень 7, по оригиналу): платформа, в которой стоит герой. Едет по рельсам-зонам,
 * на обрыве падает на нижний путь, у отбойника (`bumper`) останавливается.
 */
export class Cart extends MovingPlatform {
  x: number;
  y: number;
  readonly w = MINE.cart.width;
  readonly h = MINE.cart.height;
  vx = 0;
  vy = 0;
  onGround = false;
  state: CartState = 'parked';
  /** Кто едет (привязан к вагонетке, пока не выбит и не доехал). */
  rider: Rider | null = null;

  constructor(
    /** Низ-центр: точка на рельсе. */
    cx: number,
    bottom: number,
    private readonly rails: readonly Zone[],
    private readonly bumpers: readonly Zone[],
  ) {
    super();
    this.x = cx - this.w / 2;
    this.y = bottom - this.h;
  }

  get active(): boolean {
    return true;
  }

  /** Рычаг у переднего борта. */
  get lever(): Rect {
    return {
      x: this.x + this.w - MINE.cart.leverWidth,
      y: this.y - 20,
      w: MINE.cart.leverWidth,
      h: 20,
    };
  }

  /** Рельс под точкой x, верх которого не выше низа вагонетки (с допуском на шаг). */
  private railBelow(x: number, bottom: number): Zone | null {
    let best: Zone | null = null;
    for (const r of this.rails) {
      if (x < r.x || x >= r.x + r.w || r.y < bottom - 1) continue;
      if (!best || r.y < best.y) best = r;
    }
    return best;
  }

  /**
   * Шаг до игроков: ехать со скоростью speed (стоит — 0), падать, ложиться на рельс; стоящих
   * везти с собой. Возвращает true, если вагонетка только что упёрлась в отбойник.
   */
  step(speed: number, riders: readonly Rider[]): boolean {
    const on = riders.filter((r) => this.isRider(r));
    const before = { x: this.x, y: this.y };
    this.vx = this.state === 'rolling' ? speed : 0;
    let nx = this.x + this.vx;
    let stopped = false;
    if (this.state === 'rolling') {
      for (const b of this.bumpers) {
        if (this.x + this.w <= b.x && nx + this.w > b.x && this.y + this.h > b.y) {
          nx = b.x - this.w;
          stopped = true;
        }
      }
    }
    this.x = nx;
    // Колёса — по центру: рельс под ним держит; съехал с обрыва — падает на нижний путь.
    this.vy = Math.min(this.vy + MINE.cart.gravity, MINE.cart.maxFall);
    const bottom = this.y + this.h;
    const rail = this.railBelow(this.x + this.w / 2, bottom);
    if (rail && bottom + this.vy >= rail.y) {
      this.y = rail.y - this.h;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.y += this.vy;
      this.onGround = false;
    }
    if (stopped) this.state = 'stopped';
    const dx = this.x - before.x;
    const dy = this.y - before.y;
    for (const r of on) {
      r.x += dx;
      r.y += dy;
    }
    return stopped;
  }
}

export type CrusherState = 'rise' | 'top' | 'fall' | 'bottom';

/**
 * Давящий блок (уровень 8, по оригиналу): твёрдый, ходит по вертикали на 32 px — поднимается
 * 1 px/кадр, висит, падает 4 px/кадр, стоит на полу. На нём стоят (везёт), под поднятым проходят.
 * Точка — низ-центр опущенного блока (на полу).
 */
export class Crusher extends MovingPlatform {
  x: number;
  y: number;
  readonly w = FUTURE.crusher.width;
  readonly h = FUTURE.crusher.height;
  readonly bottomY: number;
  readonly topY: number;
  state: CrusherState;
  timer: number;
  /** Сдвиг по вертикали за последний шаг. */
  dy = 0;

  constructor(cx: number, floor: number, phase = 0) {
    super();
    const C = FUTURE.crusher;
    this.x = cx - this.w / 2;
    this.bottomY = floor - this.h;
    this.topY = this.bottomY - C.travel;
    this.y = this.bottomY;
    this.state = 'bottom';
    this.timer = C.holdBottom;
    // Сдвиг по фазе: прокрутить цикл на phase кадров (блоки на одном экране не в такт).
    for (let i = 0; i < phase; i++) this.move([]);
  }

  get active(): boolean {
    return true;
  }

  /** Падает: снизу опасно. */
  get falling(): boolean {
    return this.state === 'fall';
  }

  move(riders: readonly Rider[]): void {
    const C = FUTURE.crusher;
    let dy = 0;
    switch (this.state) {
      case 'bottom':
        if (--this.timer <= 0) this.state = 'rise';
        break;
      case 'rise':
        dy = -Math.min(C.riseSpeed, this.y - this.topY);
        if (this.y + dy <= this.topY) {
          this.state = 'top';
          this.timer = C.holdTop;
        }
        break;
      case 'top':
        if (--this.timer <= 0) this.state = 'fall';
        break;
      case 'fall':
        dy = Math.min(C.fallSpeed, this.bottomY - this.y);
        if (this.y + dy >= this.bottomY) {
          this.state = 'bottom';
          this.timer = C.holdBottom;
        }
        break;
    }
    this.dy = dy;
    if (dy !== 0) this.moveBy(0, dy, riders);
  }
}

/**
 * Магнит на цепи (уровень 8): висит под потолком. Поле — полоса под ним до пола: герой
 * с металлическим блоком в руках поднимается, пока блок не упрётся в магнит (ТЗ).
 */
export class Magnet implements Rect {
  readonly x: number;
  readonly y: number;
  readonly w = FUTURE.magnet.width;
  readonly h = FUTURE.magnet.height;
  /** Блок уже прилип. */
  holding = false;

  constructor(
    /** Низ-центр магнита. */
    cx: number,
    bottom: number,
  ) {
    this.x = cx - this.w / 2;
    this.y = bottom - this.h;
  }

  get bottom(): number {
    return this.y + this.h;
  }

  /** Центр по горизонтали попадает в поле магнита. */
  inField(cx: number): boolean {
    const half = FUTURE.magnet.fieldWidth / 2;
    const mid = this.x + this.w / 2;
    return cx >= mid - half && cx <= mid + half;
  }
}

/** Все механизмы части уровня. */
export interface Mechanisms {
  lifts: Lift[];
  melts: Melt[];
  chains: Chain[];
  carts: Cart[];
  crushers: Crusher[];
  magnets: Magnet[];
  floods: Flood[];
  floaters: Floater[];
  /** Зоны-триггеры: сработавшие — true. */
  triggers: { zone: Zone; fired: boolean }[];
}

export const rails = (level: LevelData): Zone[] => level.zones.filter((z) => z.kind === 'rail');
export const bumpers = (level: LevelData): Zone[] => level.zones.filter((z) => z.kind === 'bumper');

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
    melts: level.spawns
      .filter((s) => s.type === 'melt' || s.type === 'fold')
      .map((s) =>
        s.type === 'fold' ? new Melt(s.x, s.y, 'fold', FOLD_TIMING) : new Melt(s.x, s.y, s.kind),
      ),
    crushers: level.spawns
      .filter((s) => s.type === 'crusher')
      .map((s) => new Crusher(s.x, s.y, s.phase ?? 0)),
    magnets: level.spawns.filter((s) => s.type === 'magnet').map((s) => new Magnet(s.x, s.y)),
    carts: level.spawns
      .filter((s) => s.type === 'cart')
      .map((s) => new Cart(s.x, s.y, rails(level), bumpers(level))),
    chains: level.spawns
      .filter((s) => s.type === 'chain')
      .map((s) => new Chain(s.x, s.y, s.w ?? 24, s.h ?? 124, s.phase ?? 0)),
    floods,
    floaters,
    triggers: level.zones
      .filter((z) => z.kind === 'trigger')
      .map((zone) => ({ zone, fired: false })),
  };
}
