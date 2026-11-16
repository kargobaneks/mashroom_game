import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { FREEZER_ENEMIES } from '../src/config/enemies';
import { FREEZER } from '../src/config/mechanisms';
import { PLAYER_PHYSICS } from '../src/config/physics';
import { LEVELS } from '../src/data/levels';
import { formatTimer } from '../src/render/Hud';
import { Icicle } from '../src/sim/enemies/Icicle';
import { Phone } from '../src/sim/enemies/Phone';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import { drive } from './autopilot';
import { makeWorld, run } from './helpers';

const level = () => parseTiledLevel(LEVELS[4]![0]!.map);

describe('level 4 data: the giant fridge (no boss, timer, ice)', () => {
  it('one part: right → up → right → up, exit at the top, no boss', () => {
    expect(LEVELS[4]).toHaveLength(1);
    const l = level();
    expect(l.segments.map((s) => s.dir)).toEqual(['right', 'up', 'right', 'up']);
    expect(l.segments.every((s) => s.boss === null)).toBe(true);
    expect(l.zones.some((z) => z.kind === 'exit')).toBe(true);
  });

  it('3:00 timer and slippery floor come from the map', () => {
    const l = level();
    expect(l.timerFrames).toBe(180 * 60);
    expect(l.slippery).toBe(true);
  });

  it('level-4 enemies, melting platforms, a star, coffee and enough timecodes', () => {
    const sp = level().spawns;
    const kinds = new Set(sp.filter((s) => s.type === 'enemy').map((s) => s.kind));
    expect(kinds).toEqual(new Set(['icicle', 'phone']));
    expect(sp.filter((s) => s.type === 'melt').length).toBeGreaterThanOrEqual(3);
    expect(sp.some((s) => s.kind === 'star')).toBe(true);
    expect(sp.some((s) => s.contains === 'coffee')).toBe(true);
    const tcs =
      sp.filter((s) => s.kind === 'timecode').length +
      sp.filter((s) => s.contains === 'timecode').length;
    expect(tcs).toBeGreaterThanOrEqual(BALANCE.badgeThreshold);
  });
});

describe('level 4 walkthrough (autopilot, invulnerable)', () => {
  it('start → pipes up → upper tier over the shaft → vent, well inside 3:00', () => {
    const w = new World(level(), [{ id: 1, hero: 'sergey' }]);
    w.setGod(true);
    const frames = drive(w, () => w.frozen, 60 * 175);
    const p = w.players[0]!;
    if (!w.frozen)
      throw new Error(`stuck at x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} seg=${w.camera.index}`);
    expect(p.vitals.lives).toBe(BALANCE.startLives);
    expect(frames).toBeLessThan(180 * 60);
  });
});

describe('freezer timer', () => {
  it('time up: everyone loses a life, the timer starts again', () => {
    const w = makeWorld({ timerFrames: 120 });
    run(w, 119);
    expect(w.timeLeft).toBe(1);
    run(w, 1);
    expect(w.timeLeft).toBe(120);
    expect(w.players[0]!.state).toBe('dead');
    run(w, PLAYER_PHYSICS.deathFrames + 1);
    expect(w.players[0]!.vitals.lives).toBe(BALANCE.startLives - 1);
  });

  it("no timer elsewhere; HUD shows 2'59 style", () => {
    expect(makeWorld().timeLeft).toBeNull();
    expect(formatTimer(180 * 60)).toBe("3'00");
    expect(formatTimer(168 * 60)).toBe("2'48");
    expect(formatTimer(1)).toBe("0'01");
  });
});

describe('slippery floor', () => {
  it('speed builds up and runs out slowly on ice, instantly elsewhere', () => {
    const ice = makeWorld({ slippery: true });
    run(ice, 10);
    run(ice, 1, ['right']);
    expect(ice.players[0]!.vx).toBeCloseTo(FREEZER.ice.accel);
    run(ice, 60, ['right']);
    expect(ice.players[0]!.vx).toBe(PLAYER_PHYSICS.walkSpeed);
    const x0 = ice.players[0]!.x;
    run(ice, 60);
    expect(ice.players[0]!.x - x0).toBeGreaterThan(30); // проскользил

    const dry = makeWorld();
    run(dry, 10);
    run(dry, 1, ['right']);
    expect(dry.players[0]!.vx).toBe(PLAYER_PHYSICS.walkSpeed);
  });
});

describe('level 4 enemies', () => {
  it('icicle shakes when a hero is under it, falls, shatters, regrows; thrown boxes ignore it', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    const ic = new Icicle({ x: p.x + p.w / 2 + 40, y: 120 }, 1);
    w.enemies.push(ic);
    run(w, 10);
    expect(ic.state).toBe('hang');
    run(w, 25, ['right']);
    expect(['shake', 'fall']).toContain(ic.state);
    run(w, FREEZER_ENEMIES.icicle.shakeFrames + 60);
    expect(ic.state).toBe('regrow');
    expect(ic.harmful).toBe(false);
    run(w, 40, ['left']); // ушёл из-под неё — нарастёт и будет висеть
    run(w, FREEZER_ENEMIES.icicle.regrowFrames + 1);
    expect(ic.state).toBe('hang');
    expect(ic.invulnerable).toBe(true);
  });

  it('phone slides and bounces back off a wall', () => {
    const w = makeWorld();
    const ph = new Phone({ x: 120, y: 208 }, 1);
    w.enemies.push(ph);
    run(w, 1);
    expect(ph.facing).toBe(-1);
    let turned = false;
    for (let f = 0; f < 200 && !turned; f++) {
      run(w, 1);
      turned = ph.facing === 1;
    }
    expect(turned).toBe(true);
  });
});

describe('melting platform (2007 things in ice)', () => {
  it('stand on it → melts after 2 s → back after 4 s', () => {
    const w = makeWorld({
      spawns: [{ type: 'melt', kind: 'cd', x: 40, y: 160 }],
      start: { x: 40, y: 160 },
    });
    const m = w.mech.melts[0]!;
    run(w, 5);
    expect(w.players[0]!.onGround).toBe(true);
    expect(m.state).toBe('melting');
    run(w, FREEZER.melt.meltFrames);
    expect(m.state).toBe('gone');
    run(w, 20);
    expect(w.players[0]!.y + w.players[0]!.h).toBeGreaterThan(160); // провалился
    run(w, FREEZER.melt.goneFrames);
    expect(m.state).not.toBe('gone');
  });
});
