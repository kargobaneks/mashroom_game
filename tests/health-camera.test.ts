import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { PLAYER_PHYSICS } from '../src/config/physics';
import { Camera } from '../src/sim/Camera';
import {
  addLife,
  heal,
  loseLife,
  newVitals,
  raiseMaxHearts,
  restoreForContinue,
  takeHit,
} from '../src/sim/health';
import type { Segment } from '../src/sim/level';

describe('health', () => {
  it('starts with 3 of 3 hearts and 3 lives', () => {
    const v = newVitals();
    expect(v).toMatchObject({ hearts: 3, maxHearts: 3, lives: 3 });
  });

  it('a hit costs one heart and grants invulnerability', () => {
    const v = newVitals();
    expect(takeHit(v)).toBe('hurt');
    expect(v.hearts).toBe(2);
    expect(v.invuln).toBe(PLAYER_PHYSICS.invulnerableFrames);
    expect(takeHit(v)).toBe('ignored');
    expect(v.hearts).toBe(2);
  });

  it('the last heart kills', () => {
    const v = newVitals();
    v.hearts = 1;
    expect(takeHit(v)).toBe('killed');
    expect(v.hearts).toBe(0);
  });

  it('coffee heals, but not above the max', () => {
    const v = newVitals();
    v.hearts = 1;
    heal(v);
    expect(v.hearts).toBe(2);
    heal(v);
    heal(v);
    expect(v.hearts).toBe(3);
  });

  it('badges raise max hearts up to the cap of 5', () => {
    const v = newVitals();
    for (let i = 0; i < 10; i++) raiseMaxHearts(v);
    expect(v.maxHearts).toBe(BALANCE.maxHeartsCap);
  });

  it('losing a life respawns with full hearts; the last life means out', () => {
    const v = newVitals();
    v.hearts = 0;
    expect(loseLife(v)).toBe('respawn');
    expect(v.hearts).toBe(v.maxHearts);
    expect(v.lives).toBe(2);
    addLife(v);
    expect(v.lives).toBe(3);
    loseLife(v);
    loseLife(v);
    expect(loseLife(v)).toBe('out');
    expect(v.lives).toBe(0);
    restoreForContinue(v);
    expect(v.lives).toBe(BALANCE.startLives);
    expect(v.hearts).toBe(v.maxHearts);
  });
});

const seg = (dir: Segment['dir'], x: number, y: number, w: number, h: number): Segment => ({
  dir,
  x,
  y,
  w,
  h,
  boss: null,
  respawn: { x: x + 32, y: y + 200 },
});
const body = (x: number, y = 100) => ({ x, y, w: 12, h: 20 });

describe('Camera', () => {
  const segments = [
    seg('right', 0, 0, 1024, 240),
    seg('down', 768, 0, 256, 720),
    seg('lock', 768, 480, 256, 240),
  ];

  it('scrolls right after the leader and never back', () => {
    const c = new Camera(segments);
    c.update([body(300)]);
    const x = c.x;
    expect(x).toBeGreaterThan(0);
    c.update([body(100)]);
    expect(c.x).toBe(x);
  });

  it('in coop does not leave the laggard behind', () => {
    const c = new Camera(segments);
    c.update([body(600), body(200)]);
    expect(c.x).toBeLessThanOrEqual(200);
  });

  it('moves through segments right → down → lock', () => {
    const c = new Camera(segments);
    const entered = c.update([body(1000)]);
    expect(entered?.dir).toBe('down');
    expect(c.x).toBe(768);
    const lock = c.update([body(900, 700)]);
    expect(lock?.dir).toBe('lock');
    expect(c.y).toBe(480);
    c.update([body(900, 0)]);
    expect(c.y).toBe(480);
  });

  it('clamps bodies to the screen and detects pits', () => {
    const c = new Camera(segments);
    c.update([body(500)]);
    const b = body(0);
    c.clamp(b);
    expect(b.x).toBe(c.x);
    expect(c.fellOut(body(500, 250))).toBe(true);
    expect(c.fellOut(body(500, 200))).toBe(false);
  });
});
