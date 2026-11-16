import { AGRANOVICH, BALANCE, BOSS_RULES, URALOV } from '../config/balance';
import { ENEMIES } from '../config/enemies';
import type { HeroId } from '../systems/Flow';
import type { PlayerId } from '../systems/InputState';
import { Agranovich } from './bosses/Agranovich';
import type { BossWorld } from './bosses/Boss';
import { Bordachev, type BordachevWorld, type Ledge } from './bosses/Bordachev';
import { Mikitko, type MikitkoWorld } from './bosses/Mikitko';
import { Uralov } from './bosses/Uralov';
import { Camera } from './Camera';
import { createEnemy, isEnemyKind, type Enemy } from './enemies';
import { contains, overlaps, type Point, type Rect } from './geom';
import { addLife, heal, loseLife, type PlayerCarry } from './health';

export type { PlayerCarry } from './health';
import { Item, type ItemKind, type ThrowDir } from './Item';
import { buildMechanisms, type Mechanisms, type Rider } from './Mechanisms';
import type { LevelData, Segment, SpawnPoint } from './level';
import { isPickupKind, Pickup, type PickupKind } from './Pickup';
import { Player, type InputView } from './Player';
import type { Projectile } from './Projectile';
import { Rng } from './Rng';
import type { TileGrid } from './TileGrid';

export type WorldEvent =
  | { readonly type: 'sfx'; readonly name: string }
  | { readonly type: 'bossIntro'; readonly boss: string }
  | { readonly type: 'bossPhase' }
  | { readonly type: 'bossDefeated' }
  | { readonly type: 'duet' }
  | { readonly type: 'pickup'; readonly kind: PickupKind; readonly player: PlayerId }
  | { readonly type: 'gameOver' }
  /** Игрок дошёл до выхода части уровня. */
  | { readonly type: 'exit' };

export interface PlayerSetup {
  readonly id: PlayerId;
  readonly hero: HeroId;
}

/** Зоны уровня, которые добавляют игроку гравитацию. */
const ZONE_GRAVITY: Readonly<Record<string, number>> = {
  foam: AGRANOVICH.foamGravityBonus,
};

const ITEM_KINDS: readonly string[] = ['box', 'case', 'letter'] satisfies ItemKind[];
const isItemKind = (k: string): k is ItemKind => ITEM_KINDS.includes(k);

/** Расстояние между игроками на старте, px. */
const COOP_START_OFFSET = 16;

export type Boss = Agranovich | Uralov | Bordachev | Mikitko;

/**
 * Мир уровня: вся игровая логика без Phaser. Шаг — 1/60 с. Сцена передаёт ввод,
 * рисует состояние и забирает события (звуки, вход в арену, победа, конец игры).
 */
