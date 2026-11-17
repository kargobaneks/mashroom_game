import { describe, expect, it } from 'vitest';
import { LAIR_ENEMIES } from '../src/config/enemies';
import { LAIR } from '../src/config/mechanisms';
import { LEVELS } from '../src/data/levels';
import { AmbushRat, Bird, Cannon, CannonBall, Laser, Nest } from '../src/sim/enemies/LairEnemies';
import { Icicle } from '../src/sim/enemies/Icicle';
import { Item } from '../src/sim/Item';
import { parseTiledLevel, type LevelData } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';
import { followRoute, type Target } from './planner';

const parts = LEVELS[9]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);
const P = { c1: 0, c2: 1, bonus: 2, c3: 3, c4: 4, c5: 5, simes: 6, arena: 7, escape: 8 };
/** Без врагов, кроме лазеров (лазер — механизм пресса). */
const calm = (l: LevelData): LevelData => ({
  ...l,
  spawns: l.spawns.filter((s) => s.type !== 'enemy' || s.kind === 'laser'),
});
const world = (l: LevelData) => new World(l, [{ id: 1, hero: 'sergey' }]);

function run(w: World, input: TestInput, frames: number, keys: Action[] = []): void {
  for (let f = 0; f < frames; f++) w.step({ 1: input.hold(...keys) });
}

function place(w: World, x: number, feet: number): void {
  const p = w.players[0]!;
  p.x = x - p.w / 2;
  p.y = feet - p.h;
  p.vx = 0;
  p.vy = 0;
}

const count = (l: LevelData, type: string, kind?: string) =>
  l.spawns.filter((s) => s.type === type && (kind === undefined || s.kind === kind)).length;
const boxesWith = (l: LevelData, what: string) =>
  l.spawns.filter((s) => s.type === 'item' && s.contains === what).length;

describe('level 9 data (as in the ROM breakdown)', () => {
  it('parts: 9-1, 9-2, bonus, 9-3, 9-4, 9-5, Simes, arena, escape', () => {
    expect(parts).toHaveLength(9);
    expect(level(P.arena).segments[0]!.boss).toBe('machine');
    expect(level(P.escape).timerFrames).toBe(60 * 60);
    expect(level(P.bonus).zones.some((z) => z.kind === 'helper')).toBe(true);
    expect(level(P.simes).zones.some((z) => z.kind === 'simes')).toBe(true);
  });

  it('boxes: 18 (1 tc), 14 (1 tc, 1 coffee), 19 (2 tc), 21 (none), 28 (7 coffee) = 100', () => {
    const boxes = [P.c1, P.c2, P.c3, P.c4, P.c5].map((i) => count(level(i), 'item', 'box'));
    expect(boxes).toEqual([18, 14, 19, 21, 28]);
    expect(boxesWith(level(P.c1), 'timecode')).toBe(1);
    expect(boxesWith(level(P.c2), 'timecode')).toBe(1);
    expect(boxesWith(level(P.c2), 'coffee')).toBe(1);
    expect(boxesWith(level(P.c3), 'timecode')).toBe(2);
    expect(count(level(P.c4), 'pickup')).toBe(0);
    expect(boxesWith(level(P.c5), 'coffee')).toBe(7);
    // DANGER из таймкодов — почти сотня (в оригинале 84 плашки).
    expect(count(level(P.c5), 'pickup', 'timecode')).toBeGreaterThan(80);
  });

  it('enemies and mechanisms per part', () => {
    const l1 = level(P.c1);
    expect(count(l1, 'enemy', 'slingRat')).toBe(3);
    expect(count(l1, 'enemy', 'ambushRat')).toBe(2);
    expect(count(l1, 'lever')).toBe(2);
    expect(l1.zones.filter((z) => z.kind === 'conveyor')).toHaveLength(2);
    const l2 = level(P.c2);
    expect(count(l2, 'enemy', 'nest')).toBe(5);
    expect(count(l2, 'enemy', 'eggNest')).toBe(1);
    const l3 = level(P.c3);
    expect(count(l3, 'enemy', 'laser')).toBe(6);
    expect(count(l3, 'enemy', 'mechDog')).toBe(3);
    expect(count(l3, 'lever')).toBe(2);
    expect(count(level(P.c4), 'enemy', 'cannon')).toBe(4);
    expect(count(level(P.c5), 'enemy', 'crab')).toBe(3);
    expect(count(level(P.escape), 'enemy', 'rubble')).toBeGreaterThan(8);
  });
});

