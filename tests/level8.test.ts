import { describe, expect, it } from 'vitest';
import { FUTURE_ENEMIES } from '../src/config/enemies';
import { FUTURE } from '../src/config/mechanisms';
import { LEVELS } from '../src/data/levels';
import { MechDog, SlingRat } from '../src/sim/enemies/FutureEnemies';
import { parseTiledLevel, type LevelData } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';
import { followRoute, type Target } from './planner';

const parts = LEVELS[8]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);
const noEnemies = (l: LevelData): LevelData => ({
  ...l,
  spawns: l.spawns.filter((s) => s.type !== 'enemy'),
});
const world = (l: LevelData) => new World(l, [{ id: 1, hero: 'sergey' }]);

function run(w: World, input: TestInput, frames: number, keys: Action[] = []): void {
  for (let f = 0; f < frames; f++) w.step({ 1: input.hold(...keys) });
}

/** Поставить героя ногами в точку. */
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

describe('level 8 data (as in the ROM breakdown)', () => {
  it('parts: factory, folding platforms, Petrovsky bonus, magnet, Markov arena', () => {
    expect(parts).toHaveLength(5);
    expect(level(0).segments.map((s) => s.dir)).toEqual(['right', 'up', 'right']);
    expect(level(1).segments.map((s) => s.dir)).toEqual(['right', 'right']);
    expect(level(1).segments.at(-1)!.x + level(1).segments.at(-1)!.w).toBe(7 * 256);
    expect(level(2).zones.some((z) => z.kind === 'helper')).toBe(true);
    expect(level(3).segments.at(-1)!.x + level(3).segments.at(-1)!.w).toBe(6 * 256);
    expect(level(4).segments[0]!.boss).toBe('markov');
  });

  it('boxes: 24 (6 timecodes), 16 (3 + 1 coffee), 16 (5) — 56 in total; one star in 8-3', () => {
    expect(count(level(0), 'item', 'box')).toBe(24);
    expect(boxesWith(level(0), 'timecode')).toBe(6);
    expect(count(level(1), 'item', 'box')).toBe(16);
    expect(boxesWith(level(1), 'timecode')).toBe(3);
    expect(boxesWith(level(1), 'coffee')).toBe(1);
    expect(count(level(3), 'item', 'box')).toBe(16);
    expect(boxesWith(level(3), 'timecode')).toBe(5);
    expect(count(level(3), 'item', 'metal')).toBe(1);
    expect(count(level(3), 'pickup', 'star')).toBe(1);
  });

  it('enemies and mechanisms: 2 moles, a rat, 3 crushers; 4 sling rats, 5 folds; 5 dogs, a magnet', () => {
    expect(count(level(0), 'enemy', 'mole')).toBe(2);
    expect(count(level(0), 'enemy', 'rat')).toBe(1);
    expect(count(level(0), 'crusher')).toBe(3);
    expect(count(level(1), 'enemy', 'slingRat')).toBe(4);
    expect(count(level(1), 'fold')).toBe(5);
    expect(count(level(3), 'enemy', 'mechDog')).toBe(5);
    expect(count(level(3), 'magnet')).toBe(1);
    // Первый экран каждой части — без врагов.
    for (const i of [0, 1, 3]) {
      const first = level(i).spawns.filter(
        (s) => s.type === 'enemy' && s.x < 256 && s.y > 480 * (i === 0 ? 1 : 0),
      );
      expect(first, `part ${i}`).toHaveLength(0);
    }
  });
});

/** Камера на экране 5 части 8-1, герой стоит на полу слева от первого давящего блока. */
function atCrushers() {
  const w = world(noEnemies(level(0)));
  const input = new TestInput();
  w.camera.enter(2);
  w.camera.x = 768;
  place(w, 768 + 24, 224);
  run(w, input, 2);
  return { w, c: w.mech.crushers[0]!, p: w.players[0]!, input };
}

