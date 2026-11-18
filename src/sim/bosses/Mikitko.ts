import { BOSS_RULES, MIKITKO as C } from '../../config/balance';
import type { Facing, Point, Rect } from '../geom';
import type { LetterGlyph } from '../Item';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/**
 * intro — ждёт конца реплики; appear — проявляется в G0 (уже покачивается); sway — покачивается;
 * a / bLong / bShort — паттерны; vanish — растворился, темно ещё 31 кадр; lit — свет горит,
 * призрака нет; flicker — свет мигает и гаснет (знак); defeated — пришёл в себя.
 */
export type MikitkoState =
  | 'intro'
  | 'appear'
  | 'sway'
  | 'a'
  | 'bLong'
  | 'bShort'
  | 'vanish'
  | 'lit'
  | 'flicker'
  | 'defeated';

export type MikitkoPattern = 'a' | 'bLong' | 'bShort';

/** Что призраку нужно от мира сверх общего: сколько букв на арене (лежат, в руках, падают). */
export interface MikitkoWorld extends BossWorld {
  lettersOnArena(): number;
}

const GLYPHS: readonly LetterGlyph[] = ['yat', 'i', 'fita'];

/** Виден целиком: бить можно, касание ранит. */
const SOLID: ReadonlySet<MikitkoState> = new Set(['sway', 'a', 'bLong', 'bShort']);

/** Плавный переход 0 → 1 (скорость в начале и в конце — ноль). */
const ease = (u: number): number => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;

