import { describe, expect, it } from 'vitest';
import { MINE } from '../src/config/mechanisms';
import { LEVELS } from '../src/data/levels';
import { Boulder } from '../src/sim/enemies/MineHazards';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';
import { deepClone, followRoute, type Target } from './planner';

const parts = LEVELS[7]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);
const world = (i: number) => new World(level(i), [{ id: 1, hero: 'sergey' }]);

function run(w: World, input: TestInput, frames: number, keys: Action[] = []): void {
  for (let f = 0; f < frames; f++) w.step({ 1: input.hold(...keys) });
}

/** Сесть в вагонетку: шагнуть вправо к рычагу. */
function board(w: World, input: TestInput): void {
  const p = w.players[0]!;
  run(w, input, 40);
  for (let f = 0; f < 60 && !p.cart; f++) run(w, input, 1, ['right']);
  run(w, input, 1);
}

describe('level 7 data: mine entrance + three cart rides (as in the ROM breakdown)', () => {
  it('7-1 goes right, up, right; the rides are 8 screens to the right; every part ends with an exit', () => {
    expect(level(0).segments.map((s) => s.dir)).toEqual(['right', 'up', 'right']);
    for (const i of [1, 2, 3]) {
      const l = level(i);
      expect(l.segments).toHaveLength(1);
      expect(l.segments[0]!.w).toBe(8 * 256);
      expect(l.spawns.filter((s) => s.type === 'cart')).toHaveLength(1);
      expect(l.zones.some((z) => z.kind === 'exit')).toBe(true);
    }
  });

  it('hazards: 7-2 only boulders; 7-3 boulders and pendulums; 7-4 adds bats and the snake box', () => {
    const kinds = (i: number) =>
      new Set(
        level(i)
          .spawns.filter((s) => s.type === 'enemy')
          .map((s) => s.kind),
      );
    expect([...kinds(1)]).toEqual(['boulder']);
    expect(kinds(2)).toEqual(new Set(['boulder', 'pendulum']));
    expect(kinds(3)).toEqual(new Set(['boulder', 'pendulum', 'bat', 'snakeBox']));
    const e71 = level(0)
      .spawns.filter((s) => s.type === 'enemy')
      .map((s) => s.kind);
    expect(e71.filter((k) => k === 'porcupine')).toHaveLength(4);
    expect(e71.filter((k) => k === 'moth')).toHaveLength(2);
    expect(e71.filter((k) => k === 'diveMoth')).toHaveLength(1);
  });
});

describe('cart (original: ← 1, nothing 2, → 3 px/frame; touch the lever to start)', () => {
  it('stands still until the hero touches the lever, then rolls at 2 / 1 / 3 px per frame', () => {
    const w = world(1);
    const input = new TestInput();
    const c = w.mech.carts[0]!;
    run(w, input, 60);
    expect(c.state).toBe('parked');
    const x0 = c.x;
    expect(c.x).toBe(x0);
    board(w, input);
    expect(c.state).toBe('rolling');
    const speed = (keys: Action[]) => {
      const a = c.x;
      run(w, input, 10, keys);
      return (c.x - a) / 10;
    };
    expect(speed([])).toBe(MINE.cart.coast);
    expect(speed(['left'])).toBe(MINE.cart.brake);
    expect(speed(['right'])).toBe(MINE.cart.gas);
    // Герой едет в вагонетке, а не идёт по ней.
    const p = w.players[0]!;
    expect(c.isRider(p)).toBe(true);
  });

  it('the hero can jump in the cart and land back in it', () => {
    const w = world(1);
    const input = new TestInput();
    board(w, input);
    const p = w.players[0]!;
    run(w, input, 1, ['jump']);
    run(w, input, 15, ['jump']);
    expect(p.onGround).toBe(false);
    run(w, input, 40);
    expect(w.mech.carts[0]!.isRider(p)).toBe(true);
  });

  it('boulder: at normal speed it lands on the hero (out of the cart, into the pit); braking — it falls ahead', () => {
    const outcome = (keys: Action[]) => {
      const w = world(1);
      const input = new TestInput();
      board(w, input);
      const p = w.players[0]!;
      let ejected = false;
      let boulderFell = false;
      for (let f = 0; f < 60 * 12 && !ejected; f++) {
        run(w, input, 1, keys);
        if (p.ejected) ejected = true;
        if (w.enemies.some((e) => e instanceof Boulder && e.falling)) boulderFell = true;
      }
      return { ejected, boulderFell };
    };
    expect(outcome([])).toEqual({ ejected: true, boulderFell: true });
    expect(outcome(['left']).ejected).toBe(false);
  });

  it('after a fall the hero respawns on the screen border behind, in a new parked cart', () => {
    const w = world(1);
    const input = new TestInput();
    board(w, input);
    const p = w.players[0]!;
    for (let f = 0; f < 60 * 12 && p.state !== 'respawn'; f++) run(w, input, 1);
    expect(p.state).toBe('respawn');
    const c = w.mech.carts[0]!;
    expect(c.state).toBe('parked');
    expect((c.x + c.w / 2) % 256).toBe(40);
    expect(w.camera.x % 256).toBe(0);
    expect(p.vitals.lives).toBe(2);
  });

  it('7-3 track break: holding → while the cart drops throws the hero out; ← or nothing — lands below', () => {
    const drop = (keys: Action[]) => {
      // Без опасностей: проверяем только обрыв.
      const l = level(2);
      const w = new World({ ...l, spawns: l.spawns.filter((s) => s.type !== 'enemy') }, [
        { id: 1, hero: 'sergey' },
      ]);
      const input = new TestInput();
      board(w, input);
      const p = w.players[0]!;
      const c = w.mech.carts[0]!;
      // Доехать до обрыва на тормозе, потом — нужные кнопки.
      while (c.x < 4 * 256 - 100 && !p.ejected) run(w, input, 1, ['left']);
      for (let f = 0; f < 120 && !p.ejected; f++) run(w, input, 1, keys);
      return { ejected: p.ejected, onLower: c.y + c.h === 208 };
    };
    expect(drop(['right']).ejected).toBe(true);
    const calm = drop([]);
    expect(calm.ejected).toBe(false);
    expect(calm.onLower).toBe(true);
  });
});

