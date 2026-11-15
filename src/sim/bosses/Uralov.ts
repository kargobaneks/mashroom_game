import { BOSS_RULES, URALOV as C } from '../../config/balance';
import type { Point, Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/**
 * intro — ждёт конца реплики; enter — летит к центру восьмёрки; loop — восьмёрка, сбрасывает
 * заголовки; toWall — летит к стене; telegraph — раскрыл крылья (знак); gust — машет крыльями,
 * ветер сдувает героев от него, по ветру летят заголовки; defeated — побеждён.
 */
export type UralovState = 'intro' | 'enter' | 'loop' | 'toWall' | 'telegraph' | 'gust' | 'defeated';

/**
 * Босс 2: Семён Уралов. Летает восьмёркой над серверной и раз в 3 с сбрасывает 2 панических
 * заголовка (ТЗ). Между облётами садится у стены и машет крыльями, как босс уровня 2 оригинала:
 * героев сдувает к другой стене, по ветру летят заголовки. Бить — броском (вверх), в коопе —
 * и брошенным напарником. 6 попаданий.
 */
export class Uralov implements BossBase {
  readonly name = 'uralov';
  readonly w = C.width;
  readonly h = C.height;
  x: number;
  y: number;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: UralovState = 'intro';
  timer = 0;
  invuln = 0;
  /** Фаза восьмёрки, радианы. */
  private t = 0;
  private loopsDone = 0;
  private dropTimer: number = C.dropEveryFrames;
  /** С какой стороны дует: -1 — от левой стены вправо, 1 — от правой влево. */
  side: -1 | 1 = 1;
  /** Кадры с начала порыва (для взмахов крыльев). */
  flapClock = 0;

  constructor(
    /** Арена (зафиксированный экран). */
    readonly arena: Rect,
    /** Уровень пола арены: сюда он опустится после победы. */
    readonly floorY: number,
  ) {
    const s = this.loopPoint(0);
    this.x = s.x - this.w / 2;
    this.y = arena.y + 24;
  }

  get defeated(): boolean {
    return this.state === 'defeated';
  }

  get waiting(): boolean {
    return this.state === 'intro';
  }

  get flying(): boolean {
    return this.state !== 'gust' && this.state !== 'telegraph' && this.state !== 'defeated';
  }

  get landed(): boolean {
    return this.defeated && this.y >= this.floorY - this.h;
  }

  get harmful(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated';
  }

  /** Бить можно всегда, пока он в бою (по ТЗ — броском вверх), кроме неуязвимости после удара. */
  get vulnerable(): boolean {
    return this.harmful && this.invuln === 0;
  }

  get telegraphing(): boolean {
    return this.state === 'telegraph';
  }

  /** Крылья вниз (кадр взмаха). */
  get wingsDown(): boolean {
    if (this.state === 'gust' || this.state === 'telegraph')
      return Math.floor(this.flapClock / C.flapFrames) % 2 === 1;
    return Math.floor(this.flapClock / (C.flapFrames * 2)) % 2 === 1;
  }

  get timingFactor(): number {
    return this.hp <= this.maxHp / 2 ? BOSS_RULES.halfHpTimingFactor : 1;
  }

  private scaled(frames: number): number {
    return Math.max(1, Math.round(frames * this.timingFactor));
  }

  /** Центр восьмёрки при фазе t: лежачая восьмёрка, пересечение — в центре арены. */
  loopPoint(t: number): Point {
    const L = C.loop;
    return {
      x: this.arena.x + L.cx + L.rx * Math.sin(t),
      y: this.arena.y + L.cy + L.ry * Math.sin(2 * t),
    };
  }

  private gustPoint(): Point {
    const G = C.gustPoint;
    return {
      x: this.side < 0 ? this.arena.x + G.fromWall : this.arena.x + this.arena.w - G.fromWall,
      y: this.arena.y + G.y,
    };
  }

  begin(_world: BossWorld): void {
    if (this.state === 'intro') this.state = 'enter';
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    this.hp -= 1;
    this.invuln = BOSS_RULES.hitInvulnerableFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      world.emit({ type: 'bossDefeated' });
    } else if (this.hp === Math.floor(this.maxHp / 2)) {
      world.emit({ type: 'bossPhase' });
    }
    return true;
  }

  /** Ветер от него: толкает тела в арене прочь, пока он машет крыльями. */
  windFor(body: Rect): number {
    if (this.state !== 'gust') return 0;
    const bx = body.x + body.w / 2;
    if (bx < this.arena.x || bx > this.arena.x + this.arena.w) return 0;
    return -this.side * C.gustPush;
  }

  update(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    this.flapClock++;
    switch (this.state) {
      case 'intro':
        return;
      case 'defeated': {
        // Приведён в чувство: опускается на пол.
        const restY = this.floorY - this.h;
        if (this.y < restY) this.y = Math.min(restY, this.y + C.freedDescendSpeed);
        return;
      }
      case 'enter':
        if (this.flyTo(this.loopPoint(this.t))) this.state = 'loop';
        return;
      case 'loop': {
        this.t += (Math.PI * 2) / (C.loop.periodFrames * this.timingFactor);
        this.placeCenter(this.loopPoint(this.t));
        this.tickDrops(world);
        if (this.t >= Math.PI * 2 * (this.loopsDone + C.loopsBeforeGust)) {
          this.loopsDone += C.loopsBeforeGust;
          // Дует от той стены, что дальше от игрока, — чтобы ветер толкал к нему, а не в угол.
          const target = world.target(this);
          const mid = this.arena.x + this.arena.w / 2;
          this.side = target && target.x > mid ? -1 : 1;
          this.state = 'toWall';
        }
        return;
      }
      case 'toWall':
        this.tickDrops(world);
        if (this.flyTo(this.gustPoint())) {
          this.state = 'telegraph';
          this.timer = Math.max(BOSS_RULES.minTelegraphFrames, this.scaled(C.gustTelegraphFrames));
          this.flapClock = 0;
          world.emit({ type: 'sfx', name: 'bossShoot' });
        }
        return;
      case 'telegraph':
        if (--this.timer <= 0) {
          this.state = 'gust';
          this.timer = C.gustFrames;
          this.flapClock = 0;
        }
        return;
      case 'gust': {
        const every = this.scaled(C.gustHeadlines.everyFrames);
        if ((C.gustFrames - this.timer) % every === every - 1) this.blowHeadline(world);
        if (--this.timer <= 0) {
          this.state = 'enter';
          this.dropTimer = this.scaled(C.dropEveryFrames);
        }
        return;
      }
    }
  }

  /** Раз в 3 с — 2 заголовка вниз, расходясь в стороны. */
  private tickDrops(world: BossWorld): void {
    if (--this.dropTimer > 0) return;
    this.dropTimer = this.scaled(C.dropEveryFrames);
    const D = C.dropped;
    for (let i = 0; i < D.count; i++) {
      const vx = (i / Math.max(1, D.count - 1)) * 2 * D.vx - D.vx;
      world.spawn(
        new Projectile(
          'headline',
          this.x + this.w / 2,
          this.y + this.h,
          D.w,
          D.h,
          vx,
          D.vy,
          0,
          false,
          'panic',
        ),
      );
    }
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Порыв: заголовок летит по ветру на одной из высот и ранит — перепрыгнуть или пригнуться. */
  private blowHeadline(world: BossWorld): void {
    const G = C.gustHeadlines;
    const ys = C.gustHeadlineYs;
    const y = this.arena.y + ys[world.rng.int(0, ys.length - 1)]!;
    world.spawn(
      new Projectile(
        'headline',
        this.x + this.w / 2,
        y,
        C.dropped.w,
        C.dropped.h,
        -this.side * G.speed,
        0,
        0,
        false,
        'hurt',
        { amplitude: G.amplitude / 4, frequency: G.frequency },
      ),
    );
  }

  /** Лететь к точке (центр). true — долетел. */
  private flyTo(p: Point): boolean {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d = Math.hypot(dx, dy);
    const speed = C.flySpeed / this.timingFactor;
    if (d <= speed) {
      this.placeCenter(p);
      return true;
    }
    this.x += (dx / d) * speed;
    this.y += (dy / d) * speed;
    return false;
  }

  private placeCenter(p: Point): void {
    this.x = p.x - this.w / 2;
    this.y = p.y - this.h / 2;
  }
}
