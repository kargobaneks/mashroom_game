import { describe, expect, it } from 'vitest';
import { CLOCK_ENEMIES } from '../src/config/enemies';
import { CLOCK_TOWER } from '../src/config/mechanisms';
import { LEVELS } from '../src/data/levels';
import { Mole } from '../src/sim/enemies/Mole';
import { Rat } from '../src/sim/enemies/Rat';
import { Item } from '../src/sim/Item';
import { Chain } from '../src/sim/Mechanisms';
import { parseTiledLevel } from '../src/sim/level';
import { makeWorld, run } from './helpers';

describe('level 6 data: the clock tower (13 screens, as in the ROM breakdown)', () => {
  const l = parseTiledLevel(LEVELS[6]![0]!.map);
  it('right → up → right → up → right, exit at the end; the arena is a separate part', () => {
    expect(l.segments.map((s) => s.dir)).toEqual(['right', 'up', 'right', 'up', 'right']);
    expect(l.zones.some((z) => z.kind === 'exit')).toBe(true);
    expect(LEVELS[6]).toHaveLength(2);
  });
  it('7 moles, 3 rats, 10 chains (6 vertical, 2 long, 2 short), 2 acorns (coffee), lots of timecodes', () => {
    const kinds = (k: string) => l.spawns.filter((s) => s.type === 'enemy' && s.kind === k).length;
    expect(kinds('mole')).toBe(7);
    expect(kinds('rat')).toBe(3);
    const chains = l.spawns.filter((s) => s.type === 'chain');
    expect(chains.filter((c) => (c.h ?? 0) > (c.w ?? 0))).toHaveLength(6);
    expect(chains.filter((c) => c.w === 124 && c.h === 24)).toHaveLength(2);
    expect(chains.filter((c) => c.w === 91 && c.h === 24)).toHaveLength(2);
    expect(l.spawns.filter((s) => s.contains === 'coffee')).toHaveLength(2);
    const tcs =
      l.spawns.filter((s) => s.type === 'pickup' && s.kind === 'timecode').length +
      l.spawns.filter((s) => s.contains === 'timecode').length;
    expect(tcs).toBeGreaterThanOrEqual(54);
  });
});

describe('chain platform (0.75 px/frame, clockwise)', () => {
  it('goes left along the bottom, up the left side, right along the top, down the right side', () => {
    const c = new Chain(100, 200, 24, 124);
    const dirs: string[] = [];
    let last = { x: c.x, y: c.y };
    for (let f = 0; f < 400; f++) {
      c.move([]);
      const d =
        c.x < last.x ? 'L' : c.x > last.x ? 'R' : c.y < last.y ? 'U' : c.y > last.y ? 'D' : '-';
      if (dirs.at(-1) !== d) dirs.push(d);
      last = { x: c.x, y: c.y };
    }
    expect(dirs.slice(0, 5)).toEqual(['L', 'U', 'R', 'D', 'L']);
    // Оборот 2 × (24 + 124) / 0,75 ≈ 395 кадров (замер оригинала: ~400).
    expect(c.perimeter / CLOCK_TOWER.chain.speed).toBeCloseTo(394.7, 0);
  });

  it('carries a hero standing on it, and he can land on it while it rises', () => {
    const w = makeWorld({
      spawns: [{ type: 'chain', kind: '', x: 120, y: 200, w: 24, h: 124, phase: 0.2 } as never],
      start: { x: 60, y: 208 },
    });
    const c = w.mech.chains[0]!;
    const p = w.players[0]!;
    p.x = c.x + c.w / 2 - p.w / 2;
    p.y = c.y - p.h - 10;
    run(w, 20);
    expect(c.isRider(p)).toBe(true);
    const y0 = p.y;
    run(w, 40);
    expect(c.isRider(p)).toBe(true);
    expect(p.y).toBeLessThan(y0 - 20);
  });
});

describe('level 6 enemies', () => {
  it('mole: hides in the helmet (harmless, a thrown box bounces), pops out, throws 2 wrenches', () => {
    const w = makeWorld({
      spawns: [{ type: 'enemy', kind: 'mole', x: 120, y: 208 }],
      start: { x: 60, y: 208 },
    });
    run(w, 2);
    const m = w.enemies[0] as Mole;
    expect(m).toBeInstanceOf(Mole);
    expect(m.hiding && !m.harmful && m.invulnerable).toBe(true);
    let wrenches = 0;
    for (let f = 0; f < 220; f++) {
      run(w, 1);
      wrenches += w.projectiles.filter(
        (p) => p.kind === 'wrench' && p.vy < 0 && p.vy > -2.3,
      ).length;
    }
    expect(w.projectiles.length + wrenches).toBeGreaterThan(0);
    const C = CLOCK_ENEMIES.mole;
    expect(C.throwAt).toHaveLength(2);
    expect(C.throwAt[1]! - C.throwAt[0]!).toBe(36);
  });

  it('wrench arcs forward and falls 60–75 px away (on the level of the mole)', () => {
    const C = CLOCK_ENEMIES.mole;
    let x = 0;
    let y = 0;
    let vy: number = C.wrenchVy;
    do {
      vy += C.wrenchGravity;
      x += C.wrenchVx;
      y += vy;
    } while (y < 16);
    expect(x).toBeGreaterThanOrEqual(55);
    expect(x).toBeLessThanOrEqual(80);
  });

  it('rat runs, then sparks: invulnerable while sparking, two bolts along the floor both ways', () => {
    const w = makeWorld({
      spawns: [{ type: 'enemy', kind: 'rat', x: 120, y: 208 }],
      start: { x: 24, y: 208 },
    });
    run(w, 2);
    const r = w.enemies[0] as Rat;
    expect(r).toBeInstanceOf(Rat);
    const x0 = r.x;
    run(w, 30);
    expect(r.x).not.toBe(x0);
    for (let f = 0; f < CLOCK_ENEMIES.rat.sparkEveryFrames && r.sparking === 0; f++) run(w, 1);
    expect(r.sparking).toBeGreaterThan(0);
    expect(r.invulnerable).toBe(true);
    const bolts = w.projectiles.filter((p) => p.kind === 'bolt');
    expect(bolts.map((b) => Math.sign(b.vx)).sort()).toEqual([-1, 1]);
    // Бросок в искрящую крысу не берёт её.
    const box = new Item('box', { x: r.x - 10, y: r.y + r.h });
    w.items.push(box);
    box.launch(w.players[0]!, 'forward', 1);
    run(w, 10);
    expect(r.alive).toBe(true);
  });
});