/**
 * Бот заезда — только кнопками: каждые 4 кадра пробует на копии мира «ничего», «тормоз», «газ»
 * на 50 кадров вперёд и берёт первый вариант, после которого его не выбило. В конце пути — пешком
 * к выходу (прыгает через ящики).
 */
const log: string[] = [];
function rideBot(w: World, maxFrames: number): { exited: boolean; deaths: number; frames: number } {
  const input = new TestInput();
  const p = w.players[0]!;
  let exited = false;
  let deaths = 0;
  let keys: Action[] = [];
  let f = 0;
  const safe = (k: Action[]) => {
    const sim = deepClone(w);
    const inp = deepClone(input);
    for (let i = 0; i < 50; i++) {
      inp.hold(...k);
      sim.step({ 1: inp });
      const q = sim.players[0]!;
      if (q.ejected || q.state === 'dead') return false;
    }
    return true;
  };
  for (; f < maxFrames && !exited; f++) {
    if (p.cart && f % 4 === 0) {
      const options: Action[][] = [[], ['left'], ['right']];
      keys = options.find(safe) ?? [];
    } else if (!p.cart && p.controlled) {
      // В вагонетке ещё не едем (стоит) или доехали — шагать вправо; перед ящиком — прыгать.
      const ahead = w
        .solidsFor(p)
        .some((s) => s.x >= p.x + p.w && s.x < p.x + p.w + 6 && s.y < p.y + p.h);
      keys = ahead && p.onGround && !keys.includes('jump') ? ['right', 'jump'] : ['right'];
      if (!p.onGround && p.vy < 0) keys = ['right', 'jump'];
    }
    w.step({ 1: input.hold(...keys) });
    if (p.state === 'dead' && p.stateTimer === 59) {
      deaths++;
      log.push(
        `x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} enemies=${w.enemies.map((e) => `${e.kind}@${e.x.toFixed(0)},${e.y.toFixed(0)}`).join(' ')}`,
      );
    }
    for (const e of w.drainEvents()) if (e.type === 'exit') exited = true;
  }
  return { exited, deaths, frames: f };
}

describe('cart rides are passable with buttons only (brake at boulders, wait out pendulums)', () => {
  for (const [i, name] of [
    [1, '7-2 boulders'],
    [2, '7-3 boulders, pendulums, track break'],
    [3, '7-4 pendulums, boulders, then on foot past bats and the snake box'],
  ] as const) {
    it(
      name,
      () => {
        const w = world(i);
        w.players[0]!.vitals.lives = 9;
        const r = rideBot(w, 60 * 120);
        expect(r, JSON.stringify(r) + '\n' + log.splice(0).join('\n')).toMatchObject({
          exited: true,
        });
        expect(r.deaths).toBe(0);
      },
      120_000,
    );
  }
});

describe('7-1 mine entrance walkthrough (route bot, buttons only, no enemies)', () => {
  const SCREENS: Record<number, [number, number]> = { 0: [0, 1], 1: [1, 1], 2: [1, 0], 3: [2, 0] };
  const S = (n: number, r: number, c0: number, c1: number): Target => {
    const [sc, sr] = SCREENS[n]!;
    return {
      kind: 'surface',
      y: sr * 240 + r * 16,
      x0: sc * 256 + c0 * 16,
      x1: sc * 256 + (c1 + 1) * 16,
    };
  };
  const ROUTE: Target[] = [
    S(0, 13, 14, 15),
    S(1, 13, 8, 10),
    S(1, 11, 11, 12),
    S(1, 9, 13, 14),
    S(1, 7, 6, 12),
    S(1, 5, 7, 11),
    S(1, 3, 3, 6),
    S(1, 1, 9, 12),
    S(2, 14, 4, 7),
    S(2, 12, 9, 10),
    S(2, 10, 11, 13),
    S(2, 8, 4, 9),
    S(2, 6, 10, 11),
    S(2, 4, 12, 15),
    S(3, 4, 0, 3),
    S(3, 6, 4, 5),
    S(3, 8, 9, 12),
    S(3, 6, 13, 15),
  ];
  it('right over the powder barrels → up the beams → right to the exit', () => {
    const l = level(0);
    const w = new World({ ...l, spawns: l.spawns.filter((s) => s.type !== 'enemy') }, [
      { id: 1, hero: 'sergey' },
    ]);
    let exited = false;
    let deaths = 0;
    const res = followRoute(w, ROUTE, 60 * 120, () => {
      for (const e of w.drainEvents()) if (e.type === 'exit') exited = true;
      if (w.players[0]!.state === 'dead') deaths++;
    });
    const p = w.players[0]!;
    expect(
      res.stuckAt,
      `stuck before ${res.stuckAt} at x=${p.x.toFixed(0)} y=${(p.y + p.h).toFixed(0)}`,
    ).toBeNull();
    // Последний шаг — вправо, в выход.
    const input = new TestInput();
    for (let f = 0; f < 120 && !exited; f++) {
      w.step({ 1: input.hold('right') });
      for (const e of w.drainEvents()) if (e.type === 'exit') exited = true;
    }
    expect(exited).toBe(true);
    expect(deaths).toBe(0);
  }, 600_000);
});
