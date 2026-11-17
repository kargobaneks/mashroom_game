import {
  BORDACHEV,
  MACHINE as C,
  MIKITKO,
  SHCHELIN,
  type MachineAttack,
} from '../../config/balance';
import type { Point, Rect } from '../geom';
import { Projectile } from '../Projectile';
import type { BossBase, BossWorld } from './Boss';

/**
 * intro — ждёт конца реплики; lights — свет ещё горит, робот стоит; hop — подскок на тяге
 * (только в начале боя); stand — стоит после подскока; ground — стоит на точке посадки
 * (на дальней — атакует, на других — «пыхтит»); takeoff — взлёт на тяге; air — за верхним
 * краем; land — падает в точку под знаком; defeated — взрывы.
 */
export type MachineState =
  'intro' | 'lights' | 'hop' | 'stand' | 'ground' | 'takeoff' | 'air' | 'land' | 'defeated';

/** Что боссу нужно от мира сверх общего: шар-оружие и герой (ноги — куда целиться). */
export interface MachineWorld extends BossWorld {
  dropOrb(x: number, y: number): void;
  targetFeet(from: Rect): Point | null;
}

/** Кулак-ракета: летит к точке у пола и возвращается. */
interface Fist {
  from: Point;
  to: Point;
  t: number;
}

/**
 * Босс 9: Машина Конца Истории — робот-двойник Дефицита Будущего (робот Толстопуза оригинала).
 * Цикл оригинала: свет гаснет, робот улетает за верхний край, над точкой посадки — знак DANGER,
 * с потолка в точку взлёта падает шар — им и бьют корпус. На дальней точке (192) — 2 атаки
 * подряд; атаки — из фазы (ТЗ: 3 фазы по 4 попадания, атаки боссов 1–2, 3 и 5, 6–8). Между
 * фазами от робота отваливается деталь.
 */
export class Machine implements BossBase {
  readonly name = 'machine';
  readonly w: number = C.body.w;
  readonly h: number = C.body.h;
  hp: number = C.hp;
  readonly maxHp: number = C.hp;
  state: MachineState = 'intro';
  timer = 0;
  invuln = 0;
  /** Центр робота по горизонтали и низ корпуса (координаты мира). */
  cx: number;
  bottom: number;
  /** Куда сядет (центр) и откуда взлетел. */
  landX = 0;
  private fromX = 0;
  /** Кадр фазы «в воздухе». */
  private airT = 0;
  /** Сколько атак уже сделал на этой посадке; текущая атака и её кадр. */
  private attacks = 0;
  attack: MachineAttack | null = null;
  private attackT = 0;
  /** Знак перед атакой: кадры. */
  private telegraph = 0;
  /** Куда целился в начале атаки (луч, глобус). */
  private aimAt: Point | null = null;
  fist: Fist | null = null;
  /** Свет погашен. */
  dark = false;

  constructor(
    /** Арена (левый верх — начало координат). */
    readonly arena: Rect,
  ) {
    this.cx = arena.x + C.attackSpot;
    this.bottom = this.floorY;
    this.place();
  }

  get floorY(): number {
    return this.arena.y + C.floorY;
  }

  /** Хитбокс корпуса (пересчитывается из cx и bottom после каждого шага). */
  x = 0;
  y = 0;

  private place(): void {
    this.x = this.cx - this.w / 2;
    this.y = this.bottom - this.h;
  }

  /** Фаза: 0, 1, 2 (ТЗ: по 4 попадания). */
  get phase(): number {
    return Math.min(2, Math.floor((this.maxHp - this.hp) / C.hpPerPhase));
  }

  /** Робот на экране (не за верхним краем). */
  get onScreen(): boolean {
    return this.bottom > this.arena.y + C.visibleBottom;
  }

  /** Знак DANGER над точкой посадки виден. */
  get danger(): boolean {
    return this.state === 'air' && this.airT >= C.signAt && this.airT < C.signAt + C.signFrames;
  }

