import { describe, expect, it } from 'vitest';
import { MIKITKO } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { Mikitko, type MikitkoPattern } from '../src/sim/bosses/Mikitko';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

const arena = () => parseTiledLevel(LEVELS[5]!.at(-1)!.map);
/** Пол арены у нас на 208, у оригинала — на 192: точки оригинала сдвинуты на 16 вниз. */
const FLOOR = 208;
const oy = (y: number) => y + (FLOOR - MIKITKO.floorY);

function arenaWorld(seed = 1): World {
  const w = new World(arena(), [{ id: 1, hero: 'sergey' }], seed);
  w.resume(); // конец вступительной реплики
  return w;
}

const mik = (w: World): Mikitko => {
  if (!(w.boss instanceof Mikitko)) throw new Error('no Mikitko');
  return w.boss;
};

function stepUntil(w: World, cond: () => boolean, max = 3000): number {
  const idle = new TestInput();
  for (let f = 0; f < max; f++) {
    if (cond()) return f;
    w.step({ 1: idle.hold() });
  }
  throw new Error('condition not reached');
}

/** Герой ногами в x на полу, лицом вправо (или влево). */
function place(w: World, x: number, facing: 1 | -1 = 1): void {
  const p = w.players[0]!;
  p.x = x - p.w / 2;
  p.y = FLOOR - p.h;
  p.vx = 0;
  p.vy = 0;
  p.facing = facing;
}

/** Дать герою букву в руки (сначала встать на пол: в воздухе бросок с пола не выйдет). */
function arm(w: World): void {
  w.step({});
  const p = w.players[0]!;
  const it = new Item('letter', { x: p.x + p.w / 2, y: FLOOR });
  it.state = 'carried';
  it.owner = p;
  w.items.push(it);
  p.carrying = { kind: 'item', item: it };
}

/** Следующее появление — с этим паттерном (подменяет выбор, остальное — как в бою). */
function force(b: Mikitko, pattern: MikitkoPattern): void {
  const start = (b as unknown as { startAppear: (w: World) => void }).startAppear.bind(b);
  (b as unknown as { startAppear: (w: World) => void }).startAppear = (w: World) => {
    start(w);
    (b as unknown as { pattern: MikitkoPattern }).pattern = pattern;
    if (pattern === 'bLong')
      (b as unknown as { drops: unknown }).drops = MIKITKO.bLong.drops.map((d) => ({ ...d }));
    if (pattern === 'a') (b as unknown as { drops: unknown }).drops = [];
  };
}

const bottom = (b: Mikitko) => b.y + b.h;
/** Убрать буквы прошлых появлений (иначе новые проваливаются — одна на полу). */
const clearLetters = (w: World) => (w.items = w.items.filter((i) => i.kind !== 'letter'));
const centre = (b: Mikitko) => b.x + b.w / 2;

describe('Mikitko arena (level 5)', () => {
  it('one flat floor, no platforms (as in the original); the hero starts at x 24', () => {
    const lvl = arena();
    const w = new World(lvl, [{ id: 1, hero: 'sergey' }]);
    expect(w.boss?.name).toBe('mikitko');
    expect(w.frozen).toBe(true); // реплика
    const p = w.players[0]!;
    expect(p.x + p.w / 2).toBe(24);
    expect(p.y + p.h).toBe(FLOOR);
    // Над полом нигде нельзя встать: ни тумб, ни полок.
    for (let x = 8; x < 248; x += 4)
      for (let y = 0; y < FLOOR - 4; y += 4)
        expect(w.grid.rectHitsSolid({ x, y, w: 1, h: 1 }), `${x},${y}`).toBe(false);
    expect(w.items.filter((i) => i.kind === 'letter')).toHaveLength(0);
  });
});

