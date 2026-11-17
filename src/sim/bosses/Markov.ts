import { MARKOV as C } from '../../config/balance';
import type { Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/**
 * intro — ждёт конца реплики; drive — кран едет к точке (рывок — к левому краю, быстрее);
 * aim — встал, шар качнулся (знак); drop — шар падает на пол; lie — шар лежит; rise — шар
 * поднимается; defeated — побеждён (Марков выпрыгивает из кабины на пол).
 */
export type MarkovState = 'intro' | 'drive' | 'aim' | 'drop' | 'lie' | 'rise' | 'defeated';

/** Что боссу нужно от мира сверх общего: сколько подбираемых обломков на арене. */
export interface MarkovWorld extends BossWorld {
  scrapOnArena(): number;
}

/**
 * Босс 8: Сергей Марков в кабине крана (ящерица на кране оригинала). Сам босс — кабина с
 * Марковым (по ней бьют); гусеницы, корпус и шар на цепи ранят касанием. Кран ездит по полу,
 * останавливается и бьёт шаром в пол — от удара разлетаются обломки. Обломок, брошенный
 * в кабину, снимает 1 здоровья; бросок с пола проходит ниже кабины — бросать в прыжке.
 */
export class Markov implements BossBase {
  readonly name = 'markov';
  readonly w: number = C.cab.w;
  h: number = C.cab.h;
  /** Хитбокс босса — кабина (после победы — Марков, спрыгнувший на пол). */
  x = 0;
  y = 0;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: MarkovState = 'intro';
  timer = 0;
  invuln = 0;
  /** Левый край гусениц, px (координаты мира). */
  craneX: number;
  /** Низ шара. */
  ballBottom: number;
  /** Куда едет и с какой скоростью. */
  private target = 0;
  private speed: number = C.speed;
  /** Путь гусениц (для анимации траков). */
  travelled = 0;

  constructor(
    /** Арена (левый верх — начало координат). */
    readonly arena: Rect,
  ) {
    this.craneX = arena.x + C.start;
    this.ballBottom = this.hangBottom;
    this.placeCab();
  }

  // ——— геометрия ———

  get floorY(): number {
    return this.arena.y + C.floorY;
  }

  private get hangBottom(): number {
    return this.arena.y + C.ball.hangBottom;
  }

  private placeCab(): void {
    this.x = this.craneX + C.cab.dx;
    this.y = this.arena.y + C.cab.y;
  }

  get tracks(): Rect {
    return { x: this.craneX, y: this.floorY - C.tracks.h, w: C.tracks.w, h: C.tracks.h };
  }

  get body(): Rect {
    return { x: this.craneX + C.body.dx, y: this.arena.y + C.body.y, w: C.body.w, h: C.body.h };
  }

  get ball(): Rect {
    const s = C.ball.size;
    return { x: this.craneX + C.ball.dx - s / 2, y: this.ballBottom - s, w: s, h: s };
  }

  /** Что ранит касанием (кроме самой кабины). */
  get hazards(): Rect[] {
    return [this.tracks, this.body, this.ball];
  }

  /** Обо что брошенный обломок отскакивает (шар и гусеницы, как в оригинале). */
  get deflectors(): Rect[] {
    return [this.ball, this.tracks];
  }

  // ——— BossBase ———

  get vulnerable(): boolean {
    return this.state !== 'intro' && this.state !== 'defeated' && this.invuln === 0;
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

  begin(world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.nextDrive(world);
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    this.hp -= 1;
    this.invuln = C.invulnFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.timer = 0;
      // Спрыгивает из кабины: дальше — человек 24×40, падает до пола.
      this.y = this.y + this.h - 40;
      this.h = 40;
      world.emit({ type: 'bossDefeated' });
    }
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
        if (this.y + this.h < this.floorY)
          this.y = Math.min(this.floorY - this.h, this.y + C.outroFallSpeed);
        if (this.ballBottom < this.floorY)
          this.ballBottom = Math.min(this.floorY, this.ballBottom + 4);
        return;
      }
      case 'drive': {
        const d = this.target - this.craneX;
        const step = Math.sign(d) * Math.min(Math.abs(d), this.speed);
        this.craneX += step;
        this.travelled += Math.abs(step);
        this.placeCab();
        if (this.craneX === this.target) {
          this.state = 'aim';
          this.timer = C.aimFrames;
        }
        return;
      }
      case 'aim':
        if (--this.timer <= 0) {
          this.state = 'drop';
          this.timer = C.ball.dropFrames;
        }
        return;
      case 'drop': {
        // Шар падает с высоты подвеса на пол за dropFrames кадров (замер: 10).
        const span = this.floorY - this.hangBottom;
        this.ballBottom = Math.min(this.floorY, this.ballBottom + span / C.ball.dropFrames);
        if (--this.timer <= 0) {
          this.ballBottom = this.floorY;
          this.state = 'lie';
          this.timer = C.ball.lieFrames;
          this.smash(world);
        }
        return;
      }
      case 'lie':
        if (--this.timer <= 0) this.state = 'rise';
        return;
      case 'rise':
        this.ballBottom = Math.max(this.hangBottom, this.ballBottom - C.ball.riseSpeed);
        if (this.ballBottom === this.hangBottom) this.nextDrive(world);
        return;
    }
  }

  /** Следующий переезд: иногда рывок к левому краю, иначе — в случайную точку. */
  private nextDrive(world: BossWorld): void {
    const lo = this.arena.x + C.xMin;
    const hi = this.arena.x + C.xMax;
    const dash = this.craneX - lo >= C.minDrive && world.rng.next() < C.dashChance;
    if (dash) {
      this.target = lo;
      this.speed = C.dashSpeed;
    } else {
      let t = this.craneX;
      for (let i = 0; i < 8 && Math.abs(t - this.craneX) < C.minDrive; i++)
        t = world.rng.int(lo, hi);
      if (Math.abs(t - this.craneX) < C.minDrive) t = this.craneX - lo > hi - this.craneX ? lo : hi;
      this.target = t;
      this.speed = C.speed;
    }
    this.state = 'drive';
  }

  /** Шар ударил в пол: 2 обломка — левый ложится (если на арене нет другого), правый проваливается. */
  private smash(world: BossWorld): void {
    const D = C.debris;
    const b = this.ball;
    const cx = b.x + b.w / 2;
    const cy = this.floorY - 10;
    const keep = (world as MarkovWorld).scrapOnArena() === 0;
    // Левый — дугой на пол перед шаром; правый сразу уходит вниз сквозь пол (как в оригинале),
    // поэтому место между шаром и краном при ударе безопасно.
    const left = new Projectile('scrap', cx - 8, cy, 16, 12, -D.vx, D.vy, D.gravity);
    left.landsAsItem = keep;
    world.spawn(left);
    const right = new Projectile('scrap', cx, cy, 16, 12, 0, 1, D.gravity);
    right.ghost = true;
    world.spawn(right);
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }
}
