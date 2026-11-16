import { BOSS_RULES, MIKITKO as C } from '../../config/balance';
import type { Facing, Point, Rect } from '../geom';
import { Item, type LetterGlyph } from '../Item';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/**
 * intro — ждёт конца реплики; lit — свет горит, призрака нет; flicker — свет мигает (знак);
 * appear — проявляется справа; sway — раскачивается на месте;
 * sine — плывёт влево по синусоиде, роняет букву;
 * rise — поднимается наверх; dive — идёт к центру; charge — стоит в центре, заряжает луч;
 * shoot — после выстрела ещё стоит; diveOut — идёт дальше к левому нижнему углу;
 * vanish — растворяется; defeated — пришёл в себя.
 */
export type MikitkoState =
  | 'intro'
  | 'lit'
  | 'flicker'
  | 'appear'
  | 'sway'
  | 'sine'
  | 'rise'
  | 'dive'
  | 'charge'
  | 'shoot'
  | 'diveOut'
  | 'vanish'
  | 'defeated';

/** Что призраку нужно от мира сверх общего: буквы на арене. */
export interface MikitkoWorld extends BossWorld {
  dropLetter(item: Item): void;
  lettersOnArena(): number;
}

const GLYPHS: readonly LetterGlyph[] = ['yat', 'i', 'fita'];

/** Состояния, в которых призрак виден целиком (бить можно, касание ранит). */
const SOLID: ReadonlySet<MikitkoState> = new Set([
  'sway',
  'sine',
  'rise',
  'dive',
  'charge',
  'shoot',
  'diveOut',
]);

/**
 * Босс 5: Микитко — призрак дореформенного архива (призрак уровня 5 оригинала). Свет гаснет —
 * он проявляется справа и раскачивается, потом либо плывёт влево по синусоиде и роняет букву,
 * либо поднимается и идёт к левому нижнему углу, останавливаясь в центре, чтобы пустить луч
 * по горизонтали (на высоте героя). Потом растворяется, свет загорается. Бить — буквами, пока
 * виден. 7 попаданий. Побеждён — становится человеком и опускается на пол.
 */
export class Mikitko implements BossBase {
  readonly name = 'mikitko';
  w: number = C.width;
  h: number = C.height;
  x = 0;
  y = 0;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: MikitkoState = 'intro';
  timer = 0;
  invuln = 0;
  /** Куда смотрит (на героя): рисунок и сторона луча. */
  facing: Facing = -1;
  /** Куда летит луч: где был центр героя в начале зарядки. */
  private beamTarget: Point = { x: 0, y: 0 };
  /** Точка пути (центр хитбокса без покачивания) и скорость вдоль пути, px/кадр. */
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  /** Синусоида: высота оси волны и фаза. */
  private waveY = 0;
  private phase = 0;
  /** Счётчик покачивания (идёт всё время — без рывков между фазами). */
  private floatT = 0;
  private dropped = false;
  /** Прошлый манёвр: после синусоиды всегда нырок с лучом. */
  lastMove: 'sine' | 'dive' | null = null;

  constructor(
    /** Точка появления (центр хитбокса) — справа; первая из точек арены. */
    readonly points: readonly Point[],
    /** Верх пола арены, y. */
    readonly floorY: number,
    /** Арена: от её левого верха считаются точки нырка. */
    readonly arena: Rect,
  ) {
    if (points.length < 1) throw new Error('Mikitko needs a point');
    this.placeAt(points[0]!);
  }

  // ——— геометрия ———

  /** Поставить в точку пути и остановить. */
  private placeAt(p: Point): void {
    this.px = p.x;
    this.py = p.y;
    this.vx = 0;
    this.vy = 0;
    this.sync();
  }

  /** Хитбокс = точка пути + покачивание. */
  private sync(): void {
    const f = C.float;
    const bob = Math.sin((this.floatT / f.period) * Math.PI * 2) * f.amplitude;
    this.x = this.px - this.w / 2;
    this.y = this.py + bob - this.h / 2;
  }

  private get cx(): number {
    return this.x + this.w / 2;
  }

  private at(p: Point): Point {
    return { x: this.arena.x + p.x, y: this.arena.y + p.y };
  }