describe('Mikitko cycle (dark — ghost; light — empty)', () => {
  it('starts at once: dark, he is at G0 (200,144) and sways down to 190', () => {
    const w = arenaWorld();
    const b = mik(w);
    w.step({});
    expect(w.dark).toBe(true);
    expect(centre(b)).toBe(200);
    expect(bottom(b)).toBeCloseTo(oy(144), 0);
    let low = 0;
    while (b.state === 'appear' || b.state === 'sway') {
      low = Math.max(low, bottom(b));
      w.step({});
    }
    expect(low).toBeCloseTo(oy(MIKITKO.sway.lowY), 0);
  });

  it('vanishes → 31 frames dark → light 128 → back at G0 208 frames after vanishing', () => {
    const w = arenaWorld();
    const b = mik(w);
    stepUntil(w, () => b.state === 'vanish');
    let f = 0;
    const lit: number[] = [];
    while (b.state !== 'appear') {
      if (!w.dark) lit.push(f);
      w.step({});
      f++;
    }
    expect(lit[0]).toBe(MIKITKO.darkAfterFrames);
    expect(f).toBe(MIKITKO.darkAfterFrames + MIKITKO.litFrames + MIKITKO.flickerFrames);
    expect(f).toBe(208);
  });

  it('with no letter on the arena he swings (letters come only from him); after a swing — the beams', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    for (let k = 0; k < 6; k++) {
      stepUntil(w, () => b.state === 'appear', 3000);
      if (w.lettersOnArena() === 0) expect(b.pattern).not.toBe('a');
      else if (b.lastPattern !== 'a') expect(b.pattern).toBe('a');
      stepUntil(w, () => b.state === 'vanish', 3000);
    }
  });

  it('moves smoothly: speed never jumps by more than 0.4 px/frame while visible', () => {
    for (const pattern of ['a', 'bLong', 'bShort'] as const) {
      const w = arenaWorld();
      w.setGod(true);
      const b = mik(w);
      force(b, pattern);
      stepUntil(w, () => b.state === 'vanish');
      stepUntil(w, () => b.state === 'appear');
      let prev: { x: number; y: number } | null = null;
      let pv = { x: 0, y: 0 };
      while (b.state !== 'vanish') {
        const at = { x: b.x, y: b.y };
        if (prev) {
          const v = { x: at.x - prev.x, y: at.y - prev.y };
          expect(Math.hypot(v.x - pv.x, v.y - pv.y), `${pattern} t ${b.t}`).toBeLessThan(0.4);
          pv = v;
        }
        prev = at;
        w.step({});
      }
    }
  });
});

describe('pattern A — two aimed beams', () => {
  it('beam from the hand at +126 and +280, 3 px/frame, straight at the hero; ends low at (52,186)', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    force(b, 'a');
    stepUntil(w, () => b.state === 'vanish');
    stepUntil(w, () => b.state === 'appear');
    const shots: number[] = [];
    let lowest = 0;
    while (b.state !== 'vanish') {
      const before = w.projectiles.filter((q) => q.kind === 'beam').length;
      place(w, 60);
      w.step({});
      if (b.t > MIKITKO.a.shot2) lowest = Math.max(lowest, bottom(b));
      const beams = w.projectiles.filter((q) => q.kind === 'beam');
      if (beams.length > before) {
        shots.push(b.t);
        const q = beams.at(-1)!;
        expect(Math.hypot(q.vx, q.vy)).toBeCloseTo(3, 5);
        // Летит в героя: продолжение пути проходит через его центр.
        const p = w.players[0]!;
        const tx = p.x + p.w / 2 - (q.x + q.w / 2);
        const ty = p.y + p.h / 2 - (q.y + q.h / 2);
        expect(Math.abs(tx * q.vy - ty * q.vx) / 3).toBeLessThan(4);
      }
    }
    expect(shots).toEqual([MIKITKO.a.shot1, MIKITKO.a.shot2]);
    expect(lowest).toBeCloseTo(oy(186), 0);
  });

  it('a beam misses a hero who walks away from it after the shot', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    force(b, 'a');
    stepUntil(w, () => b.state === 'vanish');
    clearLetters(w);
    w.setGod(false);
    const input = new TestInput();
    const p = w.players[0]!;
    for (const shot of [MIKITKO.a.shot1, MIKITKO.a.shot2]) {
      // Стоит, пока заряжает (луч целится в него), после выстрела уходит от призрака.
      stepUntil(w, () => b.state === 'a' && b.t === shot - 10, 3000);
      place(w, 100);
      stepUntil(w, () => b.t === shot);
      const hearts = p.vitals.hearts;
      const away: Action = centre(b) > 100 ? 'left' : 'right';
      for (let f = 0; f < 60; f++) w.step({ 1: input.hold(away) });
      expect(p.vitals.hearts, `shot at ${shot}`).toBe(hearts);
    }
  });
});

