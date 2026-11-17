import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { parseTiledLevel, type LevelData } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';
import { followRoute, type Target } from './planner';
import ROUTE_KEYS from './fixtures/level6_route.txt?raw';

const ROUTE_FILE = 'tests/fixtures/level6_route.txt';

const parts = LEVELS[6]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);

/** Экраны оригинала на карте (как в scripts/levels/level6_1.mjs). */
const SCREENS: Record<number, [number, number]> = {
  0: [0, 7],
  1: [1, 7],
  2: [2, 7],
  3: [2, 6],
  4: [2, 5],
  5: [2, 4],
  6: [2, 3],
  7: [3, 3],
  8: [4, 3],
  9: [4, 2],
  10: [4, 1],
  11: [4, 0],
  12: [5, 0],
};
/** Уступ: экран, строка, колонки c0..c1 (координаты экрана). */
const S = (n: number, r: number, c0: number, c1: number): Target => {
  const [sc, sr] = SCREENS[n]!;
  return {
    kind: 'surface',
    y: sr * 240 + r * 16,
    x0: sc * 256 + c0 * 16,
    x1: sc * 256 + (c1 + 1) * 16,
  };
};
const CH = (index: number): Target => ({ kind: 'chain', index });

/** Маршрут по уступам и цепям — каждый шаг бот находит сам, только кнопками. */
const ROUTE: Target[] = [
  S(0, 10, 8, 9),
  S(0, 12, 10, 13),
  S(0, 10, 14, 15),
  S(1, 12, 0, 3),
  CH(0),
  S(1, 4, 10, 13),
  S(2, 12, 0, 7),
  S(2, 11, 1, 4),
  S(2, 10, 5, 7),
  S(2, 8, 6, 11),
  S(2, 6, 4, 6),
  S(2, 4, 8, 15),
  S(2, 2, 11, 13),
  S(2, 0, 6, 9),
  S(3, 13, 4, 5),
  S(3, 12, 0, 3),
  CH(1),
  S(3, 8, 13, 15),
  S(3, 6, 10, 15),
  S(3, 4, 0, 7),
  S(3, 2, 0, 2),
  S(3, 0, 4, 5),
  S(4, 13, 6, 7),
  S(4, 14, 10, 11),
  S(4, 12, 12, 15),
  S(4, 10, 8, 10),
  S(4, 8, 10, 15),
  CH(2),
  S(4, 4, 1, 3),
  S(4, 2, 2, 3),
  S(4, 0, 5, 5),
  S(4, 0, 8, 13),
  S(5, 13, 5, 7),
  S(5, 11, 8, 15),
  S(5, 9, 2, 7),
  S(5, 7, 9, 11),
  S(5, 5, 4, 9),
  S(5, 4, 12, 15),
  CH(3),
  S(6, 14, 4, 6),
  S(6, 12, 0, 3),
  S(6, 11, 4, 5),
  S(6, 9, 2, 7),
  S(6, 8, 8, 9),
  S(6, 6, 0, 10),
  S(6, 6, 12, 15),
  S(7, 6, 0, 2),
  S(7, 10, 2, 3),
  CH(4),
  CH(5),
  S(7, 12, 12, 15),
  S(8, 12, 2, 7),
  S(8, 12, 10, 15),
  S(8, 10, 8, 9),
  S(8, 8, 12, 15),
  S(8, 6, 4, 9),
  S(8, 4, 12, 15),
  S(8, 2, 8, 10),
  S(8, 0, 6, 7),
  S(9, 13, 8, 9),
  S(9, 11, 10, 15),
  CH(6),
  S(9, 6, 0, 2),
  S(9, 4, 0, 3),
  S(9, 2, 4, 9),
  S(9, 0, 10, 11),
  S(10, 13, 8, 9),
  S(10, 11, 0, 11),
  S(10, 9, 9, 10),
  S(10, 7, 3, 8),
  S(10, 5, 7, 9),
  S(10, 4, 0, 5),
  S(10, 2, 4, 6),
  S(10, 0, 0, 3),
  S(11, 13, 4, 5),
  S(11, 12, 2, 7),
  S(11, 10, 8, 9),
  S(11, 8, 0, 5),
  S(11, 6, 8, 9),
  S(11, 5, 11, 13),
  CH(7),
  CH(8),
  CH(9),
  S(12, 6, 12, 15),
];

/** Без врагов: проверяем только геометрию и цепи. */
function noEnemies(l: LevelData): LevelData {
  return { ...l, spawns: l.spawns.filter((s) => s.type !== 'enemy') };
}

// Запись прохождения: по кадру на символ (маска кнопок), с повторами «N*c».
const KEYS: readonly Action[] = ['left', 'right', 'up', 'down', 'jump', 'action'];
const encode = (frames: Action[][]): string => {
  const chars = frames.map((k) =>
    String.fromCharCode(48 + KEYS.reduce((m, a, i) => (k.includes(a) ? m | (1 << i) : m), 0)),
  );
  const out: string[] = [];
  for (let i = 0; i < chars.length;) {
    let j = i;
    while (j < chars.length && chars[j] === chars[i]) j++;
    out.push(`${j - i}*${chars[i]}`);
    i = j;
  }
  return out.join(' ');
};
const decode = (s: string): Action[][] =>
  s
    .trim()
    .split(/\s+/)
    .flatMap((run) => {
      const [n, c] = run.split('*') as [string, string];
      const m = c.charCodeAt(0) - 48;
      const k = KEYS.filter((_, i) => m & (1 << i));
      return Array.from({ length: Number(n) }, () => [...k]);
    });

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;

describe.skipIf(!env?.PLAN_ROUTE)('level 6 route planner (PLAN_ROUTE=1, ~10 min)', () => {
  it('finds a button-only route through 6-1 and records it', async () => {
    const w = new World(noEnemies(level(0)), [{ id: 1, hero: 'sergey' }]);
    let deaths = 0;
    const res = followRoute(
      w,
      ROUTE,
      60 * 300,
      () => {
        if (w.players[0]!.state === 'dead') deaths++;
      },
      (msg) => console.log(msg),
    );
    const p = w.players[0]!;
    expect(
      res.stuckAt,
      `stuck before target ${res.stuckAt} at x=${p.x.toFixed(0)} y=${(p.y + p.h).toFixed(0)}`,
    ).toBeNull();
    expect(deaths).toBe(0);
    // Последний шаг — вправо к двери выхода.
    const keys = [...res.keys, ...Array.from({ length: 60 }, (): Action[] => ['right'])];
    const fs = (await import('node:fs' as string)) as {
      writeFileSync(p: string, d: string): void;
    };
    fs.writeFileSync(ROUTE_FILE, encode(keys) + '\n');
  }, 1_800_000);
});

describe('level 6 walkthrough (recorded button-only route, no enemies)', () => {
  it('6-1 tower: right → shaft → bridge on chains → shaft → three chains over the pit → exit', () => {
    const w = new World(noEnemies(level(0)), [{ id: 1, hero: 'sergey' }]);
    const input = new TestInput();
    let exited = false;
    let deaths = 0;
    for (const k of decode(ROUTE_KEYS)) {
      w.step({ 1: input.hold(...k) });
      for (const e of w.drainEvents()) if (e.type === 'exit') exited = true;
      if (w.players[0]!.state === 'dead') deaths++;
      if (exited) break;
    }
    expect(deaths).toBe(0);
    expect(
      exited,
      'reached the exit (if the map changed: PLAN_ROUTE=1 npx vitest run tests/level6.test.ts)',
    ).toBe(true);
  });
});
