import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import { drive } from './autopilot';
import { TestInput } from './helpers';

const parts = LEVELS[1]!;
const world = (i: number) => {
  const w = new World(parseTiledLevel(parts[i]!.map), [{ id: 1, hero: 'sergey' }]);
  w.setGod(true);
  return w;
};
const exited = (w: World) => () => w.frozen && !w.boss;

describe('level 1 walkthrough (autopilot, invulnerable but mortal to pits and water)', () => {
  it('1-1 hall: start → exit door', () => {
    const w = world(0);
    const frames = drive(w, exited(w), 60 * 120);
    expect(w.frozen).toBe(true);
    expect(w.players[0]!.vitals.lives).toBeGreaterThanOrEqual(BALANCE.startLives);
    expect(frames).toBeLessThan(60 * 60);
  });

  it('1-2 kitchen: floor → climb the zigzag shelves → top floor → exit door', () => {
    const w = world(1);
    drive(w, exited(w), 60 * 180);
    const p = w.players[0]!;
    if (!w.frozen)
      throw new Error(`stuck at x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} seg=${w.camera.index}`);
    expect(p.vitals.lives).toBeGreaterThanOrEqual(BALANCE.startLives);
  });

  it('1-3 sink: screens 0–5 → inside the giant sink; valve, jump on the jug, float up, jump to the exit', () => {
    const w = world(2);
    const p = w.players[0]!;
    const T = w.grid.size;
    // До раковины — автопилотом.
    drive(w, () => p.x > 92 * T, 60 * 90); // до тумбы у борта мойки
    expect(p.vitals.lives).toBeGreaterThanOrEqual(BALANCE.startLives);
    // Дальше — как игрок: спрыгнуть на дно к вентилю, сразу на кораблик, ждать, прыгнуть на уступ.
    const inp = new TestInput();
    const hold = (frames: number, ...keys: Parameters<TestInput['hold']>) => {
      for (let i = 0; i < frames; i++) w.step({ 1: inp.hold(...keys) });
    };
    p.placeAt(98 * T + 8, 14 * T); // спустились с борта на дно, у вентиля
    hold(2);
    expect(w.mech.floods[0]!.active).toBe(true);
    // Прыжок вправо на кораблик: стрелка зажата до приземления.
    const jug = w.mech.floaters[0]!;
    for (let i = 0; i < 60 && p.x + p.w < jug.x - 2; i++) hold(1, 'right'); // подойти вплотную
    // Прыжок: стрелку держать, пока не окажешься над молочником, потом отпустить.
    hold(1, 'right', 'jump');
    for (let i = 0; i < 40 && !(p.onGround && jug.isRider(p)); i++) {
      if (p.x + p.w / 2 < jug.x + jug.w / 2) hold(1, 'right', 'jump');
      else hold(1, 'jump');
    }
    hold(10);
    expect(p.y + p.h).toBeCloseTo(jug.y, 0);
    for (let i = 0; i < 600 && !w.mech.floods[0]!.full; i++) hold(1);
    expect(p.active).toBe(true);
    hold(30, 'right', 'jump');
    hold(60, 'right');
    expect(w.frozen).toBe(true);
    expect(w.drainEvents().some((e) => e.type === 'exit')).toBe(true);
  });

  it('1-4 arena: from the foam onto the counters and up the wall shelves to the top', () => {
    const w = world(3);
    w.warpToBoss();
    w.resume();
    const p = w.players[0]!;
    w.boss!.state = 'defeated'; // бой не мешает проверке геометрии
    const T = w.grid.size;
    const AY = w.camera.y;
    const inp = new TestInput();
    const step = (...k: Parameters<TestInput['hold']>) => w.step({ 1: inp.hold(...k) });
    for (let i = 0; i < 60 && !p.controlled; i++) step();
    const feet = () => p.y + p.h - AY;
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;
      // Из пены у тумбы — прыжок к стене на тумбу.
      p.placeAt((side === 'left' ? 5 : 10) * T + 8, AY + 208);
      for (let i = 0; i < 5; i++) step();
      for (let i = 0; i < 30; i++) step(side, 'jump');
      for (let i = 0; i < 20; i++) step();
      expect(feet(), `${side}: onto the counter`).toBe(192);
      // С тумбы — сквозь полку наверх.
      for (let i = 0; i < 30; i++) step('jump');
      for (let i = 0; i < 20; i++) step();
      expect(feet(), `${side}: onto the shelf`).toBe(160);
      // Полочка (128) и верхняя полочка (96) у стены — прыжок к стене.
      for (const want of [128, 96]) {
        for (let i = 0; i < 30; i++) step(side, 'jump');
        for (let i = 0; i < 20; i++) step(side);
        expect(feet(), `${side}: up to ${want}`).toBe(want);
      }
      expect(sign).not.toBe(0);
    }
  });

  it('1-4 basement: down the shaft into the boss arena', () => {
    const w = world(3);
    drive(w, () => w.boss !== null, 60 * 30);
    expect(w.boss).not.toBeNull();
    expect(w.camera.segment.dir).toBe('lock');
  });
});