describe('pattern B — swings drop letters by columns', () => {
  it('long swing: a wave down to the floor, letters at x 55 and 20; only one stays on the floor', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    force(b, 'bLong');
    stepUntil(w, () => b.state === 'vanish');
    stepUntil(w, () => b.state === 'appear');
    clearLetters(w);
    const xs: number[] = [];
    let lowest = 0;
    let highest = 999;
    while (b.state !== 'vanish') {
      const n = w.projectiles.filter((q) => q.kind === 'letter').length;
      w.step({});
      if (b.state === 'bLong') {
        lowest = Math.max(lowest, bottom(b));
        highest = Math.min(highest, bottom(b));
      }
      const ls = w.projectiles.filter((q) => q.kind === 'letter');
      if (ls.length > n) xs.push(ls.at(-1)!.x + 8);
    }
    expect(xs).toEqual([55, 20]);
    expect(lowest).toBeGreaterThan(oy(188));
    expect(highest).toBeLessThan(oy(100));
    stepUntil(w, () => w.projectiles.every((q) => q.kind !== 'letter'));
    const onFloor = w.items.filter((i) => i.kind === 'letter' && i.state !== 'gone');
    expect(onFloor).toHaveLength(1);
    expect(onFloor[0]!.x + 8).toBe(55);
  });

  it('while the hero holds a letter, new ones fall through the floor', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    force(b, 'bLong');
    place(w, 128);
    arm(w);
    stepUntil(w, () => b.state === 'vanish');
    stepUntil(w, () => b.state === 'vanish', 3000);
    stepUntil(w, () => w.projectiles.every((q) => q.kind !== 'letter'));
    expect(w.items.filter((i) => i.kind === 'letter' && i.state !== 'gone')).toHaveLength(1);
  });

  it('a falling letter hurts, falls on and lands; a lying one does not hurt', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    force(b, 'bLong');
    stepUntil(w, () => b.state === 'vanish');
    stepUntil(w, () => b.state === 'appear');
    clearLetters(w);
    const p = w.players[0]!;
    stepUntil(w, () => w.projectiles.some((q) => q.kind === 'letter'), 3000);
    w.setGod(false);
    const hearts = p.vitals.hearts;
    place(w, 55);
    stepUntil(w, () => p.vitals.hearts < hearts, 120);
    const it = (() => {
      stepUntil(w, () => w.items.some((i) => i.kind === 'letter' && i.state === 'resting'), 600);
      return w.items.find((i) => i.kind === 'letter')!;
    })();
    stepUntil(w, () => !p.invulnerable, 300);
    const h2 = p.vitals.hearts;
    place(w, it.x - 6);
    for (let f = 0; f < 10; f++) w.step({});
    expect(p.vitals.hearts).toBe(h2);
  });
});