  /** Реактивное пламя под роботом (ранит). */
  get flame(): Rect | null {
    if (this.state !== 'takeoff' && this.state !== 'hop' && this.state !== 'land') return null;
    if (!this.onScreen) return null;
    const F = C.flame;
    return { x: this.cx - F.w / 2, y: this.bottom, w: F.w, h: F.h };
  }

  /** Кулак-ракета (фаза 3): где он сейчас. */
  get fistRect(): Rect | null {
    const f = this.fist;
    if (!f) return null;
    const F = C.fist;
    const k =
      f.t < F.outFrames
        ? f.t / F.outFrames
        : f.t < F.outFrames + F.holdFrames
          ? 1
          : 1 - (f.t - F.outFrames - F.holdFrames) / F.backFrames;
    const x = f.from.x + (f.to.x - f.from.x) * k;
    const y = f.from.y + (f.to.y - f.from.y) * k;
    return { x: x - F.size / 2, y: y - F.size / 2, w: F.size, h: F.size };
  }

  /** Что ранит касанием, кроме корпуса. */
  get hazards(): Rect[] {
    const out: Rect[] = [];
    const fl = this.flame;
    if (fl) out.push(fl);
    const fi = this.fistRect;
    if (fi) out.push(fi);
    return out;
  }

  private get hand(): Point {
    return { x: this.cx + C.hand.dx, y: this.bottom + C.hand.dy };
  }

  // ——— BossBase ———

  get vulnerable(): boolean {
    return this.harmful && this.invuln === 0;
  }

  get harmful(): boolean {
    return (
      this.state !== 'intro' && this.state !== 'defeated' && this.state !== 'air' && this.onScreen
    );
  }

  get telegraphing(): boolean {
    return this.telegraph > 0;
  }

  get defeated(): boolean {
    return this.state === 'defeated';
  }

  get landed(): boolean {
    return this.defeated && this.timer >= C.outroFrames;
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
    this.state = 'lights';
    this.timer = C.lightsFrames;
  }

  hit(world: BossWorld): boolean {
    if (!this.vulnerable) return false;
    const phase = this.phase;
    this.hp -= 1;
    this.invuln = C.invulnFrames;
    world.emit({ type: 'sfx', name: 'bossHit' });
    if (this.hp <= 0) {
      this.state = 'defeated';
      this.timer = 0;
      this.fist = null;
      this.telegraph = 0;
      this.attack = null;
      this.dark = false;
      world.emit({ type: 'bossDefeated' });
    } else if (this.phase !== phase) {
      // Отвалилась деталь корпуса (ТЗ).
      world.emit({ type: 'bossPhase' });
    }
    return true;
  }

  /**
   * Игрок погиб: здоровье — к началу текущей фазы (у всех прошлых боссов — полностью, как
   * в оригинале; у финального с 12 попаданиями это 3 минуты заново — фаза служит чекпоинтом).
   */
  restore(): void {
    if (this.defeated) return;
    this.hp = this.maxHp - this.phase * C.hpPerPhase;
  }

  update(world: BossWorld): void {
    this.step(world);
    this.place();
  }

