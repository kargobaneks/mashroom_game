import { describe, expect, it } from 'vitest';
import { BOSS_RULES, URALOV as C } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import type { BossWorld } from '../src/sim/bosses/Boss';
import { Uralov } from '../src/sim/bosses/Uralov';
import type { Point } from '../src/sim/geom';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import type { Player } from '../src/sim/Player';
import { Projectile } from '../src/sim/Projectile';
import { Rng } from '../src/sim/Rng';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { drive } from './autopilot';
import { TestInput } from './helpers';

const ARENA = { x: 0, y: 0, w: 256, h: 240 };
const FLOOR = 208;

class FakeWorld implements BossWorld {
  readonly rng = new Rng(3);
  shots: Projectile[] = [];
  events: string[] = [];
  constructor(public targetPoint: Point | null = { x: 60, y: 196 }) {}
  target(): Point | null {
    return this.targetPoint;
  }
  spawn(p: Projectile): void {
    this.shots.push(p);
  }
  emit(ev: { type: string }): void {
    this.events.push(ev.type);
  }
}

function until(b: Uralov, w: FakeWorld, state: Uralov['state'], max = 3000): number {
  for (let i = 0; i < max; i++) {
    if (b.state === state) return i;
    b.update(w);
  }
  throw new Error(`never reached ${state}, stuck in ${b.state}`);
}

describe('Uralov (boss 2): figure-eight, headlines, wing gust', () => {
  it('flies a figure-eight over the whole arena, high enough to stand under him', () => {
    const w = new FakeWorld();
    const b = new Uralov(ARENA, FLOOR);
    b.begin(w);
    until(b, w, 'loop');
    let minX = Infinity;
    let maxX = -Infinity;
    let maxBottom = -Infinity;
    let crossings = 0;
    let prevCx = b.x + b.w / 2;
    for (let i = 0; i < C.loop.periodFrames; i++) {
      b.update(w);
      const cx = b.x + b.w / 2;
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x + b.w);
      maxBottom = Math.max(maxBottom, b.y + b.h);
      if ((prevCx - 128) * (cx - 128) < 0) crossings++;
      prevCx = cx;
    }
    // Восьмёрка: обе половины арены, дважды через центр.
    expect(minX).toBeLessThan(64);
    expect(maxX).toBeGreaterThan(192);
    expect(crossings).toBeGreaterThanOrEqual(1);
    // Стоящего на полу (голова на 184) не задевает; в прыжке (~40 px) — можно.
    expect(maxBottom).toBeLessThan(FLOOR - 24);
    expect(maxBottom).toBeGreaterThan(FLOOR - 24 - 40);
  });

  it('drops 2 panic headlines every 3 s; they fall and do not hurt, they add panic', () => {
    const w = new FakeWorld();
    const b = new Uralov(ARENA, FLOOR);
    b.begin(w);
    until(b, w, 'loop');
    const drops: number[] = [];
    for (let f = 0; f < 400 && b.state === 'loop'; f++) {
      const before = w.shots.length;
      b.update(w);
      if (w.shots.length > before) drops.push(w.shots.length - before);
    }
    expect(drops[0]).toBe(2);
    for (const s of w.shots) {
      expect(s.kind).toBe('headline');
      expect(s.effect).toBe('panic');
      expect(s.vy).toBeGreaterThan(0);
    }
  });

  it('then flies to the wall far from the player, telegraphs, and blows wind away from him', () => {
    const w = new FakeWorld({ x: 200, y: 196 }); // игрок справа → дует от левой стены
    const b = new Uralov(ARENA, FLOOR);
    b.begin(w);
    until(b, w, 'telegraph');
    expect(b.side).toBe(-1);
    expect(b.x + b.w / 2).toBeLessThan(64);
    expect(b.telegraphing).toBe(true);
    const tele = until(b, w, 'gust');
    expect(tele).toBeGreaterThanOrEqual(BOSS_RULES.minTelegraphFrames);
    const body = { x: 120, y: 184, w: 12, h: 24 };
    expect(b.windFor(body)).toBeGreaterThan(0); // вправо, от него
    // По ветру летят заголовки.
    const n = w.shots.length;
    for (let i = 0; i < C.gustFrames; i++) b.update(w);
    const blown = w.shots.slice(n);
    expect(blown.length).toBeGreaterThanOrEqual(2);
    for (const s of blown) expect(s.vx).toBeGreaterThan(0);
    expect(b.windFor(body)).toBe(0);
    expect(b.state).toBe('enter');
  });

  it('6 hits; after a hit he is invulnerable for 32 frames; defeated, he lands on the floor', () => {
    const w = new FakeWorld();
    const b = new Uralov(ARENA, FLOOR);
    b.begin(w);
    expect(b.hit(w)).toBe(true);
    expect(b.hit(w)).toBe(false);
    for (let i = 0; i < BOSS_RULES.hitInvulnerableFrames; i++) b.update(w);
    for (let k = 1; k < C.hp; k++) {
      expect(b.hit(w)).toBe(true);
      for (let i = 0; i < BOSS_RULES.hitInvulnerableFrames; i++) b.update(w);
    }
    expect(b.defeated).toBe(true);
    expect(w.events).toContain('bossDefeated');
    for (let i = 0; i < 400 && !b.landed; i++) b.update(w);
    expect(b.landed).toBe(true);
    expect(b.y + b.h).toBe(FLOOR);
  });
});

