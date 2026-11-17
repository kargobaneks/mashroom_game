import { DUO as C } from '../../config/balance';
import type { Facing, Point, Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

export type DuoWho = 'sobolev' | 'luka';
type PointName = keyof typeof C.points;
const LEFT: readonly PointName[] = ['upperL', 'lowerL', 'floorL'];
const RIGHT: readonly PointName[] = ['upperR', 'lowerR', 'floorR'];

/** Один из двоих: где стоит, сколько осталось. */
export interface DuoMember {
  readonly who: DuoWho;
  hp: number;
  x: number;
  y: number;
  facing: Facing;
}

/**
 * intro — ждёт конца реплики; wait — стоит на точке; aim — поднял руку (знак); throw — бросает
 * залп карт; move — идёт / прыгает к другой точке; swap — меняются местами со вторым (тот встаёт
 * из-за стола, этот садится); defeated — оба побеждены.
 */
export type DuoState = 'intro' | 'wait' | 'aim' | 'throw' | 'move' | 'swap' | 'defeated';

/**
 * Босс 7: Николай Соболев и Лука Е*ков (ТЗ) по схеме кота-фокусника оригинала. Ходят по очереди:
 * один ходит по арене (уступы и пол, медленно, 1,5 px/кадр; между уступами одной стороны прыгает)
 * и бросает залпы по 2 карты почти горизонтально; второй сидит за карточным столом в центре
 * и неуязвим. Каждые 8 с меняются. Карта, долетевшая до пола, лежит (одна на арене) и через 1 с
 * её можно поднять и бросить. 4 + 4 попадания; погиб герой — у обоих снова полное здоровье.
 */
export class Duo implements BossBase {
  readonly name = 'duo';
  readonly w: number = C.width;
  readonly h: number = C.height;
  readonly maxHp: number = C.hpEach * 2;
  readonly members: [DuoMember, DuoMember];
  /** Кто сейчас ходит (0 — Соболев, 1 — Лука). */
  activeIdx: 0 | 1 = 0;
  state: DuoState = 'intro';
  timer = 0;
  invuln = 0;
  /** Где стоит / куда идёт тот, кто ходит. */
  at: PointName = 'upperR';
  private volleys = 0;
  private cards = 0;
  private swapTimer: number = C.swapFrames;
  /** Траектория: откуда, куда, доля пути, длительность, высота дуги. */
  private from: Point = { x: 0, y: 0 };
  private to: Point = { x: 0, y: 0 };
  private seatFrom: Point = { x: 0, y: 0 };
  private u = 0;
  private dur = 1;
  private arc = 0;

  constructor(readonly arena: Rect) {
    const up = this.p('upperR');
    const seat = this.seat;
    this.members = [
      { who: 'sobolev', hp: C.hpEach, x: up.x - C.width / 2, y: up.y - C.height, facing: -1 },
      { who: 'luka', hp: C.hpEach, x: seat.x - C.width / 2, y: seat.y - C.height, facing: -1 },
    ];
  }

  // ——— геометрия ———

  private p(name: PointName): Point {
    const q = C.points[name];
    return { x: this.arena.x + q.x, y: this.arena.y + q.y };
  }

  get seat(): Point {
    return { x: this.arena.x + C.seat.x, y: this.arena.y + C.seat.y };
  }

  private get floorY(): number {
    return this.arena.y + C.points.floorL.y;
  }

  get active(): DuoMember {
    return this.members[this.activeIdx];
  }

  get seated(): DuoMember {
    return this.members[this.activeIdx === 0 ? 1 : 0];
  }

  get x(): number {
    return this.active.x;
  }

  set x(v: number) {
    this.active.x = v;
  }

  get y(): number {
    return this.active.y;
  }

  set y(v: number) {
    this.active.y = v;
  }

  get hp(): number {
    return this.members[0].hp + this.members[1].hp;
  }

  private place(m: DuoMember, feet: Point): void {
    m.x = feet.x - this.w / 2;
    m.y = feet.y - this.h;
  }

  private feetOf(m: DuoMember): Point {
    return { x: m.x + this.w / 2, y: m.y + this.h };
  }

  // ——— BossBase ———

  get vulnerable(): boolean {
    return this.harmful && this.state !== 'swap' && this.invuln === 0;
  }

  get harmful(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated';
  }

  get telegraphing(): boolean {
    return this.state === 'aim';
  }

  get defeated(): boolean {
    return this.state === 'defeated';
  }

  get landed(): boolean {
    return this.defeated && this.active.y + this.h >= this.floorY;
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

  begin(world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.startWait(world);
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    const m = this.active;
    m.hp -= 1;
    this.invuln = C.invulnFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.timer = 0;
      world.emit({ type: 'bossDefeated' });
    } else if (m.hp <= 0) {
      // Этот выбыл — садится за стол, второй встаёт и дальше ходит один.
      world.emit({ type: 'bossPhase' });
      this.startSwap();
    }
    return true;
  }

  /** Погиб герой: как в оригинале — у обоих снова полное здоровье. */
  restore(): void {
    if (this.defeated) return;
    for (const m of this.members) m.hp = C.hpEach;
  }

  // ——— бой ———

  update(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    if (this.state === 'intro') return;
    if (this.state === 'defeated') {
      const m = this.active;
      const rest = this.floorY - this.h;
      if (m.y < rest) m.y = Math.min(rest, m.y + 2);
      return;
    }
    const both = this.members.every((m) => m.hp > 0);
    if (both && this.state !== 'swap') this.swapTimer--;
    this.face(world);
    switch (this.state) {
      case 'wait':
        if (--this.timer > 0) return;
        if (both && this.swapTimer <= 0) {
          this.startSwap();
          return;
        }
        if (this.volleys > 0) {
          this.state = 'aim';
          this.timer = C.aimFrames;
          this.cards = C.volleyCards;
        } else this.startMove(world);
        return;
      case 'aim':
        if (--this.timer > 0) return;
        this.state = 'throw';
        this.timer = 0;
        return;
      case 'throw':
        if (--this.timer > 0) return;
        this.throwCard(world);
        if (--this.cards > 0) {
          this.timer = C.cardInterval;
          return;
        }
        this.volleys--;
        this.state = 'wait';
        this.timer = world.rng.int(C.volleyGapMin, C.volleyGapMax);
        return;
      case 'move':
      case 'swap': {
        this.u = Math.min(1, this.u + 1 / this.dur);
        const u = this.u;
        const lift = 4 * this.arc * u * (1 - u);
        const a = this.active;
        this.place(a, {
          x: this.from.x + (this.to.x - this.from.x) * u,
          y: this.from.y + (this.to.y - this.from.y) * u - lift,
        });
        if (this.state === 'swap') {
          // Встающий из-за стола — к точке, садящийся — за стол (оба — дугой).
          const s = this.seated;
          const seat = this.seat;
          this.place(s, {
            x: this.seatFrom.x + (seat.x - this.seatFrom.x) * u,
            y: this.seatFrom.y + (seat.y - this.seatFrom.y) * u - lift,
          });
        }
        if (this.u >= 1) this.startWait(world);
        return;
      }
    }
  }

  private face(world: BossWorld): void {
    const t = world.target(this);
    for (const m of this.members) {
      if (m === this.active && (this.state === 'aim' || this.state === 'throw')) {
        m.facing = m.x + this.w / 2 < this.arena.x + this.arena.w / 2 ? 1 : -1;
        continue;
      }
      const cx = m.x + this.w / 2;
      m.facing = t ? (t.x >= cx ? 1 : -1) : cx < this.arena.x + this.arena.w / 2 ? 1 : -1;
    }
  }

  private startWait(world: BossWorld): void {
    this.state = 'wait';
    this.timer = world.rng.int(C.volleyGapMin / 2, C.volleyGapMax / 2);
    this.volleys = world.rng.int(C.volleysMin, C.volleysMax);
  }

  /** Следующая точка: чаще на своей стороне (прыжком), иногда — на другую (по полу или дугой). */
  private startMove(world: BossWorld): void {
    const left = LEFT.includes(this.at);
    const same = (left ? LEFT : RIGHT).filter((n) => n !== this.at);
    const other = left ? RIGHT : LEFT;
    const cross = world.rng.int(0, 1) === 1;
    const to = cross
      ? this.at.startsWith('floor')
        ? (other.find((n) => n.startsWith('floor')) as PointName)
        : other[world.rng.int(0, other.length - 1)]!
      : same[world.rng.int(0, same.length - 1)]!;
    this.from = this.feetOf(this.active);
    this.to = this.p(to);
    this.at = to;
    this.u = 0;
    const dx = Math.abs(this.to.x - this.from.x);
    const bothFloor = this.from.y === this.floorY && this.to.y === this.floorY;
    if (dx < 8) {
      this.dur = C.hopFrames;
      this.arc = C.hopHeight;
    } else {
      this.dur = Math.max(1, Math.round(dx / C.walkSpeed));
      this.arc = bothFloor ? 0 : C.arcHeight;
    }
    this.state = 'move';
  }

  private startSwap(): void {
    const leaving = this.feetOf(this.active);
    this.activeIdx = this.activeIdx === 0 ? 1 : 0;
    // Новый ходящий встаёт из-за стола и прыгает туда, где стоял прежний; прежний — за стол.
    this.from = this.feetOf(this.active);
    this.to = leaving;
    this.seatFrom = leaving;
    this.u = 0;
    this.dur = C.swapHopFrames;
    this.arc = C.arcHeight;
    this.state = 'swap';
    this.swapTimer = C.swapFrames;
  }

  /** Карта почти горизонтально к середине арены; с пола — чуть вниз (ляжет в ~80 px). */
  private throwCard(world: BossWorld): void {
    const a = this.active;
    const feet = this.feetOf(a);
    const onFloor = Math.abs(feet.y - this.floorY) < 1;
    const k = C.card;
    // Бросает от своего края к середине арены (за спиной — безопасно, как у Щелина).
    a.facing = feet.x < this.arena.x + this.arena.w / 2 ? 1 : -1;
    const pr = new Projectile(
      'card',
      feet.x + a.facing * 10,
      a.y + 16,
      k.width,
      k.height,
      k.vx * a.facing,
      onFloor ? k.floorVy : 0,
      k.gravity,
    );
    pr.landsAsItem = true;
    world.spawn(pr);
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }
}