  private step(world: BossWorld): void {
    if (this.invuln > 0) this.invuln--;
    if (this.fist) {
      const F = C.fist;
      if (++this.fist.t >= F.outFrames + F.holdFrames + F.backFrames) this.fist = null;
    }
    switch (this.state) {
      case 'intro':
        return;
      case 'defeated':
        this.timer++;
        return;
      case 'lights':
        if (--this.timer <= 0) {
          this.dark = true;
          this.state = 'hop';
          this.timer = 0;
        }
        return;
      case 'hop': {
        // Подъём на 48 px и обратно (вступление оригинала).
        this.timer++;
        const up = C.hop.height / C.hop.speed;
        if (this.timer <= up) this.bottom -= C.hop.speed;
        else this.bottom = Math.min(this.floorY, this.bottom + C.hop.speed);
        if (this.timer > up && this.bottom >= this.floorY) {
          this.state = 'stand';
          this.timer = C.hop.standFrames;
        }
        return;
      }
      case 'stand':
        if (--this.timer <= 0) this.takeOff();
        return;
      case 'ground':
        this.ground(world);
        return;
      case 'takeoff':
        this.bottom -= C.riseSpeed;
        if (this.bottom <= this.arena.y) {
          this.state = 'air';
          this.airT = 0;
          this.landX = this.pickLanding(world);
        }
        return;
      case 'air':
        this.airT++;
        if (this.airT === C.signAt) {
          // Шар падает с потолка в точку взлёта; если робот садится туда же — перед ним.
          let x = this.fromX;
          if (Math.abs(x - this.landX) < C.body.w)
            x = Math.max(this.arena.x + 24, this.landX - C.orbAhead);
          (world as MachineWorld).dropOrb(x, this.arena.y + 24);
          world.emit({ type: 'sfx', name: 'trigger' });
        }
        if (this.airT >= C.airFrames) {
          this.state = 'land';
          this.cx = this.landX;
          this.bottom = this.arena.y - 8;
        }
        return;
      case 'land':
        this.bottom = Math.min(this.floorY, this.bottom + C.landSpeed);
        if (this.bottom >= this.floorY) {
          world.emit({ type: 'sfx', name: 'land' });
          this.state = 'ground';
          this.attacks = 0;
          this.attack = null;
          this.telegraph = 0;
          const atSpot = this.cx === this.arena.x + C.attackSpot;
          this.timer = atSpot ? C.attackPause / 2 : C.pantFrames[this.phase]!;
        }
        return;
    }
  }

  private takeOff(): void {
    this.state = 'takeoff';
    this.fromX = this.cx;
    this.attack = null;
    this.telegraph = 0;
  }

  /** Точка посадки: одна из пяти (80, 128, 192, 192, 192), как в оригинале. */
  private pickLanding(world: BossWorld): number {
    const L = C.landings;
    return this.arena.x + L[world.rng.int(0, L.length - 1)]!;
  }

  // ——— на земле ———

  private ground(world: BossWorld): void {
    const atSpot = this.cx === this.arena.x + C.attackSpot;
    if (!atSpot) {
      if (--this.timer <= 0) this.takeOff();
      return;
    }
    if (this.attack) {
      if (this.telegraph > 0) {
        this.telegraph--;
        return;
      }
      if (this.runAttack(world)) {
        this.attack = null;
        this.attacks++;
        this.timer = C.attackPause;
      }
      return;
    }
    if (--this.timer > 0) return;
    if (this.attacks >= 2) {
      this.takeOff();
      return;
    }
    const set = C.phaseAttacks[this.phase]!;
    this.attack = set[world.rng.int(0, set.length - 1)]!;
    this.attackT = 0;
    this.telegraph = C.telegraphFrames;
    this.aimAt = world.target(this);
  }

  /** Кадр атаки; true — атака закончилась. */
  private runAttack(world: BossWorld): boolean {
    const t = this.attackT++;
    const w = world as MachineWorld;
    switch (this.attack) {
      case 'jets': {
        const J = C.jets;
        if (t % J.every === 0 && t < J.bursts * J.every) this.jets(world);
        return t >= J.bursts * J.every;
      }
      case 'headlines': {
        const H = C.headlines;
        if (t % H.every === 0 && t < H.ys.length * H.every)
          this.flyer(world, 'headline', H.ys[t / H.every]!, H.speed, H.w, H.h, 'panic');
        return t >= H.ys.length * H.every;
      }
      case 'cards': {
        const K = C.cards;
        if (t % K.every === 0 && t < K.ys.length * K.every)
          this.flyer(world, 'card', K.ys[t / K.every]!, K.vx, 16, 12, 'hurt');
        return t >= K.ys.length * K.every;
      }
      case 'sparks': {
        const S = C.sparks;
        if (t % S.every === 0 && t < S.count * S.every) {
          world.spawn(
            new Projectile(
              'spark',
              this.arena.x + this.arena.w - 8,
              this.floorY - S.size / 2,
              S.size,
              S.size,
              -S.speed,
              0,
            ),
          );
          world.emit({ type: 'sfx', name: 'bossShoot' });
        }
        return t >= S.count * S.every;
      }
      case 'globe':
        if (t === 0) this.globe(w);
        return t >= 30;
      case 'beam':
        if (t === 0) this.beam(world);
        return t >= 30;
      case 'gears': {
        const G = C.gears;
        if (t % G.every === 0 && t < 3 * G.every) this.gear(world, t / G.every);
        return t >= 3 * G.every;
      }
      case 'fist': {
        if (t === 0) {
          const target = w.targetFeet(this);
          const F = C.fist;
          const tx = Math.max(this.arena.x + F.minX, Math.min(this.cx - 24, target?.x ?? 0));
          this.fist = { from: this.hand, to: { x: tx, y: this.floorY - F.size / 2 }, t: 0 };
          world.emit({ type: 'sfx', name: 'bossShoot' });
        }
        return this.fist === null;
      }
      default:
        return true;
    }
  }