// ——— В мире: арена 2-2 ———

const arenaWorld = (players: 1 | 2 = 1): World => {
  const setup =
    players === 2
      ? [
          { id: 1 as const, hero: 'sergey' as const },
          { id: 2 as const, hero: 'ivan' as const },
        ]
      : [{ id: 1 as const, hero: 'sergey' as const }];
  const w = new World(parseTiledLevel(LEVELS[2]![1]!.map), setup);
  w.warpToBoss();
  w.resume();
  // Дождаться конца возрождения и мигания.
  const input = new TestInput();
  for (let i = 0; i < 200 && w.players.some((p) => p.invulnerable); i++)
    w.step({ 1: input.hold(), 2: input.hold() });
  return w;
};

const uralovOf = (w: World): Uralov => {
  const b = w.boss;
  if (!(b instanceof Uralov)) throw new Error('no Uralov');
  return b;
};

describe('Uralov arena', () => {
  it('entering the machine hall starts the fight with Uralov', () => {
    const w = new World(parseTiledLevel(LEVELS[2]![1]!.map), [{ id: 1, hero: 'sergey' }]);
    drive(w, () => w.boss !== null, 60 * 20);
    expect(w.boss?.name).toBe('uralov');
    expect(w.frozen).toBe(true);
  });

  it('a headline touching the player adds 20% panic; at 100% left and right swap for 5 s', () => {
    const w = arenaWorld();
    const p = w.players[0]!;
    const input = new TestInput();
    for (let k = 0; k < 5; k++) {
      // Свежий заголовок прямо на игроке.
      w.projectiles = [fakeHeadline(p)];
      p.vitals.invuln = 0;
      w.step({ 1: input.hold() });
      if (k < 4) expect(w.panic).toBe((k + 1) * C.panic.perHeadline);
    }
    expect(w.controlsInverted).toBe(true);
    expect(p.vitals.hearts).toBe(3); // заголовки не ранят
    // Управление наоборот: «вправо» ведёт влево.
    w.projectiles = [];
    const x0 = p.x;
    for (let i = 0; i < 10; i++) w.step({ 1: input.hold('right') });
    expect(p.x).toBeLessThan(x0);
    for (let i = 0; i < C.panic.invertFrames; i++) w.step({ 1: input.hold() });
    expect(w.controlsInverted).toBe(false);
    expect(w.panic).toBe(0);
  });

  it('the wing gust pushes a standing player away; walking into it still makes progress', () => {
    const w = arenaWorld();
    const p = w.players[0]!;
    const b = uralovOf(w);
    const input = new TestInput();
    w.setGod(true);
    for (let i = 0; i < 3000 && b.state !== 'gust'; i++) w.step({ 1: input.hold() });
    expect(b.state).toBe('gust');
    const away = -b.side; // куда дует
    const arenaX = w.camera.segment.x;
    p.placeAt(arenaX + 128, 208);
    const x0 = p.x;
    for (let i = 0; i < 30; i++) w.step({ 1: input.hold() });
    expect((p.x - x0) * away).toBeGreaterThan(20);
    const x1 = p.x;
    const toward: Action = away > 0 ? 'left' : 'right';
    for (let i = 0; i < 30; i++) w.step({ 1: input.hold(toward) });
    expect((p.x - x1) * away).toBeLessThan(-10);
  });

  it('a box thrown up from under him hits and takes 30% panic off', () => {
    const w = arenaWorld();
    const p = w.players[0]!;
    const b = uralovOf(w);
    w.setGod(true);
    const input = new TestInput();
    // Дождаться восьмёрки и поставить игрока под ним с ящиком в руках.
    for (let i = 0; i < 600 && b.state !== 'loop'; i++) w.step({ 1: input.hold() });
    w.panic = 60;
    const box = new Item('box', { x: 0, y: 0 });
    w.items.push(box);
    box.state = 'carried';
    box.owner = p;
    p.carrying = { kind: 'item', item: box };
    let hit = false;
    for (let i = 0; i < 300 && !hit; i++) {
      // Встать под ним и бросить вверх.
      p.placeAt(b.x + b.w / 2, 208);
      w.step({ 1: input.hold('up', 'action') });
      w.step({ 1: input.hold() });
      for (let k = 0; k < 30 && (box.state as string) === 'thrown'; k++)
        w.step({ 1: input.hold() });
      hit = b.hp < b.maxHp;
      if (!hit) {
        // Не попал — взять ящик снова.
        box.state = 'carried';
        box.owner = p;
        p.carrying = { kind: 'item', item: box };
      }
    }
    expect(hit).toBe(true);
    expect(w.panic).toBe(60 - C.panic.perHit);
  });

  it('co-op: a partner thrown upward hits him too', () => {
    const w = arenaWorld(2);
    const [p1, p2] = w.players as [Player, Player];
    const b = uralovOf(w);
    w.setGod(true);
    const input = new TestInput();
    const idle = new TestInput();
    w.step({ 1: input.hold(), 2: idle.hold() });
    for (let i = 0; i < 600 && b.state !== 'loop'; i++) w.step({ 1: input.hold(), 2: idle.hold() });
    let hit = false;
    for (let attempt = 0; attempt < 40 && !hit; attempt++) {
      // Взять напарника на руки, встать под боссом, бросить вверх.
      const cx = b.x + b.w / 2;
      p1.placeAt(cx, 208);
      p2.placeAt(cx + 14, 208);
      p1.facing = 1;
      w.step({ 1: input.hold('right', 'action'), 2: idle.hold() });
      if (p1.carrying?.kind !== 'player') continue;
      w.step({ 1: input.hold(), 2: idle.hold() }); // отпустить кнопку
      p1.placeAt(b.x + b.w / 2, 208);
      w.step({ 1: input.hold('up', 'action'), 2: idle.hold() });
      for (let k = 0; k < 60 && p2.thrownFlight; k++) w.step({ 1: input.hold(), 2: idle.hold() });
      hit = b.hp < b.maxHp;
    }
    expect(hit).toBe(true);
  });
});