describe('crusher (original: rise 1 px/f, 102 up, fall 4 px/f, 102 down; 242 frames)', () => {
  it('travels 32 px with the measured cycle', () => {
    const w = world(noEnemies(level(0)));
    const c = w.mech.crushers[0]!;
    const input = new TestInput();
    const ys: number[] = [];
    for (let f = 0; f < 242 * 2; f++) {
      run(w, input, 1);
      ys.push(c.y);
    }
    expect(Math.max(...ys) - Math.min(...ys)).toBe(FUTURE.crusher.travel);
    // Период 242: положение повторяется.
    for (let f = 0; f < 242; f++) expect(ys[f + 242]).toBe(ys[f]);
    const C = FUTURE.crusher;
    expect(C.travel / C.riseSpeed + C.holdTop + C.travel / C.fallSpeed + C.holdBottom).toBe(242);
  });

  it('the hero walks under a raised crusher; a falling one hurts and pushes him out', () => {
    const { w, c, p, input } = atCrushers();
    // Ждём, пока блок поднимется.
    for (let f = 0; f < 400 && c.state !== 'top'; f++) run(w, input, 1);
    place(w, c.x - 10, c.bottomY + c.h);
    run(w, input, 2);
    const hearts = p.vitals.hearts;
    for (let f = 0; f < 30; f++) run(w, input, 1, ['right']);
    expect(p.x).toBeGreaterThan(c.x + c.w);
    expect(p.vitals.hearts).toBe(hearts);
    // Стоит под ним, когда падает — ранит и выталкивает.
    for (let f = 0; f < 400 && c.state !== 'top'; f++) run(w, input, 1);
    place(w, c.x + c.w / 2, c.bottomY + c.h);
    for (let f = 0; f < 400 && c.state !== 'bottom'; f++) run(w, input, 1);
    run(w, input, 2);
    expect(p.vitals.hearts).toBe(hearts - 1);
    expect(p.x + p.w <= c.x || p.x >= c.x + c.w).toBe(true);
  });

  it('a lowered crusher is a 32 px step: the hero jumps onto it from the floor', () => {
    const { w, c, p, input } = atCrushers();
    for (let f = 0; f < 400 && c.state !== 'bottom'; f++) run(w, input, 1);
    for (let f = 0; f < 400 && c.state === 'bottom'; f++) run(w, input, 1);
    for (let f = 0; f < 400 && c.state !== 'bottom'; f++) run(w, input, 1);
    place(w, c.x - 20, c.bottomY + c.h);
    run(w, input, 2);
    for (let f = 0; f < 24; f++) run(w, input, 1, ['right', 'jump']);
    run(w, input, 4, ['right']);
    run(w, input, 4);
    expect(p.y + p.h).toBe(c.y);
  });
});

describe('folding platform (original: holds 120 frames, open 40)', () => {
  it('opens 120 frames after the hero steps on it and closes 40 frames later', () => {
    const w = world(noEnemies(level(1)));
    w.camera.enter(1);
    w.camera.x = 1024;
    const f0 = w.mech.melts.find((m) => m.item === 'fold')!;
    const p = w.players[0]!;
    const input = new TestInput();
    w.setGod(true);
    place(w, f0.x + f0.w / 2, f0.y);
    run(w, input, 1);
    let held = 0;
    while (f0.active && held < 300) {
      run(w, input, 1);
      held++;
    }
    expect(held).toBeGreaterThanOrEqual(FUTURE.fold.holdFrames - 2);
    expect(held).toBeLessThanOrEqual(FUTURE.fold.holdFrames + 2);
    let open = 0;
    while (!f0.active && open < 300) {
      run(w, input, 1);
      open++;
    }
    expect(open).toBe(FUTURE.fold.openFrames);
    // Платформа раскрылась — герой провалился.
    expect(p.y + p.h).toBeGreaterThan(f0.y + 8);
  });
});