describe('hitting him', () => {
  it('high at G0 a floor throw passes under, a jump-throw hits; low — a floor throw hits', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    force(b, 'a');
    stepUntil(w, () => b.state === 'vanish');
    stepUntil(w, () => b.state === 'a');
    const input = new TestInput();
    // Висит в G0 (до первого луча): с пола — мимо.
    place(w, 120);
    arm(w);
    const first = w.players[0]!.carriedItem!;
    w.step({ 1: input.hold() });
    w.step({ 1: input.hold('action') });
    expect(first.state).toBe('thrown');
    for (let f = 0; f < 30; f++) w.step({ 1: input.hold() });
    expect(b.hp).toBe(7);
    // В прыжке — попадает.
    place(w, 120);
    arm(w);
    w.step({ 1: input.hold() });
    let thrown = false;
    for (let f = 0; f < 40; f++) {
      const p = w.players[0]!;
      const apex = !p.onGround && p.vy >= 0 && !thrown;
      w.step({ 1: input.hold(...((apex ? ['jump', 'action'] : f < 18 ? ['jump'] : []) as Action[])) });
      if (apex) thrown = true;
    }
    expect(b.hp).toBe(6);
    // Внизу, у (52,186): с пола попадает.
    stepUntil(w, () => b.t >= MIKITKO.a.endAt - 30);
    place(w, 120, -1);
    arm(w);
    w.step({ 1: input.hold('action') });
    for (let f = 0; f < 30; f++) w.step({ 1: input.hold() });
    expect(b.hp).toBe(5);
  });

  it('a miss flies off the screen and is lost; a letter passes through him while hidden', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    stepUntil(w, () => b.state === 'lit', 3000);
    place(w, 120);
    for (let f = 0; f < 40; f++) w.step({});
    arm(w);
    const it = w.players[0]!.carriedItem!;
    const input = new TestInput();
    w.step({ 1: input.hold() });
    w.step({ 1: input.hold('action') });
    expect(it.state).toBe('thrown');
    for (let f = 0; f < 60; f++) w.step({});
    expect(it.state).toBe('gone');
    expect(b.hp).toBe(7);
  });

  it('7 hits, 31 frames invulnerable after each; the hero dying restores 7', () => {
    const w = arenaWorld();
    const b = mik(w);
    stepUntil(w, () => b.vulnerable);
    expect(b.hit(w)).toBe(true);
    expect(b.invuln).toBe(31);
    expect(b.hit(w)).toBe(false);
    const p = w.players[0]!;
    p.kill(w);
    stepUntil(w, () => p.state === 'respawn');
    expect(b.hp).toBe(7);
    for (let i = 0; i < MIKITKO.hp; i++) {
      stepUntil(w, () => b.vulnerable, 3000);
      b.hit(w);
    }
    expect(b.defeated).toBe(true);
    for (let f = 0; f < 300 && !b.landed; f++) w.stepCinematic();
    expect(b.landed).toBe(true);
  });

  it('letters falling through him do not hit him', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = mik(w);
    for (let f = 0; f < 60 * 60; f++) {
      if (b.vulnerable && f % 30 === 0)
        w.items.push(Object.assign(new Item('letter', { x: centre(b), y: b.y - 4 }), { vy: 2 }));
      w.step({});
    }
    expect(b.hp).toBe(MIKITKO.hp);
  });
});

describe('corners are safe from his body (as in the original)', () => {
  it('standing at x 24 or x 240 he never touches the hero over many cycles', () => {
    for (const x of [24, 240]) {
      const w = arenaWorld(x);
      const b = mik(w);
      const p = w.players[0]!;
      for (let f = 0; f < 60 * 90; f++) {
        place(w, x);
        w.step({});
        if (b.harmful) {
          const touch =
            p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.h && p.y + p.h > b.y;
          expect(touch, `x ${x}, ${b.state} t ${b.t}`).toBe(false);
        }
      }
    }
  });
});

