import { describe, expect, it } from 'vitest';
import { MARKOV } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { Markov } from '../src/sim/bosses/Markov';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

const arena = () => parseTiledLevel(LEVELS[8]!.at(-1)!.map);

function arenaWorld(seed = 1): World {
  const w = new World(arena(), [{ id: 1, hero: 'sergey' }], seed);
  w.resume();
  return w;
}

const boss = (w: World): Markov => {
  if (!(w.boss instanceof Markov)) throw new Error('no markov');
  return w.boss;
};

function run(w: World, input: TestInput, frames: number, keys: Action[] = []): void {
  for (let f = 0; f < frames; f++) w.step({ 1: input.hold(...keys) });
}

function stepUntil(w: World, cond: () => boolean, max = 3000): number {
  const idle = new TestInput();
  for (let f = 0; f < max; f++) {
    if (cond()) return f;
    w.step({ 1: idle.hold() });
  }
  throw new Error('condition not reached');
}

/** Дать герою в руки обломок и поставить его ногами в x на пол. */
function arm(w: World, x: number): void {
  const p = w.players[0]!;
  p.x = x - p.w / 2;
  p.y = MARKOV.floorY - p.h;
  p.vx = 0;
  p.vy = 0;
  p.facing = 1;
  const it = new Item('scrap', { x, y: MARKOV.floorY });
  it.state = 'carried';
  it.owner = p;
  w.items.push(it);
  p.carrying = { kind: 'item', item: it };
}

