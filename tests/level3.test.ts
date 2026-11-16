import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { ENEMIES } from '../src/config/enemies';
import { LEVELS } from '../src/data/levels';
import { Crab } from '../src/sim/enemies/Crab';
import { Gull } from '../src/sim/enemies/Gull';
import { Rigger } from '../src/sim/enemies/Rigger';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import { drive } from './autopilot';
import { makeWorld, run } from './helpers';

const parts = LEVELS[3]!;
const level = (i: number) => parseTiledLevel(parts[i]!.map);

describe('level 3 data: deck → hold → shaft arena (order of the original)', () => {
  it('three parts: deck (right), hold (descent, then right), arena with Bordachev', () => {
    expect(parts).toHaveLength(3);
    expect(level(0).segments.map((s) => s.dir)).toEqual(['right']);
    expect(level(1).segments.map((s) => s.dir)).toEqual(['down', 'right']);
    expect(level(2).segments.at(-1)?.boss).toBe('bordachev');
    // ТЗ: ~6 экранов по палубе, спуск и ~5 экранов по трюму.
    expect(level(0).segments[0]!.w / 256).toBeGreaterThanOrEqual(6);
    expect(level(1).segments[1]!.w / 256).toBeGreaterThanOrEqual(5);
  });

  it('the deck has no pits: solid deck all the way (you cannot fall into the sea)', () => {
    const l = level(0);
    for (let tx = 0; tx < l.grid.cols; tx++) expect(l.grid.isSolid(tx, 13), `col ${tx}`).toBe(true);
  });

  it('uses the level-3 enemies (crab, gull, rigger) and has stars, coffee and timecodes', () => {
    for (const i of [0, 1]) {
      const sp = level(i).spawns;
      const kinds = new Set(sp.filter((s) => s.type === 'enemy').map((s) => s.kind));
      for (const k of ['crab', 'gull', 'rigger']) expect(kinds.has(k), `part ${i} ${k}`).toBe(true);
      expect(sp.some((s) => s.type === 'pickup' && s.kind === 'star')).toBe(true);
      expect(sp.some((s) => s.contains === 'coffee')).toBe(true);
    }
    const tcs = [0, 1].reduce((n, i) => {
      const sp = level(i).spawns;
      return (
        n +
        sp.filter((s) => s.kind === 'timecode').length +
        sp.filter((s) => s.contains === 'timecode').length
      );
    }, 0);
    expect(tcs).toBeGreaterThanOrEqual(BALANCE.badgeThreshold);
  });
});

describe('level 3 walkthrough (autopilot, invulnerable)', () => {
  for (const [i, name] of [
    [0, '3-1 deck: start → crates → door into the superstructure'],
    [1, '3-2 hold: down the shelves → right → door into the shaft'],
  ] as const) {
    it(name, () => {
      const w = new World(level(i), [{ id: 1, hero: 'sergey' }]);
      w.setGod(true);
      drive(w, () => w.frozen, 60 * 180);
      const p = w.players[0]!;
      if (!w.frozen)
        throw new Error(`stuck at x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} seg=${w.camera.index}`);
      expect(p.vitals.lives).toBe(BALANCE.startLives);
    });
  }
});

describe('level 3 enemies', () => {
  it('container crab walks sideways and every 2 s freezes with claws up', () => {
    const w = makeWorld();
    const c = new Crab({ x: 100, y: 208 }, 1);
    w.enemies.push(c);
    let froze = -1;
    const x0 = c.x;
    for (let f = 0; f < ENEMIES.crab.walkFrames + 5; f++) {
      run(w, 1);
      if (c.clawsUp && froze < 0) froze = f;
    }
    expect(Math.abs(c.x - x0)).toBeGreaterThan(30);
    expect(froze).toBeGreaterThanOrEqual(ENEMIES.crab.walkFrames - 2);
    const x1 = c.x;
    run(w, 10);
    expect(c.x).toBe(x1);
    expect(c.pose).toBe('claws');
  });

  it('gull drone circles, then dives at where the player stood 0.5 s ago', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    const g = new Gull({ x: 120, y: 60 }, 1);
    w.enemies.push(g);
    w.setGod(true);
    // Игрок стоит, потом отходит: чайка бьёт по старому месту.
    const old = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    run(w, ENEMIES.gull.diveEveryFrames - 10);
    expect(g.state).toBe('circle');
    p.placeAt(old.x + 120, 208);
    let lowest = -Infinity;
    let at = { x: 0, y: 0 };
    for (let f = 0; f < 200 && g.state !== 'return'; f++) {
      run(w, 1);
      if (g.y > lowest) {
        lowest = g.y;
        at = { x: g.x + g.w / 2, y: g.y + g.h / 2 };
      }
    }
    expect(g.state).toBe('return');
    expect(Math.abs(at.x - old.x)).toBeLessThan(ENEMIES.gull.lagFrames * 4 + 1);
    expect(at.y).toBeGreaterThan(150);
  });

  it('rigger rides up and down the rope and throws a nut in an arc at the player', () => {
    const w = makeWorld();
    const r = new Rigger({ x: 200, y: 150 }, 1);
    w.enemies.push(r);
    w.setGod(true);
    let minY = Infinity;
    let maxY = -Infinity;
    let nuts = 0;
    for (let f = 0; f < 400; f++) {
      const before = w.projectiles.length;
      run(w, 1);
      if (w.projectiles.length > before) nuts++;
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y);
    }
    expect(maxY - minY).toBeCloseTo(ENEMIES.rigger.travel, 0);
    expect(nuts).toBeGreaterThanOrEqual(3);
    expect(w.projectiles.every((q) => q.kind === 'nut')).toBe(true);
  });

  it('a nut lands where the player stands (the rigger aims)', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    const r = new Rigger({ x: 200, y: 120 }, 1);
    w.enemies.push(r);
    const hearts = p.vitals.hearts;
    run(w, ENEMIES.rigger.throwEveryFrames + ENEMIES.rigger.nutFrames + 10);
    expect(p.vitals.hearts).toBeLessThan(hearts);
  });
});