export class World implements BossWorld, BordachevWorld, MikitkoWorld {
  readonly grid: TileGrid;
  readonly camera: Camera;
  readonly rng: Rng;
  readonly players: Player[];
  items: Item[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  boss: Boss | null = null;
  frame = 0;
  /** Мир стоит на паузе, пока идёт реплика босса. */
  frozen = false;
  gameOver = false;
  private events: WorldEvent[] = [];
  private readonly spawnedEnemies = new Set<number>();
  private duetReadyFrame = 0;
  private ammoTimer = 0;
  private ammoDrops = 0;
  private exited = false;
  /** Шкала паники (арена Уралова), 0–100. */
  panic = 0;
  /** Сколько ещё кадров управление инвертировано (паника дошла до 100%). */
  panicFrames = 0;
  mech: Mechanisms;
  /** Уровень 4: сколько кадров осталось до заморозки; null — таймера нет. */
  timeLeft: number | null;
  /** Ящики, содержимое которых уже открыли (не прячем его снова при сбросе сегмента). */
  private readonly revealedSpawns = new Set<number>();

  constructor(
    readonly level: LevelData,
    setup: readonly PlayerSetup[],
    seed = 1,
    carry: readonly PlayerCarry[] = [],
  ) {
    this.grid = level.grid;
    this.camera = new Camera(level.segments);
    this.rng = new Rng(seed);
    const s = level.playerStart;
    this.players = setup.map((p, i) => new Player(p.id, p.hero, s.x + i * COOP_START_OFFSET, s.y));
    this.mech = buildMechanisms(level);
    this.timeLeft = level.timerFrames;
    for (const c of carry) {
      const p = this.players.find((q) => q.id === c.id);
      if (!p) continue;
      Object.assign(p.vitals, c.vitals, { invuln: 0 });
      p.timecodes = c.timecodes;
      if (p.out) p.state = 'dead';
    }
    for (const sp of level.spawns) {
      if (sp.type === 'item' && isItemKind(sp.kind)) {
        this.items.push(this.spawnItem(sp));
      } else if (sp.type === 'pickup' && isPickupKind(sp.kind)) {
        this.pickups.push(new Pickup(sp.kind, sp, sp.id));
      }
    }
    // Часть уровня — сразу арена (арена Бордачёва): бой начинается с реплики.
    if (this.camera.segment.boss) this.onSegmentEntered(this.camera.segment);
  }

  private spawnItem(sp: SpawnPoint): Item {
    const it = new Item(isItemKind(sp.kind) ? sp.kind : 'box', sp, sp.id);
    if (it.kind === 'letter') it.glyph = (['yat', 'i', 'fita'] as const)[sp.id % 3]!;
    const taken = this.revealedSpawns.has(sp.id);
    if (sp.contains && isPickupKind(sp.contains) && !taken) it.contents = sp.contains;
    return it;
  }

  /** Ящик подняли: то, что было под ним, появляется на его месте. */
  revealContents(item: Item): void {
    const kind = item.contents;
    if (!kind) return;
    item.contents = null;
    if (item.spawnId !== null) this.revealedSpawns.add(item.spawnId);
    this.pickups.push(
      new Pickup(kind, { x: item.x + item.w / 2, y: item.y + item.h }, -(item.spawnId ?? 0)),
    );
  }

  // ——— события ———

  emit(ev: WorldEvent): void {
    this.events.push(ev);
  }

  drainEvents(): WorldEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ——— шаг ———

  step(inputs: Readonly<Partial<Record<PlayerId, InputView>>>): void {
    if (this.frozen || this.gameOver) return;
    this.frame++;
    if (this.panicFrames > 0 && --this.panicFrames === 0) this.panic = 0;
    this.tickTimer();

    const entered = this.camera.update(this.cameraBodies());
    if (entered) this.onSegmentEntered(entered);
    const wrap = this.camera.wrapRise();
    if (wrap !== 0) this.shiftAll(wrap);
    this.spawnEnemies();
    this.moveMechanisms();

    for (const p of this.players) {
      const input = inputs[p.id];
      if (input && !p.out) p.update(input, this);
    }
    this.syncCarried();
    this.afterPlayersMechanisms();

    for (const it of this.items) it.update(this);
    this.resolveThrownItems();

    for (const e of this.enemies) if (e.alive) e.step(this);
    this.resolveEnemyContacts();

    for (const pr of this.projectiles) if (pr.alive) pr.update(this);
    this.resolveProjectiles();

    if (this.boss) this.updateBoss(this.boss);

    this.collectPickups();
    this.checkExit();
    this.checkPits();
    this.cleanup();
  }

  private cameraBodies(): Rect[] {
    return this.players.filter((p) => p.active && p.state !== 'held' && p.state !== 'respawn');
  }

  // ——— сегменты, появление, сброс ———

  private onSegmentEntered(seg: Segment): void {
    if (seg.boss && !this.boss) {
      const boss = this.createBoss(seg);
      if (!boss) return;
      this.boss = boss;
      this.enemies = [];
      this.projectiles = [];
      this.frozen = true;
      this.emit({ type: 'bossIntro', boss: seg.boss });
    }
  }

  private createBoss(seg: Segment): Boss | null {
    if (seg.boss === 'agranovich') {
      const points = this.level.spawns
        .filter((s) => s.type === 'bossPoint' && contains(seg, s))
        .map((s) => ({ x: s.x, y: s.y }));
      return new Agranovich(points);
    }
    if (seg.boss === 'uralov') return new Uralov(seg, this.floorBelow(seg));
    if (seg.boss === 'bordachev') {
      const start = this.level.spawns.find((s) => s.type === 'bossPoint' && contains(seg, s));
      return new Bordachev(this.ledgesIn(seg), start ?? { x: seg.x + seg.w / 2, y: seg.y + 160 });
    }
    if (seg.boss === 'mikitko') {
      const points = this.level.spawns
        .filter((s) => s.type === 'bossPoint' && contains(seg, s))
        .map((s) => ({ x: s.x, y: s.y }));
      return new Mikitko(points, this.floorBelow(seg), seg);
    }
    return null;
  }

  /** Платформы сегмента: верхние края рядов тонких (oneway) тайлов. */
  private ledgesIn(seg: Rect): Ledge[] {
    const T = this.grid.size;
    const out: Ledge[] = [];
    const tx0 = Math.floor(seg.x / T);
    const tx1 = Math.ceil((seg.x + seg.w) / T);
    for (let ty = Math.floor(seg.y / T); ty < Math.ceil((seg.y + seg.h) / T); ty++) {
      let run = -1;
      for (let tx = tx0; tx <= tx1; tx++) {
        const on = tx < tx1 && this.grid.isOneway(tx, ty);
        if (on && run < 0) run = tx;
        if (!on && run >= 0) {
          out.push({ x: run * T, y: ty * T, w: (tx - run) * T });
          run = -1;
        }
      }
    }
    return out;
  }

  // ——— арена, где всё поднимается (Бордачёв) ———

  /** Шахта бесконечная: камера перенеслась вверх на период — переносим и весь мир. */
  private shiftAll(dy: number): void {
    for (const p of this.players) p.y += dy;
    for (const it of this.items) it.y += dy;
    for (const e of this.enemies) e.y += dy;
    for (const pr of this.projectiles) pr.y += dy;
    for (const pk of this.pickups) pk.y += dy;
    if (this.boss instanceof Bordachev) this.boss.shift(dy);
  }

  get view(): Rect {
    return this.camera.view;
  }

  targetFeet(from: Rect): Point | null {
    const p = this.nearestPlayer(from);
    return p ? { x: p.x + p.w / 2, y: p.y + p.h } : null;
  }

  heroRects(): Rect[] {
    return this.players.filter((p) => p.active && p.state !== 'respawn');
  }

  dropAmmo(at: Point): void {
    const box = new Item('box', at);
    box.fromCrane = true;
    this.items.push(box);
  }

  // ——— арена Микитко ———

  /** Призрак уронил букву. */
  dropLetter(item: Item): void {
    this.items.push(item);
  }

  /** Сколько букв на арене (лежат, падают, в руках, летят). */
  lettersOnArena(): number {
    return this.items.filter((i) => i.kind === 'letter' && i.state !== 'gone').length;
  }

  /** Свет на арене погашен. */
  get dark(): boolean {
    return this.boss instanceof Mikitko && this.boss.dark;
  }

  ammoInView(): number {
    return this.items.filter((i) => i.state !== 'gone' && this.camera.sees(i, 0)).length;
  }

  /** Где возрождаться: на арене rise — на платформе средней колонны в середине экрана. */
  private respawnPoint(): Point {
    const seg = this.camera.segment;
    if (seg.dir !== 'rise') return seg.respawn;
    const T = this.grid.size;
    const tx = Math.floor((seg.x + seg.w / 2) / T);
    for (let ty = Math.ceil((this.camera.y + 96) / T); ty < this.grid.rows; ty++)
      if (this.grid.isOneway(tx, ty)) return { x: seg.x + seg.w / 2, y: ty * T };
    return seg.respawn;
  }

  /** Пол арены: первая твёрдая строка под центром сегмента. */
  private floorBelow(seg: Segment): number {
    const T = this.grid.size;
    const tx = Math.floor((seg.x + seg.w / 2) / T);
    for (let ty = Math.floor((seg.y + seg.h / 2) / T); ty < this.grid.rows; ty++)
      if (this.grid.isSolid(tx, ty)) return ty * T;
    return seg.y + seg.h;
  }

  /** Конец реплики (вход в арену): бой начинается. */
  resume(): void {
    this.frozen = false;
    if (this.boss?.waiting) this.boss.begin(this);
  }

  // ——— паника и ветер (арена Уралова) ———

  /** Управление инвертировано: паника дошла до 100%. */
  get controlsInverted(): boolean {
    return this.panicFrames > 0;
  }

  private addPanic(amount: number): void {
    if (this.panicFrames > 0) return;
    this.panic = Math.min(URALOV.panic.max, this.panic + amount);
    if (this.panic >= URALOV.panic.max) {
      this.panicFrames = URALOV.panic.invertFrames;
      this.emit({ type: 'sfx', name: 'hurt' });
    }
  }

  /** Попадание по боссу снимает часть паники. */
  private onBossHit(): void {
    if (this.boss?.name === 'uralov' && this.panicFrames === 0)
      this.panic = Math.max(0, this.panic - URALOV.panic.perHit);
  }

  /** Ветер для тела, px/кадр по горизонтали. */
  windFor(body: Rect): number {
    return this.boss ? this.boss.windFor(body) : 0;
  }

  private spawnEnemies(): void {
    for (const sp of this.level.spawns) {
      if (sp.type !== 'enemy' || this.spawnedEnemies.has(sp.id) || !isEnemyKind(sp.kind)) continue;
      if (!this.camera.sees({ x: sp.x, y: sp.y - 1, w: 1, h: 1 }, ENEMIES.spawnMargin)) continue;
      if (this.boss) continue;
      this.spawnedEnemies.add(sp.id);
      this.enemies.push(createEnemy(sp.kind, sp, sp.id));
    }
  }

  /** Возрождение в начале сегмента: камера, враги и предметы сегмента — как при первом проходе. */
  private resetSegment(): void {
    const seg = this.camera.segment;
    // Арена rise не начинается заново: платформы и босс продолжают подниматься.
    if (seg.dir === 'rise') {
      this.projectiles = [];
      return;
    }
    this.camera.enter(this.camera.index);
    this.enemies = [];
    this.projectiles = [];
    this.spawnedEnemies.clear();
    this.mech = buildMechanisms(this.level);
    const fresh: Item[] = [];
    for (const sp of this.level.spawns) {
      if (sp.type === 'item' && contains(seg, sp) && isItemKind(sp.kind)) {
        fresh.push(this.spawnItem(sp));
      }
    }
    const freshIds = new Set(fresh.map((i) => i.spawnId));
    this.items = this.items.filter(
      (i) => i.spawnId === null || !freshIds.has(i.spawnId) || i.state === 'carried',
    );
    this.items.push(...fresh.filter((f) => !this.items.some((i) => i.spawnId === f.spawnId)));
  }

  // ——— таймер холодильника (уровень 4) ———

  /**
   * ТЗ: «через три минуты превратитесь в лёд». Время вышло — все, кто в игре, теряют жизнь
   * (замерзают), таймер начинается заново.
   */
  private tickTimer(): void {
    if (this.timeLeft === null || this.level.timerFrames === null) return;
    if (--this.timeLeft > 0) return;
    this.timeLeft = this.level.timerFrames;
    for (const p of this.players) if (p.active && p.state !== 'respawn') p.kill(this);
  }

  /** Стоит ли тело на скользком полу (сплошной тайл под ногами на уровне со льдом). */
  onIce(b: Rect): boolean {
    if (!this.level.slippery) return false;
    const T = this.grid.size;
    const row = Math.floor((b.y + b.h + 1) / T);
    return (
      this.grid.isSolid(Math.floor(b.x / T), row) ||
      this.grid.isSolid(Math.floor((b.x + b.w - 1) / T), row)
    );
  }

  // ——— игроки ———

  private syncCarried(): void {
    for (const p of this.players) {
      const c = p.carrying;
      if (!c) continue;
      const pcx = p.x + p.w / 2;
      if (c.kind === 'item') {
        const it = c.item;
        it.x = pcx - it.w / 2;
        it.y = it.state === 'hiding' ? p.y + p.h - it.h : p.y - it.h;
        it.vx = 0;
        it.vy = 0;
      } else {
        const q = c.player;
        q.x = pcx - q.w / 2;
        q.y = p.y - q.h;
        q.facing = p.facing;
      }
    }
  }

  damagePlayer(p: Player, fromX: number): boolean {
    return p.hit(fromX, this);
  }

  /** Анимация гибели закончилась: минус жизнь, возрождение или выбывание. */
  onDeathFinished(p: Player): void {
    const res = loseLife(p.vitals);
    if (res === 'out') {
      p.stateTimer = 0;
      if (this.players.every((q) => q.out)) {
        this.gameOver = true;
        this.emit({ type: 'gameOver' });
      }
      return;
    }
    const partner = this.players.find((q) => q !== p && q.active && q.controlled);
    if (partner) {
      p.startRespawn(partner.x + partner.w / 2, partner.y + partner.h);
    } else {
      this.resetSegment();
      const r = this.respawnPoint();
      p.startRespawn(r.x, r.y);
    }
  }

  /** ↑ + действие с пустыми руками. Оба игрока в пределах окна — все враги на экране оглушены. */
  registerDuet(p: Player): void {
    p.duetFrame = this.frame;
    if (this.players.length < 2 || this.frame < this.duetReadyFrame) return;
    const ready = this.players.every(
      (q) =>
        q.active && q.carrying === null && this.frame - q.duetFrame <= BALANCE.duet.windowFrames,
    );
    if (!ready) return;
    for (const e of this.enemies)
      if (e.alive && this.camera.sees(e, 0)) e.stun = BALANCE.duet.stunFrames;
    this.duetReadyFrame = this.frame + BALANCE.duet.cooldownFrames;
    this.emit({ type: 'duet' });
  }

  get duetCooldown(): number {
    return Math.max(0, this.duetReadyFrame - this.frame);
  }

  throwItem(item: Item, thrower: Player, dir: ThrowDir): void {
    const pcx = thrower.x + thrower.w / 2;
    if (dir === 'up') {
      item.x = pcx - item.w / 2;
      item.y = thrower.y - item.h;
    } else {
      item.x = thrower.facing > 0 ? thrower.x + thrower.w : thrower.x - item.w;
      item.y = dir === 'forward' ? thrower.y : thrower.y + thrower.h - item.h;
    }
    item.launch(thrower, dir, thrower.facing);
    if (this.grid.rectHitsSolid(item)) {
      // Бросил вплотную к стене: предмет сразу врезается.
      item.x = pcx - item.w / 2;
      item.y = thrower.y - item.h;
      item.impact();
    }
  }

  extraGravityAt(p: Player): number {
    const feet = { x: p.x + p.w / 2, y: p.y + p.h - 1 };
    let g = 0;
    for (const z of this.level.zones) if (contains(z, feet)) g += ZONE_GRAVITY[z.kind] ?? 0;
    return g;
  }

  /** Твёрдые блоки для тела: лежащие ящики и кейсы (кроме самого тела). */
  solidsFor(body: Rect): Rect[] {
    return this.items.filter((i) => i.isSolid && i !== body && !overlaps(i, body));
  }

  nearestPlayer(from: Rect): Player | null {
    const fx = from.x + from.w / 2;
    const fy = from.y + from.h / 2;
    let best: Player | null = null;
    let bestD = Infinity;
    for (const p of this.players) {
      if (!p.active || p.state === 'respawn') continue;
      const d = Math.hypot(p.x + p.w / 2 - fx, p.y + p.h / 2 - fy);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  // ——— BossWorld ———

  target(from: Rect): Point | null {
    const p = this.nearestPlayer(from);
    return p ? { x: p.x + p.w / 2, y: p.y + p.h / 2 } : null;
  }

  spawn(p: Projectile): void {
    this.projectiles.push(p);
  }

  // ——— столкновения ———

  private resolveThrownItems(): void {
    for (const it of this.items) {
      if (it.state !== 'thrown') continue;
      // Неуязвимых (сосулька) брошенный предмет не берёт — пролетает мимо.
      const enemy = this.enemies.find((e) => e.alive && !e.invulnerable && overlaps(it, e));
      if (enemy) {
        enemy.alive = false;
        this.emit({ type: 'sfx', name: 'enemyHit' });
        it.impact();
        continue;
      }
      const boss = this.boss;
      if (boss && boss.harmful && overlaps(it, boss)) {
        if (boss.hit(this)) {
          this.onBossHit();
          it.impact();
        } else {
          // Босс неуязвим (летит или только что получил удар): предмет отскакивает со звоном.
          it.deflect();
          this.emit({ type: 'sfx', name: 'deflect' });
        }
        continue;
      }
      const partner = this.players.find(
        (p) =>
          p !== it.owner && p.active && p.state !== 'held' && !p.invulnerable && overlaps(it, p),
      );
      if (partner) {
        partner.stun();
        it.impact();
      }
    }
  }

  private resolveEnemyContacts(): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      // Враг, коснувшийся ящика-укрытия, гибнет.
      if (this.items.some((it) => it.state === 'hiding' && overlaps(it, e))) {
        if (e.invulnerable) {
          // Сосулька разбивается о ящик-укрытие.
          if (e.harmful) e.blocked(this);
          continue;
        }
        e.alive = false;
        this.emit({ type: 'sfx', name: 'enemyHit' });
        continue;
      }
      if (!e.harmful) continue;
      for (const p of this.players) {
        if (!p.active || p.state === 'held' || !overlaps(p, e)) continue;
        if (e.touchPlayerEffect() === 'slow') {
          if (!p.invulnerable) {
            p.addSlow();
            e.alive = false;
          }
        } else if (this.damagePlayer(p, e.x + e.w / 2)) {
          e.touchedPlayer(this);
        }
        break;
      }
    }
  }

  private resolveProjectiles(): void {
    for (const pr of this.projectiles) {
      if (!pr.alive) continue;
      for (const p of this.players) {
        if (!p.active || !overlaps(p, pr)) continue;
        if (p.state === 'hidden' && !pr.ignoresHide) {
          pr.alive = false;
          break;
        }
        if (pr.effect === 'panic') {
          if (p.state === 'held' || p.invulnerable) continue;
          // Заголовок не ранит — накачивает шкалу паники.
          this.addPanic(URALOV.panic.perHeadline);
          this.emit({ type: 'sfx', name: 'deflect' });
          pr.alive = false;
          break;
        }
        if (this.damagePlayer(p, pr.x + pr.w / 2)) {
          pr.alive = false;
          break;
        }
      }
    }
  }

  private updateBoss(boss: Boss): void {
    boss.update(this);
    // Арена помогает игроку: падающий сверху ящик тоже бьёт босса, если тот уязвим.
    // Кроме коробок крана Бордачёва: иначе он получает удары «от арены» (отзыв пользователя).
    for (const it of this.items) {
      if (
        it.state === 'falling' &&
        !it.fromCrane &&
        // Призрак Микитко: буквы падают сквозь него (запасные — сверху) и не бьют — только броском.
        !(boss instanceof Mikitko) &&
        it.vy > 0 &&
        overlaps(it, boss) &&
        boss.hit(this)
      ) {
        this.onBossHit();
        it.impact();
      }
    }
    // Кооп: брошенный напарник тоже бьёт босса (один раз за полёт) и отскакивает.
    for (const p of this.players) {
      if (!p.thrownFlight || p.thrownHit || !overlaps(p, boss) || !boss.harmful) continue;
      p.thrownHit = true;
      if (boss.hit(this)) this.onBossHit();
      else this.emit({ type: 'sfx', name: 'deflect' });
      p.vy = Math.max(p.vy, 1);
      p.vx = -p.vx;
    }
    if (boss.defeated) {
      this.projectiles = [];
      this.panic = 0;
      this.panicFrames = 0;
      return;
    }
    if (boss.harmful) {
      for (const p of this.players)
        if (p.active && !p.thrownFlight && overlaps(p, boss))
          this.damagePlayer(p, boss.x + boss.w / 2);
    }
    // Боеприпасы не кончаются: нет предмета на арене — сверху падает коробка.
    const arena = this.camera.segment;
    const hasAmmo = this.items.some(
      (i) => i.state !== 'gone' && overlaps(i, arena) && this.camera.sees(i, 0),
    );
    // На арене rise боеприпасы приносит кран (ТЗ); коробка сверху уехала бы за экран сразу.
    // Арена Микитко: буквы роняет только сам призрак (отзыв пользователя), сверху ничего не падает.
    if (hasAmmo || boss.state === 'intro' || arena.dir === 'rise' || boss instanceof Mikitko) {
      this.ammoTimer = 0;
    } else if (++this.ammoTimer >= BOSS_RULES.ammoDropFrames) {
      this.ammoTimer = 0;
      // Из жёлобов арены (точки ammo) по очереди; если их нет — в случайном месте под потолком.
      const chutes = this.level.spawns.filter((sp) => sp.type === 'ammo' && contains(arena, sp));
      const T = this.grid.size;
      const at =
        chutes.length > 0
          ? chutes[this.ammoDrops++ % chutes.length]!
          : { x: arena.x + this.rng.int(2 * T, arena.w - 2 * T), y: arena.y + 2 * T };
      // На арене архива вместо коробок — буквы.
      const kind: ItemKind = boss instanceof Mikitko ? 'letter' : 'box';
      this.items.push(new Item(kind, at));
    }
  }

  private collectPickups(): void {
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const p = this.players.find((q) => q.active && q.state !== 'held' && overlaps(q, pk));
      if (!p) continue;
      pk.taken = true;
      if (pk.kind === 'coffee') heal(p.vitals);
      else if (pk.kind === 'star') addLife(p.vitals);
      else p.timecodes++;
      this.emit({ type: 'pickup', kind: pk.kind, player: p.id });
    }
  }

