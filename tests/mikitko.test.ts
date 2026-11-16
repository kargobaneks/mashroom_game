import { describe, expect, it } from 'vitest';
import { BOSS_RULES, MIKITKO } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { Mikitko } from '../src/sim/bosses/Mikitko';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

const arena = () => parseTiledLevel(LEVELS[5]!.at(-1)!.map);

function arenaWorld(seed = 1): World {
  const w = new World(arena(), [{ id: 1, hero: 'sergey' }], seed);
  w.resume(); // конец вступительной реплики
  return w;
}

const mik = (w: World): Mikitko => {
  if (!(w.boss instanceof Mikitko)) throw new Error('no Mikitko');
  return w.boss;
};

function stepUntil(w: World, cond: () => boolean, max = 2000): number {
  const idle = new TestInput();
  for (let f = 0; f < max; f++) {
    if (cond()) return f;
    w.step({ 1: idle.hold() });
  }
  throw new Error('condition not reached');
}

describe('Mikitko arena (level 5)', () => {
  it('entering the archive hall starts the fight with the ghost; lights are on', () => {
    const w = new World(arena(), [{ id: 1, hero: 'sergey' }]);
    expect(w.boss?.name).toBe('mikitko');
    expect(w.frozen).toBe(true); // реплика
    w.resume();
    expect(w.dark).toBe(false);
    // Букв с начала нет — их роняет только призрак.
    expect(w.items.filter((i) => i.kind === 'letter')).toHaveLength(0);
  });
});

