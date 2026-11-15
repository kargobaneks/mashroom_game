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

  it('1-3 sink: screens 0–5 → basin; valve, jump on the jug, float up, jump to the exit ledge', () => {
    const w = world(2);
    const p = w.players[0]!;
    const T = w.grid.size;
    // До раковины — автопилотом.
    drive(w, () => p.x > 97 * T, 60 * 90);
    expect(p.vitals.lives).toBeGreaterThanOrEqual(BALANCE.startLives);
    // Дальше — как игрок: спрыгнуть на дно к вентилю, сразу на кораблик, ждать, прыгнуть на уступ.
    const inp = new TestInput();
    const hold = (frames: number, ...keys: Parameters<TestInput['hold']>) => {
      for (let i = 0; i < frames; i++) w.step({ 1: inp.hold(...keys) });
    };
    p.placeAt(100 * T + 8, 14 * T);
    hold(2);
    expect(w.mech.floods[0]!.active).toBe(true);
    // Прыжок вправо на кораблик: стрелка зажата до приземления.
    const jug = w.mech.floaters[0]!;
    hold(6, 'right', 'jump');
    for (let i = 0; i < 40 && !(p.onGround && jug.isRider(p)); i++) hold(1, 'right');
    hold(10);
    expect(p.y + p.h).toBeCloseTo(jug.y, 0);
    for (let i = 0; i < 600 && !w.mech.floods[0]!.full; i++) hold(1);
    expect(p.active).toBe(true);
    hold(30, 'right', 'jump');
    hold(60, 'right');
    expect(w.frozen).toBe(true);
    expect(w.drainEvents().some((e) => e.type === 'exit')).toBe(true);
  });

  it('1-4 basement: down the shaft into the boss arena', () => {
    const w = world(3);
    drive(w, () => w.boss !== null, 60 * 30);
    expect(w.boss).not.toBeNull();
    expect(w.camera.segment.dir).toBe('lock');
  });
});