  private riders(): Rider[] {
    return [
      ...this.players.filter((p) => p.active && p.state !== 'held'),
      ...this.items.filter((i) => i.state === 'resting' || i.state === 'falling'),
      ...this.enemies.filter((e) => e.alive),
    ];
  }

  /** До шага игроков: лифты едут к цели, вода поднимается, кораблик держится на ней. */
  private moveMechanisms(): void {
    const riders = this.riders();
    for (const l of this.mech.lifts) l.move(riders);
    for (const f of this.mech.floods) f.rise();
    for (const fl of this.mech.floaters) if (fl.shown) fl.follow(riders);
  }

  /** После шага игроков: приземления на помпы, вентиль-триггер, утопление. */
  private afterPlayersMechanisms(): void {
    const riders = this.riders();
    for (const l of this.mech.lifts)
      if (l.countLandings(riders)) this.emit({ type: 'sfx', name: 'lift' });
    // Тающие платформы: тает от игрока, вставшего на неё.
    const heroes = this.players.filter((p) => p.active && p.state !== 'held');
    for (const m of this.mech.melts) m.update(heroes.some((p) => m.isRider(p)));
    for (const tr of this.mech.triggers) {
      if (tr.fired || !this.players.some((p) => p.active && overlaps(p, tr.zone))) continue;
      tr.fired = true;
      for (const f of this.mech.floods) f.active = true;
      this.emit({ type: 'sfx', name: 'trigger' });
    }
    for (const f of this.mech.floods) {
      for (const p of this.players) if (p.active && p.state !== 'held' && f.drowns(p)) p.kill(this);
    }
  }

