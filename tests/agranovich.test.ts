import { describe, expect, it } from 'vitest';
import { AGRANOVICH as C, BOSS_RULES } from '../src/config/balance';
import { Agranovich, type BossWorld } from '../src/sim/bosses/Agranovich';
import type { Point } from '../src/sim/geom';
import type { Projectile } from '../src/sim/Projectile';
import { Rng } from '../src/sim/Rng';

class FakeWorld implements BossWorld {
  readonly rng = new Rng(7);
  shots: Projectile[] = [];
  events: string[] = [];
  constructor(public targetPoint: Point | null = { x: 0, y: 300 }) {}
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

const POINTS: Point[] = [
  { x: 64, y: 190 },
  { x: 192, y: 190 },
  { x: 96, y: 120 },
  { x: 160, y: 120 },
];

function untilState(b: Agranovich, w: FakeWorld, state: Agranovich['state'], max = 2000): number {
  for (let i = 0; i < max; i++) {
    if (b.state === state) return i;
    b.update(w);
  }
  throw new Error(`never reached ${state}, stuck in ${b.state}`);
}

function hitWhenStanding(b: Agranovich, w: FakeWorld): void {
  untilState(b, w, 'hover');
  b.invuln = 0;
  expect(b.hit(w)).toBe(true);
}

describe('Agranovich (boss 1)', () => {
  it('waits in intro until the dialogue ends, then flies', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    for (let i = 0; i < 100; i++) b.update(w);
    expect(b.state).toBe('intro');
    expect(b.harmful).toBe(false);
    b.begin(w);
    expect(b.state).toBe('fly');
  });

  it('cycles fly → hover → shoot → recover → fly', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    untilState(b, w, 'hover');
    untilState(b, w, 'shoot');
    b.update(w);
    expect(b.state).toBe('recover');
    untilState(b, w, 'fly');
  });

  it('telegraphs at least 20 frames before shooting', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    untilState(b, w, 'hover');
    let telegraph = 0;
    while (b.state === 'hover') {
      if (b.telegraphing) telegraph++;
      b.update(w);
    }
    expect(telegraph).toBeGreaterThanOrEqual(BOSS_RULES.minTelegraphFrames);
    expect(w.shots).toHaveLength(0);
  });

  it('stands still for ~1 s before shooting', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    untilState(b, w, 'hover');
    expect(untilState(b, w, 'shoot')).toBe(C.hoverFrames);
  });

  it('fires a fan of 3 latte streams towards the player, none going up', () => {
    const w = new FakeWorld({ x: 0, y: 260 });
    const b = new Agranovich(POINTS);
    b.begin(w);
    untilState(b, w, 'shoot');
    b.update(w);
    expect(w.shots).toHaveLength(C.streams.count);
    for (const s of w.shots) {
      expect(s.vy).toBeGreaterThanOrEqual(0);
      expect(s.vx).toBeLessThan(0);
    }
    expect(new Set(w.shots.map((s) => s.vy.toFixed(3))).size).toBe(C.streams.count);
  });

  it('a player above her is safe: the fan flattens to horizontal', () => {
    const w = new FakeWorld({ x: 0, y: 0 });
    const b = new Agranovich(POINTS);
    b.begin(w);
    untilState(b, w, 'shoot');
    b.update(w);
    for (const s of w.shots) expect(s.vy).toBe(0);
  });

  it('flies between its stops, never staying at the same one', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    const seen = new Set<string>();
    let last = '';
    for (let k = 0; k < 12; k++) {
      untilState(b, w, 'hover');
      const at = `${b.x},${b.y}`;
      expect(at).not.toBe(last);
      last = at;
      seen.add(at);
      untilState(b, w, 'fly');
    }
    expect(seen.size).toBe(POINTS.length);
  });

  it('can only be hit while standing; hit makes her invulnerable for 40 frames', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    expect(b.hit(w)).toBe(false);
    b.begin(w);
    expect(b.state).toBe('fly');
    expect(b.hit(w)).toBe(false);
    untilState(b, w, 'hover');
    expect(b.hit(w)).toBe(true);
    expect(b.hp).toBe(C.hp - 1);
    expect(b.invuln).toBe(BOSS_RULES.hitInvulnerableFrames);
    expect(b.hit(w)).toBe(false);
  });

  it('switches to phase 2 after 3 hits: 5 paintballs, faster timings at half HP', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    for (let i = 0; i < C.phase2AfterHits; i++) hitWhenStanding(b, w);
    expect(b.phase).toBe(2);
    expect(w.events).toContain('bossPhase');
    expect(b.timingFactor).toBe(BOSS_RULES.halfHpTimingFactor);
    untilState(b, w, 'fly');
    untilState(b, w, 'hover');
    w.shots = [];
    expect(untilState(b, w, 'shoot')).toBe(
      Math.round(C.hoverFrames * BOSS_RULES.halfHpTimingFactor),
    );
    // Очередь: шарики по одному с интервалом, каждый — в текущее положение игрока.
    const frames: number[] = [];
    for (let f = 0; f < 200 && b.state === 'shoot'; f++) {
      const before = w.shots.length;
      b.update(w);
      if (w.shots.length > before) frames.push(f);
      if (frames.length === 1) w.targetPoint = { x: 400, y: 300 }; // игрок перебежал
    }
    expect(w.shots).toHaveLength(C.paintballs.count);
    expect(w.shots.every((s) => s.kind === 'paintball' && s.vy >= 0)).toBe(true);
    expect(frames[1]! - frames[0]!).toBe(C.paintballs.intervalFrames);
    // Вся очередь — в точку начала: перебежавший игрок уходит от остальных шариков.
    for (const s of w.shots) expect(s.vx).toBeCloseTo(w.shots[0]!.vx);
  });

  it('after the last hit she comes to her senses: floats down to the floor and stays', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    for (let i = 0; i < C.hp; i++) hitWhenStanding(b, w);
    expect(b.defeated).toBe(true);
    expect(b.landed).toBe(false);
    for (let i = 0; i < 400 && !b.landed; i++) b.update(w);
    expect(b.landed).toBe(true);
    expect(b.y + b.h).toBe(b.restY);
    const y = b.y;
    for (let i = 0; i < 60; i++) b.update(w);
    expect(b.y).toBe(y);
    expect(b.hit(w)).toBe(false);
  });

  it('is defeated after 6 hits', () => {
    const w = new FakeWorld();
    const b = new Agranovich(POINTS);
    b.begin(w);
    for (let i = 0; i < C.hp; i++) hitWhenStanding(b, w);
    expect(b.state).toBe('defeated');
    expect(b.harmful).toBe(false);
    expect(w.events).toContain('bossDefeated');
    b.update(w);
    expect(b.state).toBe('defeated');
  });
});

