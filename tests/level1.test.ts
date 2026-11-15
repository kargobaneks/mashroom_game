import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { PLAYER_PHYSICS } from '../src/config/physics';
import { LEVELS } from '../src/data/levels';
import { Camera } from '../src/sim/Camera';
import { contains } from '../src/sim/geom';
import { parseTiledLevel } from '../src/sim/level';

const parts = LEVELS[1]!.map((p, i) => ({ i, level: parseTiledLevel(p.map) }));

describe('level 1 data: every part', () => {
  for (const { i, level } of parts) {
    const T = level.grid.size;
    describe(`part 1-${i + 1}`, () => {
      it('camera segments join without gaps', () => {
        for (let k = 0; k + 1 < level.segments.length; k++) {
          const cur = level.segments[k]!;
          const next = level.segments[k + 1]!;
          const end =
            cur.dir === 'right'
              ? { x: cur.x + cur.w - 256, y: cur.y }
              : cur.dir === 'down'
                ? { x: cur.x, y: cur.y + cur.h - 240 }
                : cur.dir === 'up'
                  ? { x: cur.x, y: cur.y }
                  : { x: cur.x, y: cur.y };
          expect(Camera.startOf(next), `segment ${k} → ${k + 1}`).toEqual(end);
        }
      });

      it('respawn points are on screen at their segment start and stand on something', () => {
        for (const s of level.segments) {
          const start = Camera.startOf(s);
          expect(
            contains(
              { x: start.x, y: start.y, w: 256, h: 240 },
              { x: s.respawn.x, y: s.respawn.y - 1 },
            ),
          ).toBe(true);
          const tx = Math.floor(s.respawn.x / T);
          const ty = s.respawn.y / T;
          expect(level.grid.isSolid(tx, ty) || level.grid.isOneway(tx, ty)).toBe(true);
        }
      });

      it('player start is not inside a wall', () => {
        const { x, y } = level.playerStart;
        const h = PLAYER_PHYSICS.hitboxStanding;
        expect(
          level.grid.rectHitsSolid({
            x: x - h.width / 2,
            y: y - h.height,
            w: h.width,
            h: h.height,
          }),
        ).toBe(false);
      });

      it('nothing spawns inside a wall', () => {
        for (const s of level.spawns) {
          if (s.type === 'bossPoint' || s.type === 'lift' || s.type === 'floater') continue;
          expect(
            level.grid.isSolid(Math.floor(s.x / T), Math.floor((s.y - 1) / T)),
            `${s.type}:${s.kind} @${s.x},${s.y}`,
          ).toBe(false);
        }
      });

      it('ends with an exit or a boss', () => {
        const hasExit = level.zones.some((z) => z.kind === 'exit');
        const hasBoss = level.segments.some((s) => s.boss !== null);
        expect(hasExit !== hasBoss).toBe(true);
      });
    });
  }

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

  it('basement arena has 4 hover points, ammo and foam', () => {
    const base = parts[3]!.level;
    const arena = base.segments.find((s) => s.boss === 'agranovich')!;
    expect(base.spawns.filter((s) => s.type === 'bossPoint' && contains(arena, s))).toHaveLength(4);
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

describe('level 1: every box can actually be picked up', () => {
  // Ящик берут, уперевшись сбоку: рядом на той же поверхности должно быть место, где игрок встанет.
  // Верхний ящик стопки снимают, взяв нижний, — проверяем нижний.
  for (const { i, level } of parts) {
    it(`part 1-${i + 1}: each box has a free side to push against`, () => {
      const g = level.grid;
      const T = g.size;
      const boxes = level.spawns.filter((s) => s.type === 'item');
      const boxAt = (tx: number, ty: number) =>
        boxes.some((b) => Math.floor(b.x / T) === tx && b.y / T - 1 === ty);
      const blocked = (tx: number, ty: number) => g.isSolid(tx, ty) || boxAt(tx, ty);
      const standable = (tx: number, row: number) =>
        !blocked(tx, row) &&
        !blocked(tx, row - 1) &&
        (g.isSolid(tx, row + 1) || g.isOneway(tx, row + 1));
      // Ящик доступен, если рядом есть где встать — или рядом доступный ящик того же ряда
      // (взял соседа — освободил место).
      const cells = boxes
        .map((b) => ({ tx: Math.floor(b.x / T), row: b.y / T - 1 }))
        .filter((c) => !boxAt(c.tx, c.row + 1)); // верхний в стопке снимают вместе с нижним
      const ok = new Set<string>();
      const key = (c: { tx: number; row: number }) => `${c.tx},${c.row}`;
      for (let changed = true; changed;) {
        changed = false;
        for (const c of cells) {
          if (ok.has(key(c))) continue;
          const side = (dx: number) =>
            standable(c.tx + dx, c.row) || ok.has(`${c.tx + dx},${c.row}`);
          if (side(-1) || side(1)) {
            ok.add(key(c));
            changed = true;
          }
        }
      }
      expect(cells.filter((c) => !ok.has(key(c))).map((c) => `col ${c.tx} row ${c.row}`)).toEqual(
        [],
      );
    });
  }
});