  /** Движущиеся платформы «только сверху»: помпы и всплывший кораблик. */
  platformsFor(body: Rect): Rect[] {
    const out: Rect[] = [];
    for (const l of this.mech.lifts) if (l !== body) out.push(l);
    for (const fl of this.mech.floaters) if (fl.active && fl !== body) out.push(fl);
    for (const m of this.mech.melts) if (m.active) out.push(m);
    return out;
  }

  /** Выход части: игрок коснулся зоны exit — часть пройдена. */
  private checkExit(): void {
    if (this.exited) return;
    const exits = this.level.zones.filter((z) => z.kind === 'exit');
    // Вошёл в дверь — центр игрока внутри проёма, а не просто коснулся краем.
    const inside = (p: Player, z: Rect) => contains(z, { x: p.x + p.w / 2, y: p.y + p.h - 1 });
    if (exits.some((z) => this.players.some((p) => p.active && inside(p, z)))) {
      this.exited = true;
      this.frozen = true;
      this.emit({ type: 'exit' });
    }
  }

  /** Состояние игроков для следующей части уровня. */
  carryOut(): PlayerCarry[] {
    return this.players.map((p) => ({ id: p.id, vitals: { ...p.vitals }, timecodes: p.timecodes }));
  }

  private checkPits(): void {
    for (const p of this.players) {
      if (p.active && p.state !== 'held' && p.state !== 'respawn' && this.camera.fellOut(p))
        p.kill(this);
    }
  }