/** Заголовок, накрывший игрока. */
function fakeHeadline(p: Player): Projectile {
  return new Projectile('headline', p.x + p.w / 2, p.y + p.h / 2, 16, 12, 0, 0, 0, false, 'panic');
}

describe('Uralov fight is winnable with buttons only (bot: pick up a box, get under him, throw up)', () => {
  it('a simple bot beats him; the ammo never runs out', () => {
    const w = arenaWorld();
    const p = w.players[0]!;
    const b = uralovOf(w);
    w.setGod(true);
    const input = new TestInput();
    let prev: Action[] = [];
    let frames = 0;
    let hpLog = '';
    for (; frames < 60 * 180 && !b.defeated; frames++) {
      const cx = p.x + p.w / 2;
      const flip = w.controlsInverted;
      const go = (dx: number): Action => (dx > 0 !== flip ? 'right' : 'left');
      let keys: Action[] = [];
      if (p.carriedItem) {
        const dx = b.x + b.w / 2 - cx;
        if (Math.abs(dx) < 6 && p.onGround) keys = ['up', 'action'];
        else keys = [go(dx)];
      } else if (p.controlled) {
        const box = w.items
          .filter((i) => i.state === 'resting' && i.x >= w.camera.x)
          .sort((a, c) => Math.abs(a.x - cx) - Math.abs(c.x - cx))[0];
        if (box) {
          const dx = box.x + box.w / 2 - cx;
          keys = Math.abs(dx) <= 16 ? [go(dx), 'action'] : [go(dx)];
        }
      }
      // Нажатие действия — только по фронту.
      if (keys.includes('action') && prev.includes('action'))
        keys = keys.filter((k) => k !== 'action');
      prev = keys;
      w.step({ 1: input.hold(...keys) });
      if (frames % 600 === 0) hpLog += `${b.hp} `;
    }
    if (!b.defeated)
      throw new Error(
        `not beaten in ${frames} frames, hp log: ${hpLog} items: ${w.items.map((i) => `${i.state}@${i.x.toFixed(0)},${i.y.toFixed(0)}`).join(' ')} p: ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.state} carrying ${p.carrying?.kind}`,
      );
    expect(frames).toBeLessThan(60 * 120);
  });
});