describe('conveyor and lever (original: 1.5 px/frame left; a low throw flips all belts)', () => {
  it('the belt carries a standing hero left at 1.5 px/frame', () => {
    const w = world(calm(level(P.c1)));
    const belt = w.mech.conveyors[0]!;
    place(w, belt.x + 96, belt.y);
    const input = new TestInput();
    run(w, input, 2);
    const x0 = w.players[0]!.x;
    run(w, input, 20);
    expect(w.players[0]!.x - x0).toBeCloseTo(-LAIR.conveyor.speed * 20, 0);
  });

  it('a normal throw flies over the lever; a low throw (↓ + action) flips the belts', () => {
    const w = world(calm(level(P.c1)));
    const lever = w.mech.levers[0]!;
    const input = new TestInput();
    const p = w.players[0]!;
    w.camera.x = lever.x - 120;
    const pickAndThrow = (low: boolean) => {
      w.items = [new Item('box', { x: lever.x - 24, y: lever.y + lever.h })];
      place(w, lever.x - 8, lever.y + lever.h);
      p.facing = -1;
      run(w, input, 2, ['left']);
      run(w, input, 1, ['left', 'action']);
      run(w, input, 1);
      expect(p.carrying).not.toBeNull();
      run(w, input, 1, ['right']);
      run(w, input, 1);
      if (low) {
        run(w, input, 6, ['down']);
        run(w, input, 1, ['down', 'action']);
      } else run(w, input, 1, ['action']);
      run(w, input, 40);
    };
    pickAndThrow(false);
    expect(w.mech.belt.dir).toBe(-1);
    pickAndThrow(true);
    expect(w.mech.belt.dir).toBe(1);
    pickAndThrow(true);
    expect(w.mech.belt.dir).toBe(-1);
  });
});

describe('lasers (original: 120 on, 121 off; phases 0 / +4 / +32)', () => {
  it('cycle 241 frames, harmful only when on', () => {
    const l = new Laser({ x: 100, y: 192, h: 40, phase: 0 }, 1);
    const w = world(calm(level(P.c3)));
    let on = 0;
    for (let f = 0; f < 241; f++) {
      w.frame = f;
      l.step(w);
      if (l.harmful) on++;
    }
    expect(on).toBe(LAIR_ENEMIES.laser.onFrames);
    expect(l.h).toBe(40);
  });

  it('a hero under a burning laser gets hurt', () => {
    const w = world(calm(level(P.c3)));
    const input = new TestInput();
    w.camera.x = 256;
    run(w, input, 1);
    const laser = w.enemies.find((e): e is Laser => e instanceof Laser);
    expect(laser).toBeDefined();
    let f = 0;
    while (!laser!.on && f++ < 300) run(w, input, 1);
    const hearts = w.players[0]!.vitals.hearts;
    place(w, laser!.x + laser!.w / 2, laser!.y + laser!.h);
    run(w, input, 2);
    expect(w.players[0]!.vitals.hearts).toBe(hearts - 1);
  });
});