describe('magnet (TZ: it pulls the hero who carries the metal block)', () => {
  const S3 = 3 * 256;

  /** Взять блок на экране 2 и пройти под магнит — только кнопками. */
  function carryUnderMagnet(): { w: World; input: TestInput } {
    const w = world(noEnemies(level(3)));
    const input = new TestInput();
    w.camera.enter(1);
    const metal = w.items.find((i) => i.kind === 'metal')!;
    place(w, metal.x - 10, metal.y + metal.h);
    run(w, input, 2);
    run(w, input, 2, ['right']);
    run(w, input, 1, ['right', 'action']);
    run(w, input, 1);
    const p = w.players[0]!;
    expect(p.carriedItem?.kind).toBe('metal');
    for (let f = 0; f < 600 && p.x + p.w / 2 < S3 + 100; f++) run(w, input, 1, ['right']);
    return { w, input };
  }

  it('the hero with the block rises under the magnet and hangs; the block sticks on jump', () => {
    const { w, input } = carryUnderMagnet();
    const p = w.players[0]!;
    const m = w.mech.magnets[0]!;
    run(w, input, 90);
    expect(p.y).toBe(m.bottom + 16);
    expect(w.hangsOnMagnet(p)).toBe(true);
    const lives = p.vitals.lives;
    // Прыжок вправо — на полку ниши со звездой.
    for (let f = 0; f < 20; f++) run(w, input, 1, ['jump', 'right']);
    for (let f = 0; f < 40; f++) run(w, input, 1, ['right']);
    run(w, input, 30);
    expect(m.holding).toBe(true);
    expect(w.items.find((i) => i.kind === 'metal')!.stuck).toBe(true);
    expect(p.vitals.lives).toBe(lives + 1);
  });

  it('without the magnet the star niche is out of reach: from the floor and from the block', () => {
    for (const fromBlock of [false, true]) {
      const w = world(noEnemies(level(3)));
      const input = new TestInput();
      w.camera.enter(1);
      w.camera.x = S3;
      const p = w.players[0]!;
      const lives = p.vitals.lives;
      const feet = fromBlock ? 224 - 16 : 224;
      for (let x = S3 + 120; x <= S3 + 190; x += 10) {
        place(w, x, feet);
        if (fromBlock) {
          // Стоит на металлическом блоке на полу (не под магнитом).
          const metal = w.items.find((i) => i.kind === 'metal')!;
          metal.x = p.x - 2;
          metal.y = 224 - 16;
          metal.state = 'resting';
        }
        run(w, input, 2);
        for (let f = 0; f < 22; f++) run(w, input, 1, ['jump', 'right']);
        run(w, input, 40);
      }
      expect(p.vitals.lives, fromBlock ? 'from the block' : 'from the floor').toBe(lives);
    }
  });

  it('the magnet does not pull the hero without the block', () => {
    const w = world(noEnemies(level(3)));
    const input = new TestInput();
    w.camera.enter(1);
    w.camera.x = S3;
    const p = w.players[0]!;
    place(w, S3 + 104, 224);
    run(w, input, 60);
    expect(p.y + p.h).toBe(224);
  });
});

describe('level 8 enemies', () => {
  it('the sling rat faces the hero and shoots a pebble in an arc', () => {
    const w = world(level(1));
    w.camera.enter(0);
    w.camera.x = 256;
    const input = new TestInput();
    const p = w.players[0]!;
    w.setGod(true);
    place(w, 256 + 150, 224);
    run(w, input, 1);
    const rat = w.enemies.find((e) => e instanceof SlingRat)!;
    expect(rat).toBeDefined();
    let shot = false;
    for (let f = 0; f < 200 && !shot; f++) {
      run(w, input, 1);
      shot = w.projectiles.some((pr) => pr.kind === 'pebble');
    }
    expect(shot).toBe(true);
    const pr = w.projectiles.find((q) => q.kind === 'pebble')!;
    // Летит в сторону героя (крыс на экране две — по обе стороны от него).
    expect(Math.sign(pr.vx)).toBe(Math.sign(p.x - pr.x));
    expect(pr.vy).toBeLessThan(0);
  });

  it('the mechanical dog rolls 2 px/frame and chases a nearby hero at 3.5', () => {
    const w = world(level(3));
    const input = new TestInput();
    w.setGod(true);
    // Экран 2: пёс на трубе (y = 128), герой далеко внизу — пёс просто катается.
    w.camera.x = 512;
    place(w, 512 + 220, 224);
    run(w, input, 2);
    const dog = w.enemies.find((e) => e instanceof MechDog && e.y < 160)!;
    expect(dog).toBeDefined();
    run(w, input, 5);
    let x = dog.x;
    run(w, input, 1);
    expect(Math.abs(dog.x - x)).toBe(FUTURE_ENEMIES.mechDog.speed);
    // Герой рядом на той же трубе — гонится.
    const hx = dog.x + 40 <= 512 + 150 ? dog.x + 48 : dog.x - 32;
    place(w, hx, dog.y + dog.h);
    run(w, input, 2);
    x = dog.x;
    run(w, input, 1);
    expect(Math.abs(dog.x - x)).toBe(FUTURE_ENEMIES.mechDog.chaseSpeed);
    expect(Math.sign(dog.x - x)).toBe(Math.sign(hx - dog.x));
  });
});