describe('Mikitko fight is winnable with buttons only', () => {
  /**
   * Бот как человек: уходит из-под падающей буквы и от луча, держится в стороне от низкого
   * призрака, подбирает букву; призрак низко — бросает с пола, высоко — в прыжке.
   */
  function bot(seed: number): { won: boolean; frames: number; hits: number; hp: number } {
    const w = arenaWorld(seed);
    const p = w.players[0]!;
    const b = mik(w);
    const input = new TestInput();
    let prev: Action[] = [];
    let hits = 0;
    let hearts = p.vitals.hearts;
    let jumping = false;
    let frames = 0;
    for (; frames < 60 * 240 && !b.defeated && !w.gameOver; frames++) {
      if (p.vitals.hearts < hearts) hits++;
      hearts = p.vitals.hearts;
      const cx = p.x + p.w / 2;
      const bx = centre(b);
      const away = (from: number): Action =>
        cx < 30 ? 'right' : cx > 226 ? 'left' : cx < from ? 'left' : 'right';
      const toward = (x: number): Action => (x > cx ? 'right' : 'left');
      let keys: Action[] = [];
      const letterFalling = w.projectiles.find(
        (q) => q.kind === 'letter' && Math.abs(q.x + 8 - cx) < 18 && q.y < p.y,
      );
      const beam = w.projectiles.find((q) => {
        if (q.kind !== 'beam') return false;
        const dx = cx - (q.x + 4);
        const dy = p.y + p.h / 2 - (q.y + 4);
        return Math.hypot(dx, dy) < 70 && dx * q.vx + dy * q.vy > 0;
      });
      const bodyNear =
        b.harmful && bottom(b) > p.y - 6 && Math.abs(bx - cx) < b.w / 2 + p.w / 2 + 14;
      const highTarget = b.vulnerable && bottom(b) > p.y - 36 && bottom(b) <= p.y + 2;
      const lowTarget = b.vulnerable && bottom(b) > p.y + 2;
      if (jumping) {
        if (!p.onGround && p.vy >= 0) {
          keys = ['jump', 'action'];
          jumping = false;
        } else keys = ['jump'];
      } else if (!p.controlled) {
        keys = [];
      } else if (letterFalling) {
        keys = [away(letterFalling.x + 8)];
      } else if (beam) {
        keys = [away(beam.x + 4)];
      } else if (bodyNear) {
        keys = [away(bx)];
      } else if (p.carriedItem && lowTarget) {
        const side = cx < bx ? -1 : 1;
        const want = bx + side * 56;
        if (Math.abs(want - cx) > 10) keys = [toward(want)];
        else keys = p.facing === -side ? ['action'] : [toward(bx)];
      } else if (p.carriedItem && highTarget) {
        const side = cx < bx ? -1 : 1;
        const want = bx + side * 50;
        if (Math.abs(want - cx) > 12) keys = [toward(want)];
        else if (p.facing !== -side) keys = [toward(bx)];
        else if (p.onGround) {
          keys = ['jump'];
          jumping = true;
        }
      } else if (!p.carriedItem) {
        const it = w.items
          .filter((i) => i.kind === 'letter' && i.state === 'resting')
          .sort((a, c) => Math.abs(a.x - cx) - Math.abs(c.x - cx))[0];
        if (it) {
          const dx = it.x + it.w / 2 - cx;
          keys = Math.abs(dx) <= 15 ? [toward(it.x + 8), 'action'] : [toward(it.x + 8)];
        } else if (Math.abs(cx - 128) > 6) keys = [toward(128)];
      }
      if (keys.includes('action') && prev.includes('action'))
        keys = keys.filter((k) => k !== 'action');
      if (p.onGround && !jumping && keys.includes('jump') && prev.includes('jump'))
        keys = keys.filter((k) => k !== 'jump');
      prev = keys;
      w.step({ 1: input.hold(...keys) });
    }
    return { won: b.defeated, frames, hits, hp: b.hp };
  }

  for (const seed of [1, 2, 3]) {
    it(`a button-only bot beats him (seed ${seed})`, () => {
      const r = bot(seed);
      expect(r.won, JSON.stringify(r)).toBe(true);
      expect(r.frames).toBeLessThan(60 * 240);
    }, 60_000);
  }
});
