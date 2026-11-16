import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { ARCHIVE_ENEMIES } from '../src/config/enemies';
import { ARCHIVE_HALL } from '../src/config/mechanisms';
import { LEVELS } from '../src/data/levels';
import { Candle } from '../src/sim/enemies/Candle';
import { CommentGhost } from '../src/sim/enemies/CommentGhost';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import { autopilotKeys } from './autopilot';
import { makeWorld, run, TestInput } from './helpers';

const parts = LEVELS[5]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);

describe('level 5 data: warehouse → portrait hall → Mikitko arena', () => {
  it('three parts; the warehouse goes right, up, right; the hall flickers; the arena has the boss', () => {
    expect(parts).toHaveLength(3);
    expect(level(0).segments.map((s) => s.dir)).toEqual(['right', 'up', 'right']);
    expect(level(1).flicker).toBe(true);
    expect(level(1).zones.some((z) => z.kind === 'helper')).toBe(true);
    expect(level(2).segments.at(-1)?.boss).toBe('mikitko');
    // ТЗ: ~10 экранов вправо.
    const screens =
      level(0).segments.reduce((n, s) => n + s.w / 256, 0) + level(1).segments[0]!.w / 256;
    expect(screens).toBeGreaterThanOrEqual(9);
  });

  it('level-5 enemies, a star in each part (the hall one is the stash on the portrait), coffee, timecodes', () => {
    let tcs = 0;
    for (const i of [0, 1]) {
      const sp = level(i).spawns;
      const kinds = new Set(sp.filter((s) => s.type === 'enemy').map((s) => s.kind));
      expect(kinds.has('candle'), `part ${i}`).toBe(true);
      expect(kinds.has('commentGhost'), `part ${i}`).toBe(true);
      expect(sp.some((s) => s.kind === 'star')).toBe(true);
      expect(sp.some((s) => s.contains === 'coffee')).toBe(true);
      tcs +=
        sp.filter((s) => s.kind === 'timecode').length +
        sp.filter((s) => s.contains === 'timecode').length;
    }
    expect(tcs).toBeGreaterThanOrEqual(BALANCE.badgeThreshold);
  });
});

/** Автопилот, который на встрече с Петровским дослушивает реплику и идёт дальше. */
function walk(w: World, maxFrames: number): number {
  const p = w.players[0]!;
  const input = new TestInput();
  let held = false;
  let f = 0;
  for (; f < maxFrames; f++) {
    if (w.frozen) {
      const exited = w.drainEvents().some((e) => e.type === 'exit');
      if (exited) return f;
      w.resume();
    }
    const keys = autopilotKeys(w, p, held);
    held = keys.includes('jump');
    w.step({ 1: input.hold(...keys) });
  }
  throw new Error(`stuck at x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} seg=${w.camera.index}`);
}

describe('level 5 walkthrough (autopilot, invulnerable)', () => {
  for (const [i, name] of [
    [0, '5-1 warehouse: right → up the girders → door 22'],
    [1, '5-2 portrait hall: past Petrovsky → into the arena'],
  ] as const) {
    it(name, () => {
      const w = new World(level(i), [{ id: 1, hero: 'sergey' }]);
      w.setGod(true);
      walk(w, 60 * 180);
      expect(w.players[0]!.vitals.lives).toBe(BALANCE.startLives);
    });
  }
});

describe('Petrovsky (TZ: before the arena he restores hearts to the max)', () => {
  it('walking up to him: dialogue event, full hearts, only once', () => {
    const l = level(1);
    const w = new World(l, [{ id: 1, hero: 'sergey' }]);
    const p = w.players[0]!;
    p.vitals.hearts = 1;
    const z = l.zones.find((q) => q.kind === 'helper')!;
    p.x = z.x + z.w / 2 - p.w / 2;
    p.y = z.y + z.h - p.h;
    w.camera.x = Math.min(z.x - 64, l.segments[0]!.x + l.segments[0]!.w - 256);
    w.step({});
    const evs = w.drainEvents();
    expect(evs.some((e) => e.type === 'helper')).toBe(true);
    expect(p.vitals.hearts).toBe(p.vitals.maxHearts);
    expect(w.frozen).toBe(true);
    w.resume();
    p.vitals.hearts = 1;
    run(w, 30);
    expect(w.drainEvents().some((e) => e.type === 'helper')).toBe(false);
    expect(p.vitals.hearts).toBe(1);
  });
});

describe('portrait hall: the lights keep going out (as in the original)', () => {
  it('lit → flicker → dark (blue silhouettes, not pitch black) → lit again', () => {
    const w = new World(level(1), [{ id: 1, hero: 'sergey' }]);
    const H = ARCHIVE_HALL;
    const states: boolean[] = [];
    for (let f = 0; f < H.litFrames + H.flickerFrames + H.darkFrames + 10; f++) {
      w.step({});
      states.push(w.dark);
    }
    expect(states.slice(0, H.litFrames - 2).every((d) => !d)).toBe(true);
    expect(
      states
        .slice(H.litFrames + H.flickerFrames + 5, H.litFrames + H.flickerFrames + H.darkFrames - 2)
        .every((d) => d),
    ).toBe(true);
    expect(states.at(-1)).toBe(false);
    expect(w.darkness.alpha).toBeLessThan(1);
  });
});

describe('level 5 enemies', () => {
  it('comment ghost drifts to the player through walls and vanishes for 1 s every 3 s', () => {
    const w = makeWorld();
    const g = new CommentGhost({ x: 200, y: 100 }, 1);
    w.enemies.push(g);
    const p = w.players[0]!;
    const d0 = Math.hypot(g.x - p.x, g.y - p.y);
    let goneFrames = 0;
    for (let f = 0; f < ARCHIVE_ENEMIES.commentGhost.cycleFrames; f++) {
      w.step({});
      if (g.gone) {
        goneFrames++;
        expect(g.harmful).toBe(false);
        expect(g.invulnerable).toBe(true);
      }
    }
    expect(goneFrames).toBe(ARCHIVE_ENEMIES.commentGhost.goneFrames);
    expect(Math.hypot(g.x - p.x, g.y - p.y)).toBeLessThan(d0);
  });

  it('upside-down candle walks under a girder and drops when the hero passes below', () => {
    const l = level(0);
    const sp = l.spawns.find((s) => s.kind === 'candleCeil')!;
    const w = new World(l, [{ id: 1, hero: 'sergey' }]);
    w.setGod(true);
    const c = new Candle(sp, 999, true);
    w.enemies.push(c);
    const p = w.players[0]!;
    const T = l.grid.size;
    // Камера рядом (иначе враг за экраном пропадает), герой в начале — не под свечой.
    w.camera.x = Math.max(0, c.x - 200);
    p.x = w.camera.x + 4;
    const x0 = c.x;
    for (let f = 0; f < 40; f++) w.step({});
    expect(c.ceiling).toBe(true);
    expect(c.x).not.toBe(x0);
    expect(l.grid.isOneway(Math.floor((c.x + c.w / 2) / T), Math.floor((c.y - 1) / T))).toBe(true);
    // Герой под ней — падает и дальше ходит по полу.
    p.x = c.x;
    p.y = 43 * T - p.h;
    w.step({});
    expect(c.ceiling).toBe(false);
    for (let f = 0; f < 60; f++) w.step({});
    expect(c.onGround).toBe(true);
  });
});