describe('level 9 enemies', () => {
  it('a nest sends a bird every 160 frames from the right edge, flying left at 2 px/frame', () => {
    const w = world(calm(level(P.c2)));
    const nest = new Nest({ x: 232, y: 64 }, 99);
    w.addEnemy(nest);
    const input = new TestInput();
    run(w, input, LAIR_ENEMIES.nest.firstFrames + 1);
    const birds = () => w.enemies.filter((e) => e instanceof Bird);
    expect(birds()).toHaveLength(1);
    const b = birds()[0]!;
    expect(b.x + b.w).toBeGreaterThan(w.camera.x + w.camera.w);
    const x0 = b.x;
    run(w, input, 10);
    expect(x0 - b.x).toBeCloseTo(20, 5);
    expect(b.y + b.h).toBeLessThanOrEqual(64 + 0.01);
    run(w, input, LAIR_ENEMIES.nest.everyFrames);
    expect(birds().some((x) => x !== b)).toBe(true);
  });

  it('the egg bird drops a comment bot after ~90 px', () => {
    const w = world(calm(level(P.c2)));
    w.addEnemy(new Nest({ x: 232, y: 64 }, 98, true));
    const input = new TestInput();
    run(w, input, LAIR_ENEMIES.nest.firstFrames + 60);
    expect(w.enemies.some((e) => e.kind === 'bot')).toBe(true);
  });

  it('the cannon keeps one ball at a time; the ball bounces off floor and ceiling', () => {
    const w = world(calm(level(P.c4)));
    const input = new TestInput();
    const cannon = new Cannon({ x: 200, y: 98 }, 97);
    w.addEnemy(cannon);
    place(w, 120, 160);
    run(w, input, LAIR_ENEMIES.cannon.reloadFrames + 2);
    const balls = () => w.enemies.filter((e): e is CannonBall => e instanceof CannonBall);
    expect(balls()).toHaveLength(1);
    const ball = balls()[0]!;
    expect(ball.invulnerable).toBe(true);
    let flips = 0;
    let vy = ball.vy;
    for (let f = 0; f < 120 && ball.alive; f++) {
      run(w, input, 1, ['left']);
      if (Math.sign(ball.vy) !== Math.sign(vy)) flips++;
      vy = ball.vy;
      expect(balls().length).toBeLessThanOrEqual(1);
    }
    expect(flips).toBeGreaterThanOrEqual(1);
  });

  it('the ambush rat sleeps invisible until it scrolls to the left edge, then chases', () => {
    const w = world(calm(level(P.c1)));
    const rat = new AmbushRat({ x: w.camera.x + 100, y: 192 + 240 }, 96);
    w.addEnemy(rat);
    expect(rat.harmful).toBe(false);
    expect(rat.hidden).toBe(true);
    w.camera.x += 100;
    const input = new TestInput();
    run(w, input, 1);
    expect(rat.awake).toBe(true);
    expect(rat.harmful).toBe(true);
  });

  it('escape rubble falls on a hero below and regrows', () => {
    const w = world(level(P.escape));
    const r = w.level.spawns.find((s) => s.kind === 'rubble')!;
    const input = new TestInput();
    place(w, r.x - 30, 192);
    run(w, input, 2);
    const rub = w.enemies.find((e): e is Icicle => e instanceof Icicle)!;
    expect(rub.kind).toBe('rubble');
    place(w, r.x, 192);
    run(w, input, 60);
    expect(rub.state === 'fall' || rub.state === 'regrow').toBe(true);
  });
});