/**
 * Босс 5: Микитко — призрак дореформенного архива, по разбору призрака уровня 5 оригинала.
 * Темно — он в G0 и покачивается, потом A «два луча» или B «качели» с двумя буквами, исчезает;
 * свет горит, его нет; снова темно. Бить буквами, пока виден: высоко — в прыжке, низко — и с пола.
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
  /** Кадры в текущем состоянии света (lit / flicker / vanish) — обратный отсчёт. */
  timer = 0;
  invuln = 0;
  facing: Facing = -1;
  /** Паттерн текущего появления и прошлый (после «качелей» — всегда лучи, если есть буква). */
  pattern: MikitkoPattern = 'a';
  lastPattern: MikitkoPattern | null = null;
  /** Кадры от начала появления. */
  t = 0;
  /** Колонки букв этого появления (x оригинала) и сколько уже уронил. */
  private drops: { x: number; at: number }[] = [];
  private dropped = 0;
  /** Центр хитбокса по x и его низ (координаты мира). */
  private cx = 0;
  private bottom = 0;

  constructor(
    /** Верх пола арены, y. */
    readonly floorY: number,
    /** Арена: от её левого края считаются x оригинала. */
    readonly arena: Rect,
  ) {
    this.moveTo(C.g0);
  }

  // ——— геометрия ———

  /** Точка оригинала (x — центр, y — низ, пол на 192) → координаты мира. */
  private toWorld(p: Point): Point {
    return { x: this.arena.x + p.x, y: this.floorY - (C.floorY - p.y) };
  }

  private moveTo(p: Point): void {
    const q = this.toWorld(p);
    this.cx = q.x;
    this.bottom = q.y;
    this.x = this.cx - this.w / 2;
    this.y = this.bottom - this.h;
  }

  /** Точка пути (в координатах оригинала) на кадре t текущего появления. */
  private pathAt(t: number): Point {
    const g0 = C.g0;
    const swayT = this.pattern === 'bShort' ? C.sway.shortFrames : C.sway.frames;
    if (t <= swayT) {
      const dip = (1 - Math.cos((2 * Math.PI * t) / swayT)) / 2;
      return { x: g0.x, y: g0.y + (C.sway.lowY - g0.y) * dip };
    }
    if (this.pattern === 'a') {
      const A = C.a;
      const leave1 = A.shot1 + A.poseFrames;
      const arrive = A.shot2 - C.chargeFrames;
      const leave2 = A.shot2 + A.poseFrames;
      if (t <= leave1) return g0;
      if (t <= leave2) return lerp(g0, A.mid, ease((t - leave1) / (arrive - leave1)));
      return lerp(A.mid, A.end, ease((t - leave2) / (A.endAt - leave2)));
    }
    if (this.pattern === 'bLong') {
      const B = C.bLong;
      const e = ease((t - swayT) / (B.endAt - swayT));
      const x = g0.x - (g0.x - B.endX) * e;
      const y = g0.y - B.amplitude * Math.sin((2 * Math.PI * (g0.x - x)) / B.waveLength);
      return { x, y };
    }
    const B = C.bShort;
    const pts = B.path;
    const e = ease((t - swayT) / (B.endAt - swayT));
    const x = pts[0]!.x - (pts[0]!.x - pts.at(-1)!.x) * e;
    let i = 0;
    while (i < pts.length - 2 && x < pts[i + 1]!.x) i++;
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const u = (a.x - x) / (a.x - b.x || 1);
    return { x, y: a.y + (b.y - a.y) * ease(u) };
  }

  private get endAt(): number {
    return this.pattern === 'a'
      ? C.a.endAt
      : this.pattern === 'bLong'
        ? C.bLong.endAt
        : C.bShort.endAt;
  }

  // ——— состояние для мира и рисования ———

  /** Свет погашен: виден только призрак, свечи, герои, буквы и лучи. */
  get dark(): boolean {
    if (this.state === 'flicker') {
      // Мигает, последние кадры — уже темно.
      if (this.timer <= C.flickerPeriod) return true;
      return Math.floor(this.timer / C.flickerPeriod) % 2 === 0;
    }
    return this.state === 'appear' || this.state === 'vanish' || SOLID.has(this.state);
  }

  /** Непрозрачность призрака: 0 — нет, 1 — виден целиком. */
  get opacity(): number {
    if (this.state === 'appear') return Math.min(1, this.t / C.appearFrames);
    if (this.state === 'vanish')
      return Math.max(0, 1 - (C.darkAfterFrames - this.timer) / C.vanishFrames);
    return SOLID.has(this.state) || this.state === 'defeated' ? 1 : 0;
  }

  get vulnerable(): boolean {
    return SOLID.has(this.state) && this.invuln === 0;
  }

  /** Касание ранит — только видимый. Невидимого брошенная буква пролетает насквозь. */
  get harmful(): boolean {
    return SOLID.has(this.state);
  }

  /** Заряжает луч (рука вперёд, мигает). */
  get telegraphing(): boolean {
    if (this.state !== 'a') return false;
    return [C.a.shot1, C.a.shot2].some((s) => this.t > s - C.chargeFrames && this.t <= s);
  }

  /** Рука вытянута: заряжает или луч только что ушёл. */
  get aiming(): boolean {
    if (this.state !== 'a') return false;
    return [C.a.shot1, C.a.shot2].some(
      (s) => this.t > s - C.chargeFrames && this.t <= s + C.a.poseFrames,
    );
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

  /** ТЗ: на половине жизни тайминги быстрее на 25% — здесь свет горит короче. */
  private scaled(frames: number): number {
    const k = this.hp <= this.maxHp / 2 ? BOSS_RULES.halfHpTimingFactor : 1;
    return Math.max(1, Math.round(frames * k));
  }

  // ——— бой ———

  /** Как в оригинале: первый цикл начинается сразу — темно, он в G0. */
  begin(world: BossWorld): void {
    if (this.state !== 'intro') return;
    this.startAppear(world);
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    this.hp -= 1;
    this.invuln = C.invulnFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) this.free(world);
    return true;
  }

  /** Игрок погиб: здоровье снова 7, призрак скрыт и появится через ~200 кадров. */
  restore(): void {
    if (this.defeated) return;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.enter('lit', C.litFrames);
  }

  update(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    switch (this.state) {
      case 'intro':
        return;
      case 'defeated': {
        const restY = this.floorY - this.h;
        if (this.y < restY) this.y = Math.min(restY, this.y + C.freed.descendSpeed);
        return;
      }
      case 'vanish':
        if (--this.timer <= 0) this.enter('lit', this.scaled(C.litFrames));
        return;
      case 'lit':
        if (--this.timer <= 0) this.enter('flicker', C.flickerFrames);
        return;
      case 'flicker':
        if (--this.timer <= 0) this.startAppear(world);
        return;
      default:
        this.fly(world);
    }
  }

  /** Появление и паттерн: точка пути по кадру, выстрелы и буквы — по расписанию. */
  private fly(world: BossWorld): void {
    this.t++;
    const swayT = this.pattern === 'bShort' ? C.sway.shortFrames : C.sway.frames;
    if (this.state === 'appear' && this.t >= C.appearFrames) this.state = 'sway';
    if (this.state === 'sway' && this.t > swayT) this.state = this.pattern;
    this.face(world);
    this.moveTo(this.pathAt(this.t));
    if (this.state === 'a' && (this.t === C.a.shot1 || this.t === C.a.shot2)) this.shoot(world);
    while (this.dropped < this.drops.length && this.t >= this.drops[this.dropped]!.at) {
      this.dropLetter(world, this.drops[this.dropped]!.x);
      this.dropped++;
    }
    if (this.t >= this.endAt) {
      this.lastPattern = this.pattern;
      this.enter('vanish', C.darkAfterFrames);
    }
  }

  private enter(state: MikitkoState, frames: number): void {
    this.state = state;
    this.timer = frames;
  }

  /**
   * Снова в G0, паттерн — сразу. Букв на арене нет — «качели» (оружие только от него);
   * после «качелей» — лучи (луч не пропадает, отзыв); иначе наугад, как в оригинале.
   */
  private startAppear(world: BossWorld): void {
    const noLetters = (world as MikitkoWorld).lettersOnArena() === 0;
    const swing = (): MikitkoPattern => (world.rng.int(0, 1) === 0 ? 'bLong' : 'bShort');
    if (noLetters) this.pattern = swing();
    else if (this.lastPattern !== null && this.lastPattern !== 'a') this.pattern = 'a';
    else this.pattern = world.rng.int(0, 2) === 0 ? 'a' : swing();
    if (this.pattern === 'bLong') this.drops = C.bLong.drops.map((d) => ({ ...d }));
    else if (this.pattern === 'bShort') {
      const v = C.bShort.variants[world.rng.int(0, C.bShort.variants.length - 1)]!;
      this.drops = v.map((x, i) => ({ x, at: C.bShort.dropAt[i]! }));
    } else this.drops = [];
    this.dropped = 0;
    this.t = 0;
    this.state = 'appear';
    this.moveTo(C.g0);
  }

  private face(world: BossWorld): void {
    const t = world.target(this);
    if (t) this.facing = t.x >= this.cx ? 1 : -1;
  }

  /** Луч из руки туда, где герой сейчас (как прицельный шар оригинала). */
  private shoot(world: BossWorld): void {
    const b = C.beam;
    const hand = this.hand;
    const tg = world.target(this) ?? { x: this.arena.x, y: this.floorY };
    const dx = tg.x - hand.x;
    const dy = tg.y - hand.y;
    const d = Math.hypot(dx, dy) || 1;
    world.spawn(
      new Projectile('beam', hand.x, hand.y, b.size, b.size, (dx / d) * b.speed, (dy / d) * b.speed),
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

  /**
   * Буква падает с верха экрана по колонке x (оригинала) и ранит, пока падает. Ляжет на пол,
   * только если на арене нет другой (в руках тоже считается) — иначе провалится сквозь пол.
   */
  private dropLetter(world: BossWorld, x: number): void {
    const F = C.letterFall;
    const keep = (world as MikitkoWorld).lettersOnArena() < C.letters.maxOnArena;
    const pr = new Projectile('letter', this.arena.x + x, this.arena.y + 8, 16, 16, 0, 0, F.gravity);
    pr.maxVy = F.maxSpeed;
    pr.glyph = GLYPHS[world.rng.int(0, GLYPHS.length - 1)]!;
    pr.landsAsItem = keep;
    pr.ghost = !keep;
    world.spawn(pr);
  }

  /** Побеждён: становится человеком (24×40) в той же точке и опускается на пол. */
  private free(world: BossWorld): void {
    const cx = this.cx;
    const bottom = this.bottom;
    this.w = C.freed.width;
    this.h = C.freed.height;
    this.x = cx - this.w / 2;
    this.y = Math.min(bottom, this.floorY) - this.h;
    this.state = 'defeated';
    this.timer = 0;
    world.emit({ type: 'bossDefeated' });
  }
}

function lerp(a: Point, b: Point, u: number): Point {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