describe('Markov crane arena (level 8)', () => {
  it('one screen, floor across at y = 192, no pits; the hero starts at (24, 192)', () => {
    const l = arena();
    for (let tx = 0; tx < 16; tx++) expect(l.grid.isSolid(tx, 12)).toBe(true);
    expect(l.playerStart).toEqual({ x: 24, y: 192 });
    expect(l.segments[0]!.boss).toBe('markov');
  });

  it('the crane drives, stops, the ball drops in 10 frames, lies 60 and rises 2 px/frame', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = boss(w);
    expect(b.hp).toBe(8);
    stepUntil(w, () => b.state === 'drop');
    const hang = b.ball.y + b.ball.h;
    expect(hang).toBe(MARKOV.ball.hangBottom);
    const n = stepUntil(w, () => b.state === 'lie');
    expect(n).toBe(MARKOV.ball.dropFrames);
    expect(b.ball.y + b.ball.h).toBe(MARKOV.floorY);
    expect(w.projectiles.filter((p) => p.kind === 'scrap')).toHaveLength(2);
    const lie = stepUntil(w, () => b.state === 'rise');
    expect(lie).toBe(MARKOV.ball.lieFrames);
    const y0 = b.ballBottom;
    run(w, new TestInput(), 1);
    expect(y0 - b.ballBottom).toBe(MARKOV.ball.riseSpeed);
  });

  it('one debris piece lands as a pickup, never more than one on the arena', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = boss(w);
    for (let k = 0; k < 4; k++) {
      stepUntil(w, () => b.state === 'lie');
      stepUntil(w, () => b.state === 'rise');
    }
    expect(w.items.filter((i) => i.kind === 'scrap')).toHaveLength(1);
  });

  it('a throw from the floor passes under the cab; a jump-throw from between ball and crane hits', () => {
    const w = arenaWorld();
    w.setGod(true);
    const b = boss(w);
    const input = new TestInput();
    stepUntil(w, () => b.state === 'aim');
    // Кран стоит: пока шар падает и лежит, есть время.
    arm(w, b.craneX - 16);
    run(w, input, 1, ['action']);
    run(w, input, 40);
    expect(b.hp).toBe(8);
    arm(w, b.craneX - 16);
    run(w, input, 1);
    let thrown = false;
    for (let f = 0; f < 40; f++) {
      const p = w.players[0]!;
      const apex = !p.onGround && p.vy >= 0 && !thrown;
      run(w, input, 1, apex ? ['jump', 'action'] : f < 18 ? ['jump'] : []);
      if (apex) thrown = true;
    }
    run(w, input, 30);
    expect(b.hp).toBe(7);
  });

  it('after a hit the cab is invulnerable 30 frames; the hero dying restores 8', () => {
    const w = arenaWorld();
    const b = boss(w);
    b.hit(w);
    expect(b.invuln).toBe(MARKOV.invulnFrames);
    expect(b.hit(w)).toBe(false);
    const p = w.players[0]!;
    p.kill(w);
    stepUntil(w, () => p.state === 'respawn');
    expect(b.hp).toBe(8);
  });

  it('crane tracks and the ball hurt on touch', () => {
    const w = arenaWorld();
    const b = boss(w);
    stepUntil(w, () => b.state === 'drive');
    const p = w.players[0]!;
    const h = p.vitals.hearts;
    p.x = b.tracks.x + 30;
    p.y = MARKOV.floorY - p.h;
    run(w, new TestInput(), 2);
    expect(p.vitals.hearts).toBe(h - 1);
  });

  /**
   * Бот только кнопками: берёт лежащий обломок, встаёт между шаром и краном, когда шар висит,
   * прыгает и бросает в верхней точке. Шар, лежащий на пути, пережидает.
   */
  function bot(seed: number): { won: boolean; frames: number; hits: number } {
    const w = arenaWorld(seed);
    const b = boss(w);
    const p = w.players[0]!;
    const input = new TestInput();
    let hits = 0;
    let lastHearts = p.vitals.hearts;
    let jumpT = -1;
    for (let f = 0; f < 60 * 300; f++) {
      if (b.defeated) return { won: true, frames: f, hits };
      if (p.vitals.hearts < lastHearts) hits++;
      lastHearts = p.vitals.hearts;
      if (p.vitals.lives < 1 || w.gameOver) break;
      for (const e of w.drainEvents()) void e;
      const cx = p.x + p.w / 2;
      const ballLow = b.ballBottom > MARKOV.floorY - 30;
      const ball = b.ball;
      const keys: Action[] = [];
      if (!p.controlled) {
        w.step({ 1: input.hold() });
        continue;
      }
      if (jumpT >= 0) {
        jumpT++;
        if (!p.onGround && p.vy >= 0) {
          keys.push('action');
          jumpT = -1;
        } else keys.push('jump');
        w.step({ 1: input.hold(...keys) });
        continue;
      }
      const go = (tx: number) => {
        const dir = tx > cx ? 1 : -1;
        const next = { x: p.x + dir * 6, y: p.y, w: p.w, h: p.h };
        const blocked = ballLow && next.x < ball.x + ball.w + 4 && next.x + next.w > ball.x - 4;
        if (!blocked && Math.abs(tx - cx) > 2) keys.push(dir > 0 ? 'right' : 'left');
      };
      const spot = b.craneX - 16;
      const ballSafe = b.state === 'drive' || b.state === 'rise';
      const s = w.items.find((i) => i.kind === 'scrap' && i.canBePickedUp);
      if (!p.carrying && s && (ballSafe || cx < ball.x - 4)) {
        const sx = s.x + s.w / 2;
        // Подойти с ближней стороны вплотную (обломок твёрдый).
        const side = cx > sx || sx - 14 < 6 ? sx + 14 : sx - 14;
        if (Math.abs(cx - side) > 2) go(side);
        else {
          const dir = sx > cx ? 'right' : 'left';
          const turned = (dir === 'right') === p.facing > 0;
          keys.push(dir);
          if (turned) keys.push('action');
        }
      } else if (Math.abs(cx - spot) > 3 && (ballSafe || cx > ball.x + ball.w)) {
        go(spot);
      } else if (Math.abs(cx - spot) <= 3 && p.facing < 0) {
        keys.push('right');
      } else if (p.carrying && Math.abs(cx - spot) <= 3 && b.state !== 'drive') {
        // Кран стоит — прыгнуть и бросить в верхней точке (на едущий кран прыгать нельзя: наедет).
        jumpT = 0;
        keys.push('jump');
      } else if (!ballSafe && cx < ball.x && cx > ball.x - 70) {
        // Шар вот-вот ударит рядом: отойти влево от обломков.
        keys.push('left');
      }
      w.step({ 1: input.hold(...keys) });
    }
    return { won: false, frames: 0, hits };
  }

  it('a button-only bot beats Markov', () => {
    for (const seed of [1, 2, 3]) {
      const r = bot(seed);
      expect(r.won, `seed ${seed}: hits ${r.hits}`).toBe(true);
      expect(r.frames).toBeLessThan(60 * 300);
    }
  }, 120_000);
});
