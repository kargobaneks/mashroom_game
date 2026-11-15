import type { Segment, SpawnPoint, Zone } from '../src/sim/level';
import { TileGrid } from '../src/sim/TileGrid';
import { World, type PlayerSetup } from '../src/sim/World';
import { emptyButtons, PlayerInput, type Action } from '../src/systems/InputState';

/** Ввод для тестов: hold() — что зажато на этом шаге. */
export class TestInput extends PlayerInput {
  hold(...actions: Action[]): this {
    const b = emptyButtons();
    for (const a of actions) b[a] = true;
    this.update(b);
    return this;
  }
}

/** Экран 16×15 тайлов: пол на строке 13, стены по краям. */
export const ROOM = [
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '################',
  '################',
];

export interface TestWorldOpts {
  grid?: readonly string[];
  players?: readonly PlayerSetup[];
  spawns?: readonly Omit<SpawnPoint, 'id'>[];
  zones?: readonly Zone[];
  segments?: readonly Segment[];
  start?: { x: number; y: number };
}

export function makeWorld(o: TestWorldOpts = {}): World {
  const grid = TileGrid.fromAscii(o.grid ?? ROOM);
  const seg: Segment = {
    x: 0,
    y: 0,
    w: grid.widthPx,
    h: grid.heightPx,
    dir: 'lock',
    boss: null,
    respawn: { x: 40, y: 208 },
  };
  return new World(
    {
      grid,
      segments: o.segments ?? [seg],
      spawns: (o.spawns ?? []).map((s, i) => ({ ...s, id: i + 1 })),
      zones: o.zones ?? [],
      playerStart: o.start ?? { x: 40, y: 208 },
    },
    o.players ?? [{ id: 1, hero: 'sergey' }],
  );
}

/** Прогнать n шагов с одним и тем же вводом. */
export function run(world: World, frames: number, p1: Action[] = [], p2: Action[] = []): void {
  const i1 = inputs.get(world)?.[0] ?? new TestInput();
  const i2 = inputs.get(world)?.[1] ?? new TestInput();
  inputs.set(world, [i1, i2]);
  for (let f = 0; f < frames; f++) {
    i1.hold(...p1);
    i2.hold(...p2);
    world.step({ 1: i1, 2: i2 });
  }
}

const inputs = new WeakMap<World, [TestInput, TestInput]>();

/** Один шаг с вводом (для нажатий). */
export function tap(world: World, p1: Action[] = [], p2: Action[] = []): void {
  run(world, 1, p1, p2);
}
