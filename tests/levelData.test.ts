import { describe, expect, it } from 'vitest';
import { PLAYER_PHYSICS } from '../src/config/physics';
import { LEVELS } from '../src/data/levels';
import { Camera } from '../src/sim/Camera';
import { contains } from '../src/sim/geom';
import { parseTiledLevel } from '../src/sim/level';

/** Все части всех готовых уровней: «1-1», «2-2»… */
const allParts = Object.entries(LEVELS).flatMap(([id, parts]) =>
  (parts ?? []).map((p, i) => ({ name: `${id}-${i + 1}`, level: parseTiledLevel(p.map) })),
);

describe('level data: every part of every level', () => {
  for (const { name, level } of allParts) {
    const T = level.grid.size;
    describe(`part ${name}`, () => {
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
});

describe('every level: every box can actually be picked up', () => {
  // Ящик берут, уперевшись сбоку: рядом на той же поверхности должно быть место, где игрок встанет.
  // Верхний ящик стопки снимают, взяв нижний, — проверяем нижний.
  for (const { name, level } of allParts) {
    it(`part ${name}: each box has a free side to push against`, () => {
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