  /** Фаза 1, Агранович: веер из 3 струй в героя. */
  private jets(world: BossWorld): void {
    const J = C.jets;
    const h = this.hand;
    // Целится туда, где герой был в начале знака (как луч): видно, куда полетит, и есть время уйти.
    const tg = this.aimAt ?? world.target(this) ?? { x: this.arena.x, y: this.floorY };
    const base = Math.atan2(tg.y - h.y, tg.x - h.x);
    for (let i = 0; i < J.count; i++) {
      const a = base + (i - (J.count - 1) / 2) * J.spreadRad;
      world.spawn(
        new Projectile(
          'stream',
          h.x,
          h.y,
          J.size,
          J.size,
          Math.cos(a) * J.speed,
          Math.sin(a) * J.speed,
        ),
      );
    }
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Летит по горизонтали влево на высоте y над полом (заголовок Уралова, карта Соболева). */
  private flyer(
    world: BossWorld,
    kind: 'headline' | 'card',
    y: number,
    speed: number,
    w: number,
    h: number,
    effect: 'hurt' | 'panic',
  ): void {
    world.spawn(
      new Projectile(kind, this.cx - 32, this.floorY - y, w, h, -speed, 0, 0, false, effect),
    );
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Фаза 2, Бордачёв: глобус дугой туда, где стоял герой. */
  private globe(world: MachineWorld): void {
    const target = world.targetFeet(this);
    if (!target) return;
    const G = BORDACHEV.globe;
    const s = { x: this.cx + C.head.dx, y: this.bottom + C.head.dy };
    const dx = target.x - s.x;
    const dy = target.y - 12 - s.y;
    const t = Math.min(G.maxFrames, Math.max(G.minFrames, Math.abs(dx) / G.speed));
    const vx = dx / t;
    const vy = (dy - 0.5 * G.gravity * t * t) / t;
    world.spawn(new Projectile('globe', s.x, s.y, G.size, G.size, vx, vy, G.gravity));
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Фаза 2, Микитко: луч из руки туда, где герой был в начале знака. */
  private beam(world: BossWorld): void {
    const b = MIKITKO.beam;
    const h = this.hand;
    const tg = this.aimAt ?? world.target(this) ?? { x: this.arena.x, y: this.floorY };
    const dx = tg.x - h.x;
    const dy = tg.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    world.spawn(
      new Projectile('beam', h.x, h.y, b.size, b.size, (dx / d) * b.speed, (dy / d) * b.speed),
    );
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }

  /** Фаза 3, Щелин: шестерёнки дугой вперёд, 1,5 / 2,2 / 3 px/кадр. */
  private gear(world: BossWorld, i: number): void {
    const h = this.hand;
    world.spawn(
      new Projectile(
        'gear',
        h.x,
        h.y,
        SHCHELIN.gearSize,
        SHCHELIN.gearSize,
        -SHCHELIN.gearVx[i]!,
        SHCHELIN.gearVy,
        SHCHELIN.gearGravity,
      ),
    );
    world.emit({ type: 'sfx', name: 'bossShoot' });
  }
}
