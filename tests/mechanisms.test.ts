import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { MECHANISMS } from '../src/config/mechanisms';
import { PLAYER_PHYSICS } from '../src/config/physics';
import { World } from '../src/sim/World';
import { makeWorld, run, tap } from './helpers';

describe('syrup pump lift', () => {
  it('rises one step per landing, carries the rider, stops at max', () => {
    // Помпа стоит на полу в центре комнаты; игрок прыгает на неё с места.
    const w = makeWorld({
      start: { x: 128, y: 100 },
      spawns: [{ type: 'lift', kind: '', x: 128, y: 208 }],
    });
    const p = w.players[0]!;
    const lift = w.mech.lifts[0]!;
    run(w, 60);
    expect(p.y + p.h).toBe(lift.y);
    expect(lift.steps).toBe(1);
    for (let i = 0; i < 5; i++) {
      run(w, 2, ['jump']);
      run(w, 60);
    }
    expect(lift.steps).toBe(lift.maxSteps);
    run(w, 60);
    expect(lift.y).toBe(lift.baseY - lift.maxSteps * MECHANISMS.lift.stepPx);
    expect(p.y + p.h).toBe(lift.y);
    expect(p.onGround).toBe(true);
  });
});

describe('sink: valve, rising water, floating jug', () => {
  const sink = () =>
    makeWorld({
      start: { x: 40, y: 208 },
      zones: [
        { kind: 'trigger', x: 60, y: 160, w: 16, h: 48 },
        { kind: 'flood', x: 96, y: 96, w: 128, h: 112 },
      ],
      spawns: [{ type: 'floater', kind: '', x: 160, y: 208 }],
    });

  it('the valve starts the water and the jug floats up with its rider', () => {
    const w = sink();
    const p = w.players[0]!;
    const flood = w.mech.floods[0]!;
    const jug = w.mech.floaters[0]!;
    expect(jug.active).toBe(false);
    run(w, 12, ['right']); // до вентиля, не заходя в раковину
    expect(flood.active).toBe(true);
    expect(jug.active).toBe(true);
    // Посадить игрока на кораблик и дать воде подняться.
    p.placeAt(jug.x + jug.w / 2, jug.y);
    run(w, 400);
    expect(flood.full).toBe(true);
    expect(p.active).toBe(true);
    expect(p.y + p.h).toBeCloseTo(jug.y, 0);
    expect(jug.y).toBeLessThan(150);
  });

  it('falling into the water costs a life', () => {
    const w = sink();
    const p = w.players[0]!;
    run(w, 12, ['right']); // до вентиля, не заходя в раковину
    run(w, 200);
    p.placeAt(110, 200);
    run(w, 5);
    expect(p.state).toBe('dead');
    run(w, PLAYER_PHYSICS.deathFrames);
    expect(p.vitals.lives).toBe(BALANCE.startLives - 1);
  });

  it('dying resets the sink: water drains, jug hides', () => {
    const w = sink();
    const p = w.players[0]!;
    run(w, 12, ['right']); // до вентиля, не заходя в раковину
    run(w, 100);
    p.kill(w);
    run(w, PLAYER_PHYSICS.deathFrames);
    expect(w.mech.floods[0]!.active).toBe(false);
    expect(w.mech.floaters[0]!.active).toBe(false);
  });
});

describe('part exit', () => {
  it('touching the exit freezes the world and reports it; carry keeps hearts, lives, timecodes', () => {
    const w = makeWorld({
      start: { x: 40, y: 208 },
      zones: [{ kind: 'exit', x: 200, y: 160, w: 16, h: 48 }],
    });
    const p = w.players[0]!;
    p.vitals.hearts = 2;
    p.timecodes = 7;
    run(w, 200, ['right']);
    expect(w.drainEvents().some((e) => e.type === 'exit')).toBe(true);
    expect(w.frozen).toBe(true);
    const carry = w.carryOut();
    const next = makeWorld({ start: { x: 40, y: 208 } });
    const fresh = makeWorld({});
    expect(fresh.players[0]!.vitals.hearts).toBe(BALANCE.startHearts);
    const carried = new World(next.level, [{ id: 1, hero: 'sergey' }], 1, carry);
    expect(carried.players[0]!.vitals.hearts).toBe(2);
    expect(carried.players[0]!.timecodes).toBe(7);
    tap(carried, []);
  });
});