  private cleanup(): void {
    const view = this.camera;
    // Арена rise: то, что уехало за верх или упало ниже экрана, пропало.
    if (view.segment.dir === 'rise') {
      for (const it of this.items) {
        if (it.state === 'carried' || it.state === 'hiding') continue;
        if (it.y + it.h < view.y || it.y > view.y + view.h) it.state = 'gone';
      }
    }
    for (const e of this.enemies)
      if (e.alive && !view.sees(e, ENEMIES.despawnMargin)) e.alive = false;
    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.items = this.items.filter((i) => i.state !== 'gone');
  }

  /** Шаг после победы над боссом: игроки стоят, босс опускается, предметы падают. */
  stepCinematic(): void {
    this.frame++;
    this.projectiles = [];
    this.boss?.update(this);
    for (const it of this.items)
      if (it.state === 'falling' || it.state === 'resting') it.update(this);
  }

  // ——— отладка ———

  setGod(on: boolean): void {
    for (const p of this.players) p.god = on;
  }

  /** F2: перенос к арене босса. */
  warpToBoss(): void {
    const idx = this.level.segments.findIndex((s) => s.boss !== null);
    if (idx < 0 || this.boss) return;
    this.camera.enter(idx);
    const r = this.respawnPoint();
    this.players.forEach((p, i) => {
      if (p.out) return;
      p.dropCarried();
      p.startRespawn(r.x + i * COOP_START_OFFSET, r.y);
    });
    this.onSegmentEntered(this.camera.segment);
  }
}