describe('Agranovich in the world', () => {
  it('a box thrown up from below hits her while she stands, and bounces off while she flies', async () => {
    const { LEVELS } = await import('../src/data/levels');
    const { parseTiledLevel } = await import('../src/sim/level');
    const { World } = await import('../src/sim/World');
    const { TestInput } = await import('./helpers');
    const w = new World(parseTiledLevel(LEVELS[1]![3]!.map), [{ id: 1, hero: 'sergey' }]);
    w.setGod(true);
    w.warpToBoss();
    w.resume();
    const b = w.boss!;
    const p = w.players[0]!;
    const inp = new TestInput();
    const arena = w.camera.segment;
    // После переноса игрок мигает в состоянии respawn — ждём, пока получит управление.
    for (let i = 0; i < 60 && !p.controlled; i++) w.step({ 1: inp.hold() });
    const throwUpWhile = (state: 'fly' | 'hover') => {
      // Босс высоко над центром арены, игрок на полу под ним с коробкой.
      b.x = arena.x + arena.w / 2 - b.w / 2;
      b.y = arena.y + 100;
      b.state = state;
      b.timer = 1000;
      b.invuln = 0;
      const box = w.items.find((i) => i.kind === 'box' && i.state !== 'carried')!;
      p.placeAt(b.x + b.w / 2, arena.y + 208);
      box.state = 'carried';
      box.owner = p;
      p.carrying = { kind: 'item', item: box };
      w.drainEvents();
      w.step({ 1: inp.hold() });
      w.step({ 1: inp.hold('up', 'action') });
      for (let i = 0; i < 30 && (box.state as string) === 'thrown'; i++) {
        b.x = arena.x + arena.w / 2 - b.w / 2;
        b.y = arena.y + 100;
        w.step({ 1: inp.hold() });
      }
      return box;
    };
    const hp = b.hp;
    const deflected = throwUpWhile('fly');
    expect(b.hp).toBe(hp);
    expect(deflected.state).not.toBe('gone');
    expect(w.drainEvents().some((e) => e.type === 'sfx' && e.name === 'deflect')).toBe(true);
    throwUpWhile('hover');
    expect(b.hp).toBe(hp - 1);
  });

  it('a box falling from above hurts her too (the arena helps the player)', async () => {
    const { LEVELS } = await import('../src/data/levels');
    const { parseTiledLevel } = await import('../src/sim/level');
    const { World } = await import('../src/sim/World');
    const { Item } = await import('../src/sim/Item');
    const { TestInput } = await import('./helpers');
    const w = new World(parseTiledLevel(LEVELS[1]![3]!.map), [{ id: 1, hero: 'sergey' }]);
    w.setGod(true);
    w.warpToBoss();
    w.resume();
    const b = w.boss!;
    const arena = w.camera.segment;
    // В просвете по центру над пеной — над ней ничего нет, коробка падает прямо на неё.
    b.x = arena.x + 112;
    b.y = arena.y + 130;
    b.state = 'hover';
    b.timer = 1000;
    b.invuln = 0;
    const hp = b.hp;
    const dropped = new Item('box', { x: b.x + b.w / 2, y: b.y - 4 });
    w.items.push(dropped);
    const inp = new TestInput();
    for (let i = 0; i < 20 && b.hp === hp; i++) w.step({ 1: inp.hold() });
    expect(b.hp).toBe(hp - 1);
  });
});