describe('level 9 walkthroughs (route bot, buttons only, no enemies, no hits)', () => {
  const surf = (sx: number, sy: number, r: number, c0: number, c1: number): Target => ({
    kind: 'surface',
    y: sy * 240 + r * 16,
    x0: sx * 256 + c0 * 16,
    x1: sx * 256 + (c1 + 1) * 16,
  });
  const flat = (n: number, r: number, c0: number, c1: number) => surf(n, 0, r, c0, c1);

  function walk(w: World, route: Target[], maxFrames: number): number {
    let exited = false;
    let deaths = 0;
    const hearts = w.players[0]!.vitals.hearts;
    const res = followRoute(w, route, maxFrames, () => {
      for (const e of w.drainEvents()) {
        if (e.type === 'exit') exited = true;
        if (e.type === 'helper') w.resume();
      }
      if (w.players[0]!.state === 'dead') deaths++;
    });
    const p = w.players[0]!;
    expect(
      res.stuckAt,
      `stuck before ${res.stuckAt} at x=${p.x.toFixed(0)} y=${(p.y + p.h).toFixed(0)}`,
    ).toBeNull();
    const input = new TestInput();
    for (let f = 0; f < 400 && !exited; f++) {
      w.step({ 1: input.hold('right') });
      for (const e of w.drainEvents()) {
        if (e.type === 'exit') exited = true;
        if (e.type === 'helper') w.resume();
      }
    }
    expect(exited).toBe(true);
    expect(deaths).toBe(0);
    expect(p.vitals.hearts).toBe(hearts);
    return res.frames;
  }

  it('9-1: belts (against the push), up the pipes, past the ambush to the exit', () => {
    const SC: Record<number, [number, number]> = {
      0: [0, 1],
      1: [1, 1],
      2: [2, 1],
      3: [3, 1],
      4: [4, 1],
      5: [4, 0],
      6: [5, 0],
      7: [6, 0],
    };
    const S = (n: number, r: number, c0: number, c1: number) =>
      surf(SC[n]![0], SC[n]![1], r, c0, c1);
    walk(
      world(calm(level(P.c1))),
      [
        S(0, 10, 4, 6),
        S(0, 8, 5, 7),
        S(0, 8, 10, 12),
        S(1, 12, 0, 2),
        S(1, 10, 3, 3),
        S(1, 10, 5, 9),
        S(1, 10, 11, 13),
        S(1, 8, 13, 15),
        S(2, 9, 0, 0),
        S(2, 10, 1, 1),
        S(2, 10, 7, 9),
        S(2, 10, 12, 15),
        S(3, 9, 0, 0),
        S(3, 10, 1, 1),
        S(3, 10, 7, 9),
        S(3, 10, 12, 15),
        S(4, 10, 6, 9),
        S(4, 8, 11, 15),
        S(4, 6, 6, 10),
        S(4, 4, 1, 5),
        S(4, 2, 6, 12),
        S(4, 0, 1, 5),
        S(5, 13, 6, 10),
        S(5, 11, 2, 5),
        S(5, 9, 6, 10),
        S(5, 9, 12, 15),
        S(6, 9, 0, 2),
        S(6, 10, 7, 12),
        S(6, 8, 11, 15),
        S(7, 12, 4, 5),
        S(7, 10, 8, 10),
        S(7, 8, 12, 14),
      ],
      60 * 300,
    );
  }, 900_000);

  it('9-2: over the scaffold stands and hanging platforms to the exit', () => {
    const S = flat;
    walk(
      world(calm(level(P.c2))),
      [
        S(0, 11, 8, 10),
        S(0, 9, 12, 14),
        S(1, 11, 4, 7),
        S(1, 9, 10, 10),
        S(1, 7, 11, 11),
        S(1, 9, 12, 15),
        S(2, 10, 2, 4),
        S(2, 9, 8, 10),
        S(2, 13, 12, 15),
        S(3, 11, 3, 5),
        S(3, 13, 6, 9),
        S(3, 12, 10, 11),
        S(3, 11, 13, 15),
        S(4, 11, 2, 2),
        S(4, 11, 4, 6),
        S(4, 9, 4, 6),
        S(4, 8, 7, 8),
        S(4, 9, 9, 12),
        S(4, 12, 14, 15),
        S(5, 11, 2, 3),
        S(5, 9, 5, 7),
        S(5, 11, 9, 10),
        S(5, 12, 12, 13),
        S(6, 11, 1, 3),
        S(6, 9, 3, 7),
        S(6, 8, 8, 9),
        S(6, 9, 10, 13),
      ],
      60 * 240,
    );
  }, 900_000);

  it('bonus and Simes rooms: the guest speaks, the door leads on', () => {
    for (const i of [P.bonus, P.simes]) {
      const w = world(level(i));
      let helped = false;
      const input = new TestInput();
      for (let f = 0; f < 600; f++) {
        w.step({ 1: input.hold('right') });
        for (const e of w.drainEvents()) {
          if (e.type === 'helper') {
            helped = true;
            w.resume();
          }
          if (e.type === 'exit') f = 1e9;
        }
      }
      expect(helped).toBe(true);
    }
  });

  it('9-3: under the lasers (the belt switched by the lever), past the dogs to the exit', () => {
    const w = world(calm(level(P.c3)));
    // Рычаг переключают низким броском (тест выше); здесь лента уже помогает.
    w.mech.belt.dir = 1;
    const S = flat;
    walk(
      w,
      [
        S(0, 10, 3, 5),
        S(0, 8, 5, 9),
        S(0, 12, 14, 15),
        S(1, 11, 0, 1),
        S(1, 12, 4, 5),
        S(2, 12, 0, 0),
        S(2, 12, 2, 2),
        S(2, 12, 4, 5),
        S(3, 12, 0, 3),
        S(3, 12, 0, 3),
        S(3, 10, 4, 4),
        S(3, 12, 6, 8),
        S(3, 10, 9, 9),
        S(3, 9, 10, 11),
        S(3, 10, 12, 15),
        S(4, 10, 0, 2),
        S(4, 10, 4, 8),
        S(4, 8, 9, 9),
        S(4, 10, 10, 14),
        S(5, 12, 0, 1),
        S(5, 11, 2, 3),
        S(5, 10, 5, 10),
        S(5, 8, 11, 11),
        S(5, 10, 13, 15),
        S(6, 10, 3, 5),
        S(6, 12, 7, 9),
        S(6, 10, 10, 11),
        S(6, 10, 13, 14),
      ],
      60 * 240,
    );
  }, 900_000);

  it('9-4: over the box stacks along the low corridor to the exit', () => {
    const S = flat;
    walk(
      world(calm(level(P.c4))),
      [
        S(0, 10, 1, 3),
        S(0, 8, 4, 5),
        S(0, 10, 6, 13),
        S(0, 10, 12, 13),
        S(0, 8, 14, 14),
        S(1, 10, 0, 3),
        S(1, 8, 4, 4),
        S(1, 10, 5, 13),
        S(1, 10, 12, 13),
        S(1, 9, 14, 15),
        S(2, 10, 0, 3),
        S(2, 8, 4, 4),
        S(2, 10, 5, 15),
        S(2, 10, 13, 15),
        S(3, 9, 0, 1),
        S(3, 10, 2, 6),
        S(3, 8, 7, 7),
        S(3, 10, 8, 13),
        S(3, 10, 12, 13),
        S(3, 8, 14, 14),
        S(4, 10, 0, 1),
        S(4, 8, 2, 2),
        S(4, 10, 3, 7),
        S(4, 9, 8, 8),
        S(4, 10, 9, 14),
      ],
      60 * 240,
    );
  }, 900_000);

  it('9-5: DANGER corridor over the coffee blocks to the exit', () => {
    const S = flat;
    const route: Target[] = [S(0, 12, 3, 8), S(0, 10, 9, 10), S(0, 12, 11, 15)];
    for (const n of [1, 2, 3])
      route.push(S(n, 10, 1, 2), S(n, 12, 3, 8), S(n, 10, 9, 10), S(n, 12, 11, 14));
    walk(world(calm(level(P.c5))), route, 60 * 240);
  }, 900_000);

  it('escape: 4 screens within the 60 s timer', () => {
    const S = flat;
    const frames = walk(
      world(calm(level(P.escape))),
      [
        S(0, 12, 8, 14),
        S(1, 12, 0, 3),
        S(1, 12, 7, 9),
        S(1, 10, 10, 11),
        S(1, 12, 12, 15),
        S(2, 12, 0, 2),
        S(2, 12, 6, 8),
        S(2, 11, 9, 9),
        S(2, 10, 12, 13),
        S(2, 12, 14, 15),
        S(3, 12, 2, 13),
      ],
      60 * 60,
    );
    expect(frames).toBeLessThan(60 * 60);
  }, 900_000);
});
