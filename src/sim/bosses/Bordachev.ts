import { BORDACHEV as C, BOSS_RULES } from '../../config/balance';
import type { Point, Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/** Верх платформы, на которую можно встать: левый край, уровень, ширина. */
export interface Ledge {
  readonly x: number;
  readonly y: number;
  readonly w: number;
}

/** Что Бордачёву нужно от мира сверх общего: экран, кран роняет коробкуы. */
export interface BordachevWorld extends BossWorld {
  /** Экран (камера) в координатах мира. */
  readonly view: Rect;
  /** Ноги ближайшего игрока (низ-центр), null — игроков нет. */
  targetFeet(from: Rect): Point | null;
  /** Уронить коробку: низ-центр. */
  dropAmmo(at: Point): void;
  /** Сколько предметов для броска сейчас на экране. */
  ammoInView(): number;
  /** Хитбоксы героев в игре (дуга прыжка их обходит). */
  heroRects(): readonly Rect[];
}

/**
 * Кран «принуждение к миру»: крюк (с коробкой под ним, если несёт) проходит через экран
 * по горизонтали на высоте игрока и кладёт коробку перед ним. Героев не толкает и не ранит
 * (отзыв пользователя; в ТЗ толкал). Прямоугольник — крюк и коробка вместе, низ — чуть выше
 * ног игрока. warn — показался у края и мигает.
 */
export interface Crane extends Rect {
  x: number;
  y: number;
  h: number;
  readonly vx: number;
  phase: 'warn' | 'pass';
  timer: number;
  /** Несёт коробку; уронит его над серединой экрана. */
  carrying: boolean;
  readonly dropX: number;
}

/**
 * intro — ждёт конца реплики; stand — стоит на платформе (едет вверх вместе с ней);
 * telegraph — заносит руку с глобусом; recover — бросил, ещё стоит; jump — прыгает на другую
 * платформу; defeated — побеждён (долетает до платформы и стоит).
 */
export type BordachevState = 'intro' | 'stand' | 'telegraph' | 'recover' | 'jump' | 'defeated';

/**
 * Босс 3: Тимофей Бордачёв. Арена — шахта трюма, все платформы поднимаются (как арена уровня 3
 * оригинала). Он прыгает с платформы на платформу ближе к высоте игрока и бросает глобус дугой
 * в точку, где игрок стоит. Раз в 6 с кран «принуждение к миру» проходит через экран и приносит
 * коробку — ей и бить. 6 попаданий.
 */
export class Bordachev implements BossBase {
  readonly name = 'bordachev';
  readonly w = C.width;
  readonly h = C.height;
  x: number;
  y: number;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: BordachevState = 'intro';
  timer = 0;
  invuln = 0;
  /** Куда смотрит: 1 — вправо. */
  facing: 1 | -1 = -1;
  crane: Crane | null = null;
  private craneTimer: number = C.crane.everyFrames;
  /** Платформа под ногами (null — в прыжке). */
  private ledge: Ledge | null;
  private jumpFrom: Point = { x: 0, y: 0 };
  private jumpTo: Point = { x: 0, y: 0 };
  private jumpLedge: Ledge | null = null;
  private jumpT = 0;
  private readonly ledges: readonly Ledge[];

  constructor(
    /** Платформы шахты (все, во всю высоту карты). */
    ledges: readonly Ledge[],
    /** Где стоит в начале: низ-центр. */
    start: Point,
  ) {
    // Плафоны на стенах — ступеньки для героев; босс прыгает только по платформам.
    this.ledges = ledges.filter((l) => l.w >= C.minLedgeWidth);
    this.x = start.x - this.w / 2;
    this.y = start.y - this.h;
    this.ledge = this.ledgeUnder(start);
  }

  get defeated(): boolean {
    return this.state === 'defeated';
  }

  get waiting(): boolean {
    return this.state === 'intro';
  }

  get flying(): boolean {
    return false;
  }

  /** В прыжке (для кадра спрайта). */
  get airborne(): boolean {
    return this.ledge === null;
  }

  get landed(): boolean {
    return this.defeated && this.ledge !== null;
  }

  get harmful(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated';
  }

  get vulnerable(): boolean {
    return this.harmful && this.invuln === 0;
  }

  get telegraphing(): boolean {
    return this.state === 'telegraph';
  }

  windFor(_body: Rect): number {
    return 0;
  }

  get timingFactor(): number {
    return this.hp <= this.maxHp / 2 ? BOSS_RULES.halfHpTimingFactor : 1;
  }

  private scaled(frames: number): number {
    return Math.max(1, Math.round(frames * this.timingFactor));
  }

  begin(_world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.state = 'stand';
    this.timer = C.standFrames;
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    this.hp -= 1;
    this.invuln = BOSS_RULES.hitInvulnerableFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.crane = null;
      world.emit({ type: 'bossDefeated' });
    } else if (this.hp === Math.floor(this.maxHp / 2)) {
      world.emit({ type: 'bossPhase' });
    }
    return true;
  }

  /** Шахта бесконечная: мир сдвинулся по вертикали на dy. */
  shift(dy: number): void {
    this.y += dy;
    this.jumpFrom = { x: this.jumpFrom.x, y: this.jumpFrom.y + dy };
    this.jumpTo = { x: this.jumpTo.x, y: this.jumpTo.y + dy };
    if (this.ledge) this.ledge = this.ledgeAt(this.ledge.x, this.ledge.y + dy);
    if (this.jumpLedge) this.jumpLedge = this.ledgeAt(this.jumpLedge.x, this.jumpLedge.y + dy);
    if (this.crane) this.crane.y += dy;
  }

  update(world: BordachevWorld): void {
    if (this.invuln > 0) this.invuln--;
    if (this.state === 'intro') return;
    if (this.ledge === null) this.stepJump();
    if (this.state === 'defeated') {
      // Прыжок оборвался посреди пропасти — падает вниз до ближайшей платформы.
      if (this.ledge === null && this.jumpLedge === null) this.fall(world);
      return;
    }

    this.updateCrane(world);
    const target = world.target(this);
    if (target && this.ledge) this.facing = target.x < this.x + this.w / 2 ? -1 : 1;

    // Платформу унесло к верху экрана — прыгает ниже, что бы ни делал.
    if (this.ledge && this.y < world.view.y + C.topMargin) {
      this.startJump(world);
      return;
    }

    switch (this.state) {
      case 'stand':
        if (--this.timer <= 0) {
          this.state = 'telegraph';
          this.timer = Math.max(BOSS_RULES.minTelegraphFrames, this.scaled(C.telegraphFrames));
        }
        return;
      case 'telegraph':
        if (--this.timer <= 0) {
          this.throwGlobe(world);
          this.state = 'recover';
          this.timer = this.scaled(C.recoverFrames);
        }
        return;
      case 'recover':
        if (--this.timer <= 0) this.startJump(world);
        return;
      case 'jump':
        return;
    }
  }

  // ——— прыжки ———

  private feet(): Point {
    return { x: this.x + this.w / 2, y: this.y + this.h };
  }

  private ledgeAt(x: number, y: number): Ledge | null {
    return this.ledges.find((l) => l.x === x && Math.abs(l.y - y) < 0.5) ?? null;
  }

  private ledgeUnder(p: Point): Ledge | null {
    return (
      this.ledges.find((l) => p.x >= l.x && p.x < l.x + l.w && Math.abs(l.y - p.y) < 1) ?? null
    );
  }

  /**
   * Прыгнуть на платформу соседней колонны: в полосе экрана, ближе всего к высоте игрока,
   * но не на ту, где игрок стоит, и не по дуге сквозь героя.
   */
  private startJump(world: BordachevWorld): void {
    const v = world.view;
    const here = this.ledge;
    const feet = world.targetFeet(this);
    const band = C.landBand;
    const forced = this.y < v.y + C.topMargin;
    // Обычно — только на соседнюю колонну: через всю шахту не перелетает.
    const colOf = (l: Ledge) => Math.round((l.x - v.x) / (v.w / 3));
    const adjacent = (l: Ledge) =>
      l.x !== here?.x && (here === null || Math.abs(colOf(l) - colOf(here)) === 1);
    const notOnHero = (l: Ledge) =>
      !(feet && feet.x >= l.x && feet.x < l.x + l.w && Math.abs(feet.y - l.y) < 4);
    const inBand = (l: Ledge, top: number, bottom: number) =>
      l.y >= v.y + top && l.y <= v.y + bottom;
    const wide = (l: Ledge) => inBand(l, C.topMargin + this.h + 8, v.h - 8);
    const margin = this.w / 2 + 2;
    const from = this.feet();
    // Встаёт на ближний к себе край платформы: не нависает над героем и не пролетает сквозь колонну.
    const landX = (l: Ledge) => Math.min(l.x + l.w - margin, Math.max(l.x + margin, from.x));
    const heroes = world.heroRects();
    // Не прыгать сквозь героя: касание ранит, а от падающего сверху не увернуться.
    const safe = (l: Ledge) => !heroes.some((r) => this.arcHits(from, { x: landX(l), y: l.y }, r));
    // Сначала — лучший вариант; не нашлось, а платформу уносит за экран, — запасные.
    const tiers: ((l: Ledge) => boolean)[] = [
      (l) => adjacent(l) && inBand(l, band.top, band.bottom) && notOnHero(l) && safe(l),
      (l) => adjacent(l) && wide(l) && notOnHero(l) && safe(l),
    ];
    if (forced)
      tiers.push(
        (l) => l !== here && wide(l) && notOnHero(l) && safe(l),
        (l) => l !== here && wide(l),
      );
    const aimY = feet?.y ?? v.y + v.h / 2;
    let best: Ledge | null = null;
    for (const ok of tiers) {
      let bestScore = Infinity;
      for (const l of this.ledges) {
        if (!ok(l)) continue;
        const score = Math.abs(l.y - aimY) + world.rng.int(0, 24);
        if (score < bestScore) {
          bestScore = score;
          best = l;
        }
      }
      if (best) break;
    }
    if (!best) {
      this.state = 'stand';
      this.timer = C.standFrames;
      return;
    }
    const x = landX(best);
    this.jumpFrom = from;
    this.jumpTo = { x, y: best.y };
    this.jumpLedge = best;
    this.jumpT = 0;
    this.ledge = null;
    this.state = 'jump';
    this.facing = x < this.jumpFrom.x ? -1 : 1;
    world.emit({ type: 'sfx', name: 'jump' });
  }

  /** Точка дуги прыжка (ноги) при доле пути s. */
  private arcPoint(a: Point, b: Point, s: number): Point {
    const cy = Math.min(a.y, b.y) - 2 * C.jumpArc;
    return {
      x: a.x + (b.x - a.x) * s,
      y: (1 - s) * (1 - s) * a.y + 2 * s * (1 - s) * cy + s * s * b.y,
    };
  }

  /** Заденет ли дуга прыжка прямоугольник (с запасом). */
  private arcHits(a: Point, b: Point, r: Rect): boolean {
    const pad = 6;
    for (let i = 1; i <= 16; i++) {
      const f = this.arcPoint(a, b, i / 16);
      const body = {
        x: f.x - this.w / 2 - pad,
        y: f.y - this.h - pad,
        w: this.w + 2 * pad,
        h: this.h + 2 * pad,
      };
      if (
        body.x < r.x + r.w &&
        body.x + body.w > r.x &&
        body.y < r.y + r.h &&
        body.y + body.h > r.y
      )
        return true;
    }
    return false;
  }

  private stepJump(): void {
    if (this.jumpLedge === null) return;
    const n = this.scaled(C.jumpFrames);
    this.jumpT = Math.min(n, this.jumpT + 1);
    const s = this.jumpT / n;
    // Дуга: квадратичная кривая, вершина на jumpArc выше верхнего конца.
    const f = this.arcPoint(this.jumpFrom, this.jumpTo, s);
    this.x = f.x - this.w / 2;
    this.y = f.y - this.h;
    if (this.jumpT < n) return;
    this.ledge = this.jumpLedge;
    this.jumpLedge = null;
    if (this.state === 'jump') {
      this.state = 'stand';
      this.timer = this.scaled(C.standFrames);
    }
  }

  /** Побеждён без опоры: падает до платформы под собой. */
  private fall(world: BordachevWorld): void {
    const f = this.feet();
    const below = this.ledges
      .filter((l) => f.x >= l.x && f.x < l.x + l.w && l.y >= f.y)
      .sort((p, q) => p.y - q.y)[0];
    const bottom = world.view.y + world.view.h;
    if (!below || below.y > bottom) {
      // Под ним пропасть: становится на ближайшую видимую платформу.
      const near = this.ledges
        .filter((l) => l.y >= world.view.y + C.landBand.top && l.y <= bottom)
        .sort(
          (p, q) => Math.abs(p.x + p.w / 2 - f.x) - Math.abs(q.x + q.w / 2 - f.x) || p.y - q.y,
        )[0];
      if (!near) {
        this.ledge = { x: f.x - this.w / 2, y: f.y, w: this.w };
        return;
      }
      this.x = near.x + near.w / 2 - this.w / 2;
      this.y = Math.min(this.y, near.y - this.h);
      this.fall(world);
      return;
    }
    this.y = Math.min(below.y - this.h, this.y + C.freedFallSpeed);
    if (this.y + this.h >= below.y) this.ledge = below;
  }

  // ——— глобус ———

  /** Глобус летит дугой и падает туда, где герой стоял в момент броска: отойди — промахнётся. */
  private throwGlobe(world: BordachevWorld): void {
    const target = world.targetFeet(this);
    if (!target) return;
    const G = C.globe;
    const sx = this.x + this.w / 2 + this.facing * (this.w / 2);
    const sy = this.y + 8;
    const dx = target.x - sx;
    // Центр глобуса — на уровне груди героя.
    const dy = target.y - 12 - sy;
    const t = Math.min(G.maxFrames, Math.max(G.minFrames, Math.abs(dx) / G.speed));
    const vx = dx / t;
    const vy = (dy - 0.5 * G.gravity * t * t) / t;
    world.spawn(new Projectile('globe', sx, sy, G.size, G.size, vx, vy, G.gravity));
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  // ——— кран «принуждение к миру» ———

  /**
   * Платформа, на которую кран положит коробку: колонна героя (под ним или ближайшая), ярус
   * героя или ниже — но не у самого верха и не у низа экрана. Всегда настоящая платформа:
   * коробка никогда не падает в пропасть.
   */
  private dropLedge(feet: Point, view: Rect): Ledge | null {
    const K = C.crane;
    const top = view.y + K.minFromTop;
    const bottom = view.y + view.h - K.minFromBottom;
    const colX = (l: Ledge) => l.x + l.w / 2;
    const ok = this.ledges.filter((l) => l.y >= top && l.y <= bottom);
    if (ok.length === 0) return null;
    // Колонна героя: та, над которой он стоит, иначе ближайшая.
    const col = ok.reduce((best, l) =>
      Math.abs(colX(l) - feet.x) < Math.abs(colX(best) - feet.x) ? l : best,
    );
    const inCol = ok.filter((l) => l.x === col.x).sort((a, b) => a.y - b.y);
    // Ярус под ногами героя или ближайший ниже; если ниже нет — самый нижний подходящий.
    return inCol.find((l) => l.y >= feet.y - 2) ?? inCol[inCol.length - 1]!;
  }

  private updateCrane(world: BordachevWorld): void {
    const K = C.crane;
    const v = world.view;
    const c = this.crane;
    if (!c) {
      if (--this.craneTimer > 0) return;
      this.craneTimer = this.scaled(K.everyFrames);
      const feet = world.targetFeet(this);
      if (!feet) return;
      // Заходит с дальней от игрока стороны и кладёт коробку на его платформу перед ним.
      const fromLeft = feet.x >= v.x + v.w / 2;
      const carrying = world.ammoInView() < K.maxCases;
      const h = carrying ? K.h * 2 : K.h;
      // Крюк едет вверх вместе с шахтой — на высоте платформы, куда положит коробку.
      const ledge = this.dropLedge(feet, v);
      if (!ledge) return;
      const ahead = fromLeft ? -K.dropAhead : K.dropAhead;
      const dropX = Math.min(ledge.x + ledge.w - 8, Math.max(ledge.x + 8, feet.x + ahead));
      this.crane = {
        x: fromLeft ? v.x - K.w + 6 : v.x + v.w - 6,
        y: ledge.y - 2 - h,
        w: K.w,
        h,
        vx: fromLeft ? K.speed : -K.speed,
        phase: 'warn',
        timer: K.warnFrames,
        carrying,
        dropX,
      };
      world.emit({ type: 'sfx', name: 'trigger' });
      return;
    }
    if (c.phase === 'warn') {
      if (--c.timer <= 0) c.phase = 'pass';
      return;
    }
    const before = c.x + c.w / 2;
    c.x += c.vx;
    const after = c.x + c.w / 2;
    if (c.carrying && (before - c.dropX) * (after - c.dropX) <= 0) {
      // Коробка отцепилась: низ — над платформой (на 2 px выше), крюк остался вверху.
      c.carrying = false;
      world.dropAmmo({ x: c.dropX, y: c.y + c.h });
      c.h = K.h;
    }
    if (c.x > v.x + v.w + c.w || c.x + c.w < v.x - c.w) this.crane = null;
  }
}