describe('Mikitko cycle (lights out → appears on the right, sways → sine with a letter OR dive with a beam)', () => {
  it('lights flicker, go out; he always appears on the right and sways up and down', () => {
    const w = arenaWorld();
    const b = mik(w);
    expect(b.opacity).toBe(0);
    expect(b.vulnerable).toBe(false);
    for (let k = 0; k < 4; k++) {
      stepUntil(w, () => b.state === 'flicker', 3000);
      stepUntil(w, () => b.state === 'appear');
      expect(w.dark).toBe(true);
      expect(b.x + b.w / 2).toBeGreaterThan(160);
      stepUntil(w, () => b.state === 'sway');
      const ys: number[] = [];
      while (b.state === 'sway') {
        ys.push(b.y);
        w.step({});
      }
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(MIKITKO.float.amplitude);
      expect(['sine', 'rise']).toContain(b.state);
      stepUntil(w, () => b.state === 'lit', 3000);
    }
  });

  it('both moves happen over a few cycles', () => {
    const w = arenaWorld();
    const b = mik(w);
    const seen = new Set<string>();
    for (let f = 0; f < 60 * 60; f++) {
      seen.add(b.state);
      w.step({});
    }
    expect(seen.has('sine')).toBe(true);
    expect(seen.has('rise')).toBe(true);
  });

  it('sine: drifts left slowly along a wave and drops a letter if there is none', () => {
    const w = arenaWorld(4);
    const b = mik(w);
    w.items = [];
    stepUntil(w, () => b.state === 'sine' || b.state === 'rise', 3000);
    while (b.state !== 'sine') {
      stepUntil(w, () => b.state === 'lit', 3000);
      stepUntil(w, () => b.state === 'sine' || b.state === 'rise', 3000);
    }
    w.items = [];
    const x0 = b.x;
    const ys: number[] = [];
    while (b.state === 'sine') {
      ys.push(b.y);
      w.step({});
    }
    expect(b.x).toBeLessThan(x0 - 100);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(MIKITKO.sine.amplitude);
    expect(w.items.filter((i) => i.kind === 'letter')).toHaveLength(1);
  });

  it('dive: up to the top, fast towards the lower-left corner, stops in the centre and fires', () => {
    const w = arenaWorld();
    const b = mik(w);
    const p = w.players[0]!;
    stepUntil(w, () => b.state === 'rise', 4000);
    stepUntil(w, () => b.state === 'dive');
    expect(b.y + b.h / 2).toBeLessThan(80);
    stepUntil(w, () => b.state === 'charge');
    expect(b.x + b.w / 2).toBeCloseTo(MIKITKO.dive.center.x, 0);
    expect(b.telegraphing).toBe(true);
    const f = stepUntil(w, () => b.state === 'shoot');
    expect(f).toBeGreaterThanOrEqual(BOSS_RULES.minTelegraphFrames);
    const beam = w.projectiles.find((q) => q.kind === 'beam');
    expect(beam).toBeDefined();
    // Вылетает из руки и летит туда, где герой стоял в начале зарядки.
    const bc = { x: beam!.x + beam!.w / 2, y: beam!.y + beam!.h / 2 };
    expect(Math.hypot(bc.x - b.hand.x, bc.y - b.hand.y)).toBeLessThan(MIKITKO.beam.speed + 1);
    expect(Math.hypot(beam!.vx, beam!.vy)).toBeCloseTo(MIKITKO.beam.speed);
    const to = { x: p.x + p.w / 2 - bc.x, y: p.y + p.h / 2 - bc.y };
    const cos = (to.x * beam!.vx + to.y * beam!.vy) / (Math.hypot(to.x, to.y) * MIKITKO.beam.speed);
    expect(cos).toBeGreaterThan(0.99);
    stepUntil(w, () => b.state === 'vanish');
    expect(Math.abs(b.x + b.w / 2 - MIKITKO.dive.corner.x)).toBeLessThan(1);
    // + покачивание
    expect(Math.abs(b.y + b.h / 2 - MIKITKO.dive.corner.y)).toBeLessThanOrEqual(
      MIKITKO.float.amplitude + 0.5,
    );
  });

  it('moves smoothly: no jumps in speed while visible, never low enough to hit a standing hero', () => {
    for (const seed of [1, 2, 3]) {
      const w = arenaWorld(seed);
      const b = mik(w);
      let prev: { x: number; y: number; dx: number; dy: number } | null = null;
      for (let f = 0; f < 60 * 60; f++) {
        w.step({});
        if (b.opacity === 0) {
          prev = null;
          continue;
        }
        expect(b.y + b.h, `seed ${seed} frame ${f}`).toBeLessThanOrEqual(186);
        const c = { x: b.x, y: b.y };
        if (prev) {
          const dx: number = c.x - prev.x;
          const dy: number = c.y - prev.y;
          expect(Math.hypot(dx - prev.dx, dy - prev.dy), `seed ${seed} frame ${f}`).toBeLessThan(
            0.25,
          );
          prev = { ...c, dx, dy };
        } else prev = { ...c, dx: 0, dy: 0 };
      }
    }
  });

  it('the beam never disappears: a sine is always followed by a dive with a beam', () => {
    // Игрок сразу бросает каждую букву (на арене пусто) — луч всё равно бывает.
    const w = arenaWorld();
    const b = mik(w);
    const moves: string[] = [];
    let beams = 0;
    for (let f = 0; f < 60 * 120; f++) {
      const before = b.state;
      w.step({});
      if (before === 'sway' && b.state !== 'sway') moves.push(b.state);
      if (before === 'charge' && b.state === 'shoot') beams++;
      w.items = w.items.filter((i) => i.kind !== 'letter');
    }
    for (let i = 1; i < moves.length; i++)
      if (moves[i - 1] === 'sine') expect(moves[i]).toBe('rise');
    expect(beams).toBeGreaterThanOrEqual(Math.floor(moves.length / 2));
  });

  it('letters come only from him: none fall from above; with none on the arena after a dive he takes the sine', () => {
    const w = arenaWorld();
    const b = mik(w);
    const seen = new Set<object>();
    for (let f = 0; f < 60 * 120; f++) {
      if (b.state === 'sway' && b.timer === 1) {
        const none = w.items.every((i) => i.kind !== 'letter' || i.state === 'gone');
        const afterDive = b.lastMove !== 'sine';
        w.step({});
        if (none && afterDive) expect(b.state).toBe('sine');
      } else w.step({});
      for (const it of w.items) {
        if (seen.has(it)) continue;
        seen.add(it);
        // Новая буква появилась — под призраком, пока он плывёт по синусоиде.
        expect(b.state).toBe('sine');
        expect(Math.abs(it.x + it.w / 2 - (b.x + b.w / 2))).toBeLessThan(2);
      }
      // Игрок «подобрал и выбросил» — буквы снова нет.
      if (f % 900 === 899) w.items = [];
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('never more than one letter on the arena', () => {
    const w = arenaWorld();
    for (let f = 0; f < 60 * 90; f++) {
      w.step({});
      expect(w.items.filter((i) => i.kind === 'letter').length).toBeLessThanOrEqual(1);
    }
    for (const it of w.items) expect(it.y + it.h).toBeLessThanOrEqual(208);
  });

  it('only a visible ghost can be hit; 7 hits; freed he becomes a man and lands on the floor', () => {
    const w = arenaWorld();
    const b = mik(w);
    expect(b.hit(w)).toBe(false); // невидим
    stepUntil(w, () => b.vulnerable);
    expect(b.hit(w)).toBe(true);
    expect(b.hit(w)).toBe(false); // неуязвим после удара
    for (let i = 1; i < MIKITKO.hp; i++) {
      stepUntil(w, () => b.vulnerable, 3000);
      expect(b.hit(w)).toBe(true);
    }
    expect(b.defeated).toBe(true);
    expect([b.w, b.h]).toEqual([MIKITKO.freed.width, MIKITKO.freed.height]);
    for (let f = 0; f < 300 && !b.landed; f++) w.stepCinematic();
    expect(b.landed).toBe(true);
  });
});

describe('Mikitko fight is winnable with buttons only', () => {
  // Бот: берёт ближайшую букву; призрак виден — низкий: встаёт в 40–90 px и бросает вперёд,
  // высокий: встаёт под ним и бросает вверх; на исходе зарядки или с лучом рядом — прыгает.
  for (const seed of [1, 2, 3]) {
    it(`bot beats him (seed ${seed}); letters never run out`, () => {
      const w = arenaWorld(seed);
      const p = w.players[0]!;
      const b = mik(w);
      const input = new TestInput();
      let prev: Action[] = [];
      let frames = 0;
      for (; frames < 60 * 180 && !b.defeated && !w.gameOver; frames++) {
        const cx = p.x + p.w / 2;
        const bx = b.x + b.w / 2;
        const go = (dx: number): Action => (dx > 0 ? 'right' : 'left');
        let keys: Action[] = [];
        const beam = w.projectiles.find(
          (q) =>
            q.kind === 'beam' &&
            Math.abs(q.x + q.w / 2 - cx) < 40 &&
            Math.sign(cx - (q.x + q.w / 2)) === Math.sign(q.vx),
        );
        // Как человек: прыгает на исходе зарядки (рука мигает) или если луч уже рядом.
        const shotSoon = b.telegraphing && b.timer <= 5;
        // Держит прыжок, пока летит вверх (иначе подскок обрезается).
        if (
          ((beam || shotSoon) && p.onGround) ||
          (!p.onGround && p.vy < 0 && prev.includes('jump'))
        )
          keys = ['jump'];
        else if (p.carriedItem) {
          const low = b.y + b.h > p.y + 2;
          if (b.vulnerable && low) {
            const dx = bx - cx;
            const want = 60 * Math.sign(-dx || 1);
            const off = cx - bx - want;
            if (Math.abs(off) > 12) keys = [go(-off)];
            else keys = p.facing === Math.sign(dx) ? ['action'] : [go(dx)];
          } else if (b.vulnerable) {
            const dx = bx - cx;
            keys = Math.abs(dx) < 8 && p.onGround ? ['up', 'action'] : [go(dx)];
          } else {
            // Ждём в середине арены.
            const dx = 128 - cx;
            if (Math.abs(dx) > 8) keys = [go(dx)];
          }
        } else if (p.controlled && p.onGround && p.y + p.h < 207) {
          // Стоит на буквах (они твёрдые, как ящики) — сойти на пол.
          keys = [go(cx < 128 ? -1 : 1)];
        } else if (p.controlled) {
          const it = w.items
            .filter((i) => i.kind === 'letter' && i.state === 'resting')
            .sort((a, c) => Math.abs(a.x - cx) - Math.abs(c.x - cx))[0];
          if (it) {
            const dx = it.x + it.w / 2 - cx;
            keys = Math.abs(dx) <= 16 ? [go(dx), 'action'] : [go(dx)];
          }
        }
        if (keys.includes('action') && prev.includes('action'))
          keys = keys.filter((k) => k !== 'action');
        // Новый прыжок — только по фронту.
        if (p.onGround && keys.includes('jump') && prev.includes('jump'))
          keys = keys.filter((k) => k !== 'jump');
        prev = keys;
        w.step({ 1: input.hold(...keys) });
      }
      if (!b.defeated)
        throw new Error(
          `not beaten: hp ${b.hp}, frames ${frames}, lives ${p.vitals.lives}, gameOver ${w.gameOver}`,
        );
      expect(frames).toBeLessThan(60 * 150);
    });
  }
});

describe('Mikitko is hurt only by thrown letters', () => {
  it('letters falling through him (spare ones from above, his own) do not hit him', () => {
    const w = arenaWorld();
    const b = mik(w);
    for (let f = 0; f < 60 * 90; f++) {
      if (b.vulnerable && f % 30 === 0) {
        // Буква падает прямо на него сверху.
        w.items.push(
          Object.assign(new Item('letter', { x: b.x + b.w / 2, y: b.y - 4 }), { vy: 2 }),
        );
      }
      w.step({});
    }
    expect(b.hp).toBe(MIKITKO.hp);
  });
});