describe('level 8 walkthroughs (route bot, buttons only, no enemies, no hits)', () => {
  const surf = (sx: number, sy: number, r: number, c0: number, c1: number): Target => ({
    kind: 'surface',
    y: sy * 240 + r * 16,
    x0: sx * 256 + c0 * 16,
    x1: sx * 256 + (c1 + 1) * 16,
  });

  function walk(l: LevelData, route: Target[], maxFrames: number): void {
    const w = world(noEnemies(l));
    let exited = false;
    let deaths = 0;
    const hearts = w.players[0]!.vitals.hearts;
    const res = followRoute(w, route, maxFrames, () => {
      for (const e of w.drainEvents()) if (e.type === 'exit') exited = true;
      if (w.players[0]!.state === 'dead') deaths++;
    });
    const p = w.players[0]!;
    expect(
      res.stuckAt,
      `stuck before ${res.stuckAt} at x=${p.x.toFixed(0)} y=${(p.y + p.h).toFixed(0)}`,
    ).toBeNull();
    const input = new TestInput();
    for (let f = 0; f < 240 && !exited; f++) {
      w.step({ 1: input.hold('right') });
      for (const e of w.drainEvents()) if (e.type === 'exit') exited = true;
    }
    expect(exited).toBe(true);
    expect(deaths).toBe(0);
    expect(p.vitals.hearts).toBe(hearts);
  }

  it('8-1: right, up the shaft, right past the three crushers to the exit', () => {
    const S1: Record<number, [number, number]> = {
      0: [0, 2],
      1: [1, 2],
      2: [2, 2],
      3: [2, 1],
      4: [2, 0],
      5: [3, 0],
      6: [4, 0],
    };
    const S = (n: number, r: number, c0: number, c1: number) =>
      surf(S1[n]![0], S1[n]![1], r, c0, c1);
    walk(
      level(0),
      [
        S(0, 12, 8, 9),
        S(0, 10, 10, 10),
        S(0, 10, 14, 14),
        S(1, 12, 2, 3),
        S(1, 10, 4, 9),
        S(1, 10, 8, 9),
        S(2, 13, 0, 1),
        S(2, 14, 5, 9),
        S(2, 12, 10, 15),
        S(2, 10, 10, 11),
        S(2, 8, 12, 13),
        S(2, 6, 9, 10),
        S(2, 4, 12, 15),
        S(2, 2, 3, 10),
        S(2, 2, 3, 5),
        S(2, 0, 1, 2),
        S(3, 13, 3, 4),
        S(3, 11, 0, 5),
        S(3, 9, 3, 4),
        S(3, 8, 0, 5),
        S(3, 6, 2, 3),
        S(3, 4, 0, 5),
        S(3, 4, 6, 9),
        S(3, 4, 10, 15),
        S(3, 2, 12, 13),
        S(3, 0, 14, 15),
        S(4, 13, 12, 13),
        S(4, 11, 14, 15),
        S(4, 9, 12, 13),
        S(4, 8, 0, 11),
        S(4, 11, 14, 15),
        S(5, 14, 0, 4),
        S(5, 14, 7, 13),
        S(5, 14, 11, 13),
        S(5, 12, 14, 15),
        S(6, 12, 1, 2),
        S(6, 12, 4, 4),
        S(6, 14, 5, 7),
        S(6, 14, 10, 14),
      ],
      60 * 240,
    );
  }, 900_000);

  it('8-2: right over the pits and the folding platforms to the exit', () => {
    const S = (n: number, r: number, c0: number, c1: number) => surf(n, 0, r, c0, c1);
    const fold = (n: number, x: number, y: number): Target => ({
      kind: 'surface',
      y,
      x0: n * 256 + x - 12,
      x1: n * 256 + x + 12,
    });
    walk(
      level(1),
      [
        S(0, 12, 6, 9),
        S(1, 12, 0, 3),
        S(1, 14, 10, 15),
        S(2, 12, 0, 4),
        S(2, 12, 8, 15),
        S(3, 12, 0, 3),
        S(3, 14, 10, 15),
        fold(4, 56, 208),
        fold(4, 120, 192),
        fold(4, 184, 176),
        fold(4, 248, 160),
        S(5, 10, 2, 4),
        fold(5, 112, 144),
        S(5, 8, 8, 15),
        S(6, 8, 0, 11),
        S(6, 8, 8, 11),
        S(6, 14, 12, 14),
      ],
      60 * 240,
    );
  }, 900_000);

  it('8-3: right past the magnet room to the exit', () => {
    const S = (n: number, r: number, c0: number, c1: number) => surf(n, 0, r, c0, c1);
    walk(
      level(3),
      [
        S(0, 14, 6, 8),
        S(1, 14, 3, 7),
        S(1, 14, 10, 15),
        S(2, 14, 4, 8),
        S(2, 14, 11, 15),
        S(3, 14, 4, 8),
        S(3, 14, 12, 15),
        S(4, 14, 0, 4),
        S(4, 14, 6, 7),
        S(4, 14, 10, 15),
        S(5, 12, 0, 9),
        S(5, 12, 6, 9),
        S(5, 12, 12, 14),
      ],
      60 * 120,
    );
  }, 900_000);
});
