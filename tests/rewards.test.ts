import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { addTimecode, newVitals } from '../src/sim/health';
import { Pickup } from '../src/sim/Pickup';
import { nudgeVolume, volume, volumeBar, VOLUME_STEPS } from '../src/systems/Volume';
import { makeWorld, run } from './helpers';

describe('100 timecodes: the counter resets, +1 heart (up to 5)', () => {
  it('the 100th timecode raises max hearts and heals one', () => {
    const v = newVitals();
    v.hearts = 2;
    let n = 0;
    for (let i = 0; i < 99; i++) n = addTimecode(v, n).count;
    expect(n).toBe(99);
    expect(v.maxHearts).toBe(BALANCE.startHearts);
    const r = addTimecode(v, n);
    expect(r).toEqual({ count: 0, heart: true });
    expect(v.maxHearts).toBe(BALANCE.startHearts + 1);
    expect(v.hearts).toBe(3);
  });

  it('never more than five hearts', () => {
    const v = newVitals();
    let n = 0;
    for (let i = 0; i < 100 * 6; i++) n = addTimecode(v, n).count;
    expect(v.maxHearts).toBe(BALANCE.maxHeartsCap);
    expect(BALANCE.maxHeartsCap).toBe(5);
    expect(n).toBe(0);
  });

  it('in the world: picking the 100th timecode gives the heart', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    p.timecodes = 99;
    w.pickups.push(new Pickup('timecode', { x: p.x + p.w / 2, y: p.y + p.h }, 1));
    run(w, 1);
    expect(p.timecodes).toBe(0);
    expect(p.vitals.maxHearts).toBe(BALANCE.startHearts + 1);
  });

  it('a star gives +1 life', () => {
    const w = makeWorld();
    const p = w.players[0]!;
    const lives = p.vitals.lives;
    w.pickups.push(new Pickup('star', { x: p.x + p.w / 2, y: p.y + p.h }, 1));
    run(w, 1);
    expect(p.vitals.lives).toBe(lives + 1);
  });
});

describe('separate music and sfx volume sliders', () => {
  it('steps 0…10 independently, clamped', () => {
    const sfx = volume('sfx');
    for (let i = 0; i < 20; i++) nudgeVolume('music', -1);
    expect(volume('music')).toBe(0);
    expect(volume('sfx')).toBe(sfx);
    nudgeVolume('music', 3);
    expect(volume('music')).toBeCloseTo(0.3);
    for (let i = 0; i < 20; i++) nudgeVolume('sfx', 1);
    expect(volume('sfx')).toBe(1);
    expect(volumeBar('music')).toHaveLength(VOLUME_STEPS);
  });
});
