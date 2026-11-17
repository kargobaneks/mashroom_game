import { describe, expect, it } from 'vitest';
import { DUO } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { Duo } from '../src/sim/bosses/Duo';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';
import { deepClone } from './planner';

const arena = () => parseTiledLevel(LEVELS[7]!.at(-1)!.map);

function arenaWorld(seed = 1): World {
  const w = new World(arena(), [{ id: 1, hero: 'sergey' }], seed);
  w.resume();
  return w;
}

const duo = (w: World): Duo => {
  if (!(w.boss instanceof Duo)) throw new Error('no duo');
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

describe('Sobolev & Luka arena (level 7)', () => {
  it('floor across, two ledges each side 32 px apart, the card table in the middle; hero starts on the floor', () => {
    const l = arena();
    const g = l.grid;
    for (let tx = 0; tx < 16; tx++) expect(g.isSolid(tx, 13)).toBe(true);
    for (const r of [9, 11]) for (const tx of [0, 3, 12, 15]) expect(g.isOneway(tx, r)).toBe(true);
    for (const tx of [6, 9]) expect(g.isOneway(tx, 11)).toBe(true);
    expect(l.playerStart.y).toBe(208);
  });

  it('the hero jumps with buttons onto the lower ledges, the table and from there the upper ledges', () => {
    const climb = (x: number, dir: 'left' | 'right', feet: number, to: number) => {
      const w = arenaWorld();
      w.setGod(true);
      const p = w.players[0]!;
      p.x = x - p.w / 2;
      p.y = feet - p.h;
      const input = new TestInput();
      for (let f = 0; f < 5; f++) w.step({ 1: input.hold() });
      for (let f = 0; f < 22; f++) w.step({ 1: input.hold(dir, 'jump') });
      for (let f = 0; f < 8; f++) w.step({ 1: input.hold(dir) });
      for (let f = 0; f < 30; f++) w.step({ 1: input.hold() });
      return p.y + p.h === to
        ? 'ok'
        : `${x},${feet}->${(p.y + p.h).toFixed(0)}@${(p.x + p.w / 2).toFixed(0)}`;
    };
    const res = [
      climb(80, 'left', 208, 176),
      climb(176, 'right', 208, 176),
      climb(80, 'right', 208, 176), // на стол
      climb(56, 'left', 176, 144),
      climb(200, 'right', 176, 144),
    ];
    expect(res).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
  });
});

describe('Sobolev & Luka take turns (TZ) with the cat measurements (original)', () => {
  it('Sobolev starts on the upper right ledge, Luka sits at the table; they swap every 8 s', () => {
    const w = arenaWorld();
    const b = duo(w);
    expect(b.active.who).toBe('sobolev');
    expect(b.seated.who).toBe('luka');
    expect(b.at).toBe('upperR');
    stepUntil(w, () => b.state === 'swap', DUO.swapFrames + 400);
    stepUntil(w, () => b.state !== 'swap');
    expect(b.active.who).toBe('luka');
    expect(b.seated.y + b.h).toBe(w.camera.segment.y + DUO.seat.y);
  });

  it('the seated one is invulnerable: a thrown card only hits the one who walks', () => {
    const w = arenaWorld();
    const b = duo(w);
    stepUntil(w, () => b.state === 'wait');
    const p = w.players[0]!;
    const s = b.seated;
    const card = new Item('card', { x: s.x - 20, y: s.y + 30 });
    w.items.push(card);
    card.launch(p, 'forward', 1);
    for (let f = 0; f < 20; f++) w.step({});
    expect(b.hp).toBe(8);
    const a = b.active;
    const hit = new Item('card', { x: a.x - 20, y: a.y + 30 });
    w.items.push(hit);
    hit.launch(p, 'forward', 1);
    for (let f = 0; f < 20 && b.hp === 8; f++) w.step({});
    expect(b.hp).toBe(7);
    expect(b.invuln).toBeGreaterThan(0);
  });

  it('volleys of 2 cards ~30 frames apart, ~4 px/frame towards the middle, telegraph ≥ 20 frames', () => {
    const w = arenaWorld();
    const b = duo(w);
    stepUntil(w, () => b.state === 'aim');
    const t0 = w.frame;
    stepUntil(w, () => w.projectiles.some((q) => q.kind === 'card'));
    expect(w.frame - t0).toBeGreaterThanOrEqual(20);
    const c1 = w.projectiles.find((q) => q.kind === 'card')!;
    expect(Math.abs(c1.vx)).toBe(4);
    const t1 = w.frame;
    stepUntil(
      w,
      () => w.projectiles.filter((q) => q.kind === 'card').length >= 2 || b.state === 'wait',
    );
    expect(w.frame - t1).toBeGreaterThanOrEqual(29);
  });

  it('a card thrown from the floor lands and can be picked up after 1 s (TZ); only one on the arena', () => {
    const w = arenaWorld(2);
    let max = 0;
    let lockSeen = false;
    const idle = new TestInput();
    for (let f = 0; f < 60 * 60; f++) {
      w.step({ 1: idle.hold() });
      const cards = w.items.filter((i) => i.kind === 'card');
      max = Math.max(max, cards.length);
      if (cards.some((c) => c.lock > 0 && !c.canBePickedUp)) lockSeen = true;
    }
    expect(max).toBe(1);
    expect(lockSeen).toBe(true);
  });

  it('4 + 4: when one is out he sits down, the other walks alone; 8 hits total; death restores both', () => {
    const w = arenaWorld();
    const b = duo(w);
    stepUntil(w, () => b.state === 'wait');
    for (let i = 0; i < 4; i++) {
      b.invuln = 0;
      if (b.state === 'swap') stepUntil(w, () => b.state !== 'swap');
      b.hit(w);
    }
    expect(b.members[0].hp).toBe(0);
    stepUntil(w, () => b.state !== 'swap');
    expect(b.active.who).toBe('luka');
    w.players[0]!.kill(w);
    stepUntil(w, () => w.players[0]!.state !== 'dead');
    expect(b.hp).toBe(8);
  });
});

describe('Sobolev & Luka fight is winnable with buttons only', () => {
  // Бот: держится подальше от того, кто ходит (на уступе над полом, если тот на полу); берёт карту,
  // когда можно; тот, кто ходит, на полу — бросает вперёд с 40–100 px, на уступе — вверх из-под
  // него. Летит карта на уровне героя — прыгает.
  for (const seed of [1, 2, 3]) {
    it(`bot beats them (seed ${seed})`, () => {
      const w = arenaWorld(seed);
      const p = w.players[0]!;
      const b = duo(w);
      const input = new TestInput();
      let prev: Action[] = [];
      let frames = 0;
      let hits = 0;
      const dmg: string[] = [];
      let wasInvuln = false;
      for (; frames < 60 * 300 && !b.defeated && !w.gameOver; frames++) {
        const cx = p.x + p.w / 2;
        const feet = p.y + p.h;
        const a = b.active;
        const bx = a.x + b.w / 2;
        const bFeet = a.y + b.h;
        const go = (dx: number): Action => (dx > 0 ? 'right' : 'left');
        const walkTo = (x: number): Action[] => (Math.abs(x - cx) > 4 ? [go(x - cx)] : []);
        let keys: Action[] = [];
        const cardNear = w.projectiles.some(
          (q) =>
            q.kind === 'card' &&
            Math.abs(q.x + q.w / 2 - cx) < 56 &&
            Math.sign(cx - (q.x + q.w / 2)) === Math.sign(q.vx) &&
            q.y + q.h > p.y - 4 &&
            q.y < feet,
        );
        // Он идёт (или прыгает) к полу у моего края — забраться на нижний уступ над ним.
        const myFloor = cx < 128 ? 'floorL' : 'floorR';
        const cornered =
          feet === 208 &&
          (b.state === 'move' || b.state === 'swap') &&
          b.at === myFloor &&
          Math.abs(cx - (cx < 128 ? 48 : 208)) < 60;
        const bossNear = Math.abs(bx - cx) < 40 && bFeet > p.y && a.y < feet;
        const calm = b.state === 'wait' || b.state === 'aim' || b.state === 'throw';
        if (!p.onGround && p.vy < 0 && prev.includes('jump')) keys = ['jump'];
        else if (cardNear && p.onGround) keys = ['jump'];
        else if (cornered) {
          // Под уступом — прыжок к стене (на уступ), иначе — бегом под уступ.
          // К стене, в пятачок, куда он не достаёт.
          keys = walkTo(cx < 128 ? 6 : 250);
        } else if (bossNear && p.onGround) keys = ['jump', go(cx < 128 ? 1 : -1)];
        else if (p.carriedItem) {
          const dx = bx - cx;
          const same = Math.abs(bFeet - feet) < 2;
          if (!calm) keys = feet < 208 ? [] : walkTo(cx < 128 ? 112 : 144);
          else if (bFeet < feet - 8)
            keys = Math.abs(dx) < 6 && p.onGround ? ['up', 'action'] : walkTo(bx);
          else if (same && Math.abs(dx) >= 30 && Math.abs(dx) <= 110)
            keys = p.facing === Math.sign(dx) ? ['action'] : [go(dx)];
          else if (same) keys = walkTo(bx - 70 * Math.sign(bx - 128));
          else if (feet < bFeet) keys = ['down', 'jump'];
          else keys = walkTo(bx - 70 * Math.sign(bx - 128));
        } else if (p.controlled) {
          const it = w.items.find((i) => i.kind === 'card' && i.state === 'resting');
          if (it && feet === 208) {
            const ix = it.x + it.w / 2;
            const dx = ix - cx;
            keys = Math.abs(dx) <= 16 && it.canBePickedUp ? [go(dx), 'action'] : walkTo(ix);
          } else if (it && feet < 208) keys = ['down', 'jump'];
          else keys = walkTo(bx < 128 ? 200 : 56);
        }
        if (keys.includes('action') && prev.includes('action'))
          keys = keys.filter((k) => k !== 'action');
        if (p.onGround && keys.includes('jump') && prev.includes('jump'))
          keys = keys.filter((k) => k !== 'jump');
        // Как человек, который видит опасность: если задуманное ведёт под удар в ближайшие
        // полсекунды — выбрать другое (прыжок, шаг в сторону, стоять).
        if (p.controlled && p.vitals.invuln === 0 && frames % 3 === 0) {
          const hurtIn = (k: Action[]) => {
            const sim = deepClone(w);
            const inp = deepClone(input);
            const q = sim.players[0]!;
            for (let i = 0; i < 30; i++) {
              inp.hold(...(i < 20 ? k : k.filter((a) => a !== 'jump' && a !== 'action')));
              sim.step({ 1: inp });
              if (q.vitals.invuln > 0 || q.state === 'dead') return true;
            }
            return false;
          };
          if (hurtIn(keys)) {
            const alts: Action[][] = [
              ['jump'],
              ['jump', 'left'],
              ['jump', 'right'],
              ['left'],
              ['right'],
              [],
            ];
            keys =
              alts.find((k) => !(k.includes('jump') && prev.includes('jump')) && !hurtIn(k)) ??
              keys;
          }
        }
        prev = keys;
        w.step({ 1: input.hold(...keys) });
        const inv = p.vitals.invuln > 0 || p.state === 'dead';
        if (inv && !wasInvuln && p.state !== 'respawn') {
          hits++;
          dmg.push(
            `f${frames} ${b.state} ${b.active.who}@${bx.toFixed(0)},${bFeet.toFixed(0)} p=${cx.toFixed(0)},${feet.toFixed(0)}`,
          );
        }
        wasInvuln = inv;
      }
      if (!b.defeated)
        throw new Error(
          `not beaten: hp ${b.hp}, frames ${frames}, lives ${p.vitals.lives}, hits ${hits}, gameOver ${w.gameOver}\n${dmg.join('\n')}`,
        );
      console.log(`seed ${seed}: ${(frames / 60).toFixed(0)} s, hits taken ${hits}`);
    });
  }
});
