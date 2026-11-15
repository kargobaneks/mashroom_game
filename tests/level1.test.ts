import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { contains } from '../src/sim/geom';
import { parseTiledLevel } from '../src/sim/level';

const parts = LEVELS[1]!.map((p, i) => ({ i, level: parseTiledLevel(p.map) }));

describe('level 1 data', () => {
  it('the whole level has enough timecodes for the badge and uses the stage-1 enemies', () => {
    const all = parts.flatMap((p) => p.level.spawns);
    const open = all.filter((s) => s.type === 'pickup' && s.kind === 'timecode').length;
    const hidden = all.filter((s) => s.contains === 'timecode').length;
    expect(open + hidden).toBeGreaterThanOrEqual(BALANCE.badgeThreshold);
    const kinds = new Set(all.filter((s) => s.type === 'enemy').map((s) => s.kind));
    expect([...kinds].sort()).toEqual(['asterisk', 'barista', 'bot']);
  });

  it('kitchen has three syrup pumps and a star; sink has a valve, water and a jug', () => {
    const kitchen = parts[1]!.level;
    expect(kitchen.spawns.filter((s) => s.type === 'lift')).toHaveLength(3);
    expect(kitchen.spawns.some((s) => s.type === 'pickup' && s.kind === 'star')).toBe(true);
    expect(kitchen.segments.map((s) => s.dir)).toEqual(['right', 'up', 'right']);
    const sink = parts[2]!.level;
    expect(sink.zones.some((z) => z.kind === 'trigger')).toBe(true);
    expect(sink.zones.some((z) => z.kind === 'flood')).toBe(true);
    expect(sink.spawns.some((s) => s.type === 'floater')).toBe(true);
  });

  it('basement arena has 6 hover points on 3 heights, ammo and foam', () => {
    const base = parts[3]!.level;
    const arena = base.segments.find((s) => s.boss === 'agranovich')!;
    const points = base.spawns.filter((s) => s.type === 'bossPoint' && contains(arena, s));
    expect(points).toHaveLength(6);
    expect(new Set(points.map((p) => p.y)).size).toBe(3);
    expect(
      base.spawns.filter((s) => s.type === 'item' && contains(arena, s)).length,
    ).toBeGreaterThan(0);
    expect(base.zones.some((z) => z.kind === 'foam')).toBe(true);
  });
});

describe('level 1-1 hall design rules (from the original hall)', () => {
  const hall = parts[0]!.level;
  const T = hall.grid.size;
  const SCREEN = 256;
  const screenOf = (s: { x: number }) => Math.floor(s.x / SCREEN);
  const enemies = hall.spawns.filter((s) => s.type === 'enemy');
  const boxes = hall.spawns.filter((s) => s.type === 'item');
  const FLYERS = new Set(['asterisk']);

  it('first screen has no enemies; the first boxes hide timecodes', () => {
    expect(enemies.filter((e) => screenOf(e) === 0)).toHaveLength(0);
    const first = boxes.filter((b) => screenOf(b) === 0);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(first.every((b) => b.contains === 'timecode')).toBe(true);
  });

  it('at most one flyer and one walker per screen', () => {
    for (let sc = 0; sc < 8; sc++) {
      const here = enemies.filter((e) => screenOf(e) === sc);
      expect(here.filter((e) => FLYERS.has(e.kind)).length, `screen ${sc}`).toBeLessThanOrEqual(1);
      expect(here.filter((e) => !FLYERS.has(e.kind)).length, `screen ${sc}`).toBeLessThanOrEqual(1);
    }
  });

  it('every enemy has ammo on its screen or the one before', () => {
    for (const e of enemies) {
      const sc = screenOf(e);
      expect(
        boxes.some((b) => screenOf(b) === sc || screenOf(b) === sc - 1),
        `enemy @${e.x}`,
      ).toBe(true);
    }
  });

  it('boxes come in pairs: side by side or stacked', () => {
    for (const b of boxes) {
      const partner = boxes.some(
        (o) =>
          o !== b &&
          ((o.y === b.y && Math.abs(o.x - b.x) === T) ||
            (o.x === b.x && Math.abs(o.y - b.y) === T)),
      );
      expect(partner, `box @${b.x},${b.y}`).toBe(true);
    }
  });

  it('about one box in four hides something; coffee only near the end', () => {
    const hidden = boxes.filter((b) => b.contains);
    expect(hidden.length / boxes.length).toBeGreaterThan(0.15);
    expect(hidden.length / boxes.length).toBeLessThan(0.4);
    for (const b of hidden.filter((h) => h.contains === 'coffee'))
      expect(screenOf(b)).toBeGreaterThanOrEqual(5);
  });

  it('surfaces sit on 16-px rows', () => {
    for (const s of hall.spawns) expect(s.y % T, `${s.type} @${s.x},${s.y}`).toBe(0);
  });
});

describe('level 1: furniture is stand-on-top, not walls (as in the original)', () => {
  it('kitchen: walking along the floor passes through counters and stoves; you can still stand on them', async () => {
    const { World } = await import('../src/sim/World');
    const { TestInput } = await import('./helpers');
    const w = new World(parts[1]!.level, [{ id: 1, hero: 'sergey' }]);
    w.setGod(true);
    const p = w.players[0]!;
    const inp = new TestInput();
    const T = w.grid.size;
    const floorY = 27 * T;
    // Из прохода перед первой тумбой — по полу через тумбу 5–12, проход, плиту 16–18 и тумбу 19–26.
    p.placeAt(4 * T, floorY);
    for (let i = 0; i < 5; i++) w.step({ 1: inp.hold() });
    for (let i = 0; i < 180; i++) w.step({ 1: inp.hold('right') });
    expect(p.x).toBeGreaterThan(26 * T);
    expect(p.y + p.h).toBe(floorY);
    // А на тумбу можно запрыгнуть и стоять на ней.
    p.placeAt(8 * T, floorY);
    for (let i = 0; i < 5; i++) w.step({ 1: inp.hold() });
    for (let i = 0; i < 40; i++) w.step({ 1: inp.hold('jump') });
    for (let i = 0; i < 20; i++) w.step({ 1: inp.hold() });
    expect(p.y + p.h).toBe(floorY - 2 * T);
  });
});
