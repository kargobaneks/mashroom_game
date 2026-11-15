import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { ENEMIES } from '../src/config/enemies';
import { LEVELS } from '../src/data/levels';
import { Cable } from '../src/sim/enemies/Cable';
import { Headline } from '../src/sim/enemies/Headline';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import { drive } from './autopilot';
import { makeWorld } from './helpers';

const parts = LEVELS[2]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);

describe('level 2 data', () => {
  it('two parts: the server room (right, one descent, right) and the machine hall with Uralov', () => {
    expect(parts).toHaveLength(2);
    expect(level(0).segments.map((s) => s.dir)).toEqual(['right', 'down', 'right']);
    expect(level(1).segments.at(-1)?.boss).toBe('uralov');
    // ~10 экранов: 6 вправо + спуск + 3 вправо + арена.
    const screens = level(0).segments.reduce(
      (n, s) => n + (s.dir === 'down' ? s.h / 240 - 1 : s.w / 256),
      0,
    );
    expect(screens).toBeGreaterThanOrEqual(9);
  });

  it('uses the level-2 enemies (panic headlines, cable snakes) and has a star and coffee', () => {
    const sp = level(0).spawns;
    const kinds = new Set(sp.filter((s) => s.type === 'enemy').map((s) => s.kind));
    expect(kinds.has('headline')).toBe(true);
    expect(kinds.has('cable')).toBe(true);
    expect(sp.some((s) => s.type === 'pickup' && s.kind === 'star')).toBe(true);
    expect(sp.some((s) => s.contains === 'coffee')).toBe(true);
    const tcs =
      sp.filter((s) => s.kind === 'timecode').length +
      sp.filter((s) => s.contains === 'timecode').length;
    expect(tcs).toBeGreaterThanOrEqual(BALANCE.badgeThreshold);
  });

  it('the arena has boxes on the floor and floor-level ammo points (blocks appear on the floor)', () => {
    const a = level(1);
    const arena = a.segments.at(-1)!;
    const inArena = a.spawns.filter((s) => s.x >= arena.x && s.x < arena.x + arena.w);
    expect(inArena.filter((s) => s.type === 'item').length).toBeGreaterThanOrEqual(2);
    expect(inArena.filter((s) => s.type === 'ammo').length).toBeGreaterThanOrEqual(2);
  });

  it('cable snakes start on solid ground (they crawl on floors and walls, not furniture)', () => {
    const l = level(0);
    const T = l.grid.size;
    for (const s of l.spawns.filter((q) => q.kind === 'cable'))
      expect(l.grid.isSolid(Math.floor(s.x / T), s.y / T), `cable @${s.x}`).toBe(true);
  });
});

describe('level 2 walkthrough (autopilot, invulnerable but mortal to pits)', () => {
  it('2-1 server room: start → pits → shaft down → exit door', () => {
    const w = new World(level(0), [{ id: 1, hero: 'sergey' }]);
    w.setGod(true);
    drive(w, () => w.frozen, 60 * 180);
    const p = w.players[0]!;
    if (!w.frozen)
      throw new Error(`stuck at x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} seg=${w.camera.index}`);
    expect(p.vitals.lives).toBe(BALANCE.startLives);
  });

  it('2-2: walking into the machine hall starts the fight', () => {
    const w = new World(level(1), [{ id: 1, hero: 'sergey' }]);
    drive(w, () => w.boss !== null, 60 * 20);
    expect(w.boss?.name).toBe('uralov');
  });
});

describe('level 2 enemies', () => {
  it('panic headline: flies right to left at 2 px/frame on a sine', () => {
    const h = new Headline({ x: 200, y: 100 }, 1);
    const w = makeWorld();
    const x0 = h.x;
    const ys = new Set<number>();
    for (let i = 0; i < 30; i++) {
      h.step(w);
      ys.add(Math.round(h.y));
    }
    expect(h.x).toBe(x0 - 30 * ENEMIES.headline.speed);
    expect(ys.size).toBeGreaterThan(5);
  });

  it('cable snake: crawls along the floor, up a wall, over the top and down the other side', () => {
    // Блок 2×2 на полу; змейка слева от него ползёт вправо.
    const grid = [
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
      '#.......##.....#',
      '#.......##.....#',
      '################',
      '################',
    ];
    const w = makeWorld({ grid });
    const c = new Cable({ x: 72, y: 208 }, 1, 1);
    const normals: string[] = [];
    let maxUp = Infinity;
    for (let i = 0; i < 200; i++) {
      c.step(w);
      const n = c.surfaceNormal;
      const key = `${n.x},${n.y}`;
      if (normals.at(-1) !== key) normals.push(key);
      maxUp = Math.min(maxUp, c.y);
    }
    // Пол (нормаль вверх) → левая стена блока (влево) → верх блока (вверх) → правая стена (вправо) → пол.
    expect(normals.slice(0, 5)).toEqual(['0,-1', '-1,0', '0,-1', '1,0', '0,-1']);
    expect(maxUp).toBeLessThan(176); // поднялась на блок (верх блока y = 176)
    expect(c.x).toBeGreaterThan(160); // и ушла дальше по полу
  });

  it('cable snake at a pit edge goes down into it instead of floating', () => {
    const grid = [
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
      '#######..#######',
      '#######..#######',
    ];
    const w = makeWorld({ grid });
    const c = new Cable({ x: 88, y: 208 }, 1, 1);
    for (let i = 0; i < 40; i++) c.step(w);
    expect(c.surfaceNormal).toEqual({ x: 1, y: 0 }); // ползёт вниз по стенке провала
    expect(c.y).toBeGreaterThan(208);
  });
});