  /** Довести скорость до нужной не сразу, а с ускорением accel. */
  private steer(wantVx: number, wantVy: number): void {
    const dvx = wantVx - this.vx;
    const dvy = wantVy - this.vy;
    const d = Math.hypot(dvx, dvy);
    const a = C.accel;
    if (d <= a) {
      this.vx = wantVx;
      this.vy = wantVy;
    } else {
      this.vx += (dvx / d) * a;
      this.vy += (dvy / d) * a;
    }
  }

  /**
   * Плавно лететь к точке: разгон, у точки — торможение (подлетает, замедляясь).
   * true — прилетел и остановился.
   */
  private flyTo(p: Point, maxSpeed: number): boolean {
    const dx = p.x - this.px;
    const dy = p.y - this.py;
    const d = Math.hypot(dx, dy);
    const v = Math.hypot(this.vx, this.vy);
    if (d < 0.5 && v < 0.15) {
      // Дотормозил — прилетел; без подтягивания к точке (иначе заметный рывок).
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    // Скорость, с которой ещё успеет затормозить: v² = 2·a·d.
    const speed = Math.min(maxSpeed, Math.sqrt(2 * C.accel * d));
    this.steer((dx / (d || 1)) * speed, (dy / (d || 1)) * speed);
    this.px += this.vx;
    this.py += this.vy;
    return false;
  }

  // ——— состояние для мира и рисования ———

  /** Свет погашен (арена чёрная, видны только свечи, герои, буквы и призрак). */
  get dark(): boolean {
    if (this.state === 'flicker') return Math.floor(this.timer / C.flickerPeriod) % 2 === 0;
    return this.state === 'appear' || this.state === 'vanish' || SOLID.has(this.state);
  }

  /** Непрозрачность призрака: 0 — нет, 1 — виден целиком. */
  get opacity(): number {
    if (this.state === 'appear') return 1 - this.timer / C.appearFrames;
    if (this.state === 'vanish') return this.timer / C.vanishFrames;
    return SOLID.has(this.state) || this.state === 'defeated' ? 1 : 0;
  }

  /** Бить можно, пока виден целиком. */
  get vulnerable(): boolean {
    return SOLID.has(this.state) && this.invuln === 0;
  }

  /** Касание ранит — тоже только видимый. Невидимого брошенная буква пролетает насквозь. */
  get harmful(): boolean {
    return SOLID.has(this.state);
  }

  get telegraphing(): boolean {
    return this.state === 'charge';
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

  /** Покачивание спрайта — только пока стоит (в движении его качает сама траектория). */
  get flying(): boolean {
    return false;
  }

  windFor(_body: Rect): number {
    return 0;
  }

  get timingFactor(): number {
    return this.hp <= this.maxHp / 2 ? BOSS_RULES.halfHpTimingFactor : 1;
  }

  /** На половине жизни всё быстрее на 25%: паузы короче, скорости выше. */
  private scaled(frames: number): number {
    return Math.max(1, Math.round(frames * this.timingFactor));
  }

  private fast(speed: number): number {
    return speed / this.timingFactor;
  }

  // ——— бой ———

  begin(_world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.enter('lit', this.scaled(C.litFrames));
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    this.hp -= 1;
    this.invuln = BOSS_RULES.hitInvulnerableFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) this.free(world);
    return true;
  }

  update(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    if (this.state === 'intro') return;
    if (this.state === 'defeated') {
      const restY = this.floorY - this.h;
      if (this.y < restY) this.y = Math.min(restY, this.y + C.freed.descendSpeed);
      return;
    }
    this.floatT++;
    if (this.opacity > 0) this.face(world);
    switch (this.state) {
      case 'sine': {
        // Влево с разгоном; высота — волна вокруг оси, начатая с текущей высоты (без скачка).
        this.steer(-this.fast(C.sine.speed), 0);
        this.px += this.vx;
        this.phase++;
        // Волна набирает размах за секунду — без рывка по вертикали.
        const env = Math.min(1, this.phase / 60);
        this.py =
          this.waveY +
          env * Math.sin((this.phase / C.sine.period) * Math.PI * 2) * C.sine.amplitude;
        if (!this.dropped && this.px < this.points[0]!.x - 40)
          this.dropped = this.dropLetter(world);
        if (this.px <= this.arena.x + C.sine.endX) this.enter('vanish', C.vanishFrames);
        break;
      }
      case 'rise':
        if (this.flyTo(this.at(C.dive.top), this.fast(C.dive.riseSpeed))) this.state = 'dive';
        break;
      case 'dive':
        if (this.flyTo(this.at(C.dive.center), this.fast(C.dive.speed))) {
          const t = world.target(this);
          this.beamTarget = t ?? { x: this.cx, y: this.floorY };
          this.enter('charge', C.chargeFrames);
        }
        break;
      case 'diveOut':
        if (this.flyTo(this.at(C.dive.corner), this.fast(C.dive.speed)))
          this.enter('vanish', C.vanishFrames);
        break;
      case 'vanish':
        // Растворяясь, договаривает движение по инерции и останавливается.
        this.steer(0, 0);
        this.px += this.vx;
        this.py += this.vy;
        if (--this.timer <= 0) this.enter('lit', this.scaled(C.litFrames));
        break;
      default:
        this.tick(world);
    }
    this.sync();
  }

  /** Фазы по таймеру: свет, проявление, раскачка, зарядка, выстрел. */
  private tick(world: BossWorld): void {
    if (--this.timer > 0) return;
    switch (this.state) {
      case 'lit':
        this.enter('flicker', C.flickerFrames);
        return;
      case 'flicker':
        this.placeAt(this.points[0]!);
        this.enter('appear', C.appearFrames);
        return;
      case 'appear':
        this.enter('sway', this.scaled(C.swayFrames));
        return;
      case 'sway':
        this.choose(world);
        return;
      case 'charge':
        this.shoot(world);
        this.enter('shoot', this.scaled(C.afterShotFrames));
        return;
      case 'shoot':
        this.state = 'diveOut';
        return;
      default:
        return;
    }
  }

  private enter(state: MikitkoState, frames: number): void {
    this.state = state;
    this.timer = frames;
  }

  /**
   * После раскачки: синусоида с буквой или нырок с лучом. После синусоиды — всегда нырок
   * (луч не пропадает, отзыв); после нырка без букв на арене — синусоида (буквы только от него);
   * иначе — наугад.
   */
  private choose(world: BossWorld): void {
    this.waveY = this.py;
    this.phase = 0;
    this.dropped = false;
    const noLetters = (world as MikitkoWorld).lettersOnArena() === 0;
    if (this.lastMove === 'sine') this.state = 'rise';
    else if (noLetters) this.state = 'sine';
    else this.state = world.rng.int(0, 1) === 0 ? 'sine' : 'rise';
    this.lastMove = this.state === 'sine' ? 'sine' : 'dive';
  }

  private face(world: BossWorld): void {
    const t = world.target(this);
    if (t) this.facing = t.x >= this.cx ? 1 : -1;
  }

  /** Луч по горизонтали в сторону героя, на высоте, где он был в начале зарядки. */
  private shoot(world: BossWorld): void {
    const b = C.beam;
    const hand = this.hand;
    const dx = this.beamTarget.x - hand.x;
    const dy = this.beamTarget.y - hand.y;
    const d = Math.hypot(dx, dy) || 1;
    world.spawn(
      new Projectile(
        'beam',
        hand.x,
        hand.y,
        b.size,
        b.size,
        (dx / d) * b.speed,
        (dy / d) * b.speed,
      ),
    );
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Центр вытянутой кисти (кадр aim): отсюда вылетает луч. */
  get hand(): Point {
    const h = C.beam.hand;
    return {
      x: this.facing > 0 ? this.x + h.x : this.x + this.w - h.x,
      y: this.y + h.y,
    };
  }

  /** Уронить букву из-под балахона, если на арене её нет. true — уронил. */
  private dropLetter(world: BossWorld): boolean {
    const mw = world as MikitkoWorld;
    if (mw.lettersOnArena() >= C.letters.maxOnArena) return false;
    const it = new Item('letter', { x: this.cx, y: Math.min(this.y + this.h + 16, this.floorY) });
    it.glyph = GLYPHS[world.rng.int(0, GLYPHS.length - 1)]!;
    // Падая, своего хозяина буква не бьёт.
    it.fromCrane = true;
    mw.dropLetter(it);
    return true;
  }

  /** Побеждён: становится человеком (24×40) в той же точке и опускается на пол. */
  private free(world: BossWorld): void {
    const cx = this.cx;
    const bottom = this.y + this.h;
    this.w = C.freed.width;
    this.h = C.freed.height;
    this.x = cx - this.w / 2;
    this.y = Math.min(bottom, this.floorY) - this.h;
    this.state = 'defeated';
    this.timer = 0;
    world.emit({ type: 'bossDefeated' });
  }
}
