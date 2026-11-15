import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import type { LevelId } from '../src/config/levels';
import {
  applyEvent,
  newRun,
  parkOptions,
  routeOf,
  type FlowEvent,
  type Route,
  type Run,
} from '../src/systems/Flow';

function play(start: Run, events: FlowEvent[]): Route[] {
  let run: Run | null = start;
  const routes: Route[] = [routeOf(start)];
  for (const ev of events) {
    if (!run) throw new Error('run ended early');
    const tr = applyEvent(run, ev);
    run = tr.run;
    routes.push(tr.route);
  }
  return routes;
}

const done: FlowEvent = { type: 'done' };
const pick = (level: LevelId): FlowEvent => ({ type: 'parkPick', level });
const label = (r: Route): string => {
  switch (r.scene) {
    case 'Cutscene':
      return `Cutscene:${r.id}`;
    case 'Level':
      return `Level:${r.level}`;
    case 'Bonus':
      return `Bonus:${r.game}`;
    default:
      return r.scene;
  }
};

describe('Flow', () => {
  it('runs the whole game in story order (TZ «Порядок сцен»)', () => {
    const routes = play(newRun(1, 'sergey'), [
      ...Array<FlowEvent>(14).fill(done),
      pick(6),
      done,
      pick(7),
      done,
      pick(8),
      done,
      pick(9),
      done,
      done,
    ]);
    expect(routes.map(label)).toEqual([
      'Cutscene:intro',
      'Level:1',
      'WireChoice',
      'Cutscene:l1_end',
      'Level:2',
      'Cutscene:l2_end',
      'Level:3',
      'Bonus:crane',
      'Cutscene:l3_end',
      'Level:4',
      'Cutscene:l4_end',
      'Level:5',
      'Cutscene:l5_end',
      'Bonus:stars',
      'ParkHub',
      'Level:6',
      'ParkHub',
      'Level:7',
      'ParkHub',
      'Level:8',
      'ParkHub',
      'Level:9',
      'Ending',
      'Title',
    ]);
  });

  function atPark(): Run {
    let run = newRun(2, 'sergey');
    while (routeOf(run).scene !== 'ParkHub') run = applyEvent(run, done).run!;
    return run;
  }

  it('allows park attractions in any order and opens the gate after three keys', () => {
    for (const order of [
      [6, 7, 8],
      [8, 6, 7],
      [7, 8, 6],
    ] as LevelId[][]) {
      let run = atPark();
      for (const l of order) {
        expect(parkOptions(run).gateOpen).toBe(false);
        expect(() => applyEvent(run, pick(9))).toThrow();
        run = applyEvent(run, pick(l)).run!;
        expect(routeOf(run)).toEqual({ scene: 'Level', level: l });
        run = applyEvent(run, done).run!;
        expect(routeOf(run).scene).toBe('ParkHub');
        expect(() => applyEvent(run, pick(l))).toThrow();
      }
      expect(parkOptions(run)).toEqual({ remaining: [], gateOpen: true });
      expect(applyEvent(run, pick(9)).route).toEqual({ scene: 'Level', level: 9 });
    }
  });

  it('continues from the same level and limits continues', () => {
    let run = applyEvent(newRun(1, 'ivan'), done).run!; // Level 1
    for (let i = 0; i < BALANCE.continues; i++) {
      const over = applyEvent(run, { type: 'gameOver' });
      expect(over.route).toEqual({ scene: 'GameOver', canContinue: true });
      const cont = applyEvent(over.run!, { type: 'continue' });
      expect(cont.route).toEqual({ scene: 'Level', level: 1 });
      run = cont.run!;
    }
    const over = applyEvent(run, { type: 'gameOver' });
    expect(over.route).toEqual({ scene: 'GameOver', canContinue: false });
    expect(() => applyEvent(over.run!, { type: 'continue' })).toThrow();
    expect(applyEvent(over.run!, { type: 'quit' })).toEqual({
      run: null,
      route: { scene: 'Title' },
    });
  });

  it('continuing inside a park attraction restarts that attraction', () => {
    let run = applyEvent(atPark(), pick(7)).run!;
    run = applyEvent(run, { type: 'gameOver' }).run!;
    expect(applyEvent(run, { type: 'continue' }).route).toEqual({ scene: 'Level', level: 7 });
  });
});
