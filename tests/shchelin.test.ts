import { describe, expect, it } from 'vitest';
import { SHCHELIN } from '../src/config/balance';
import { LEVELS } from '../src/data/levels';
import { Shchelin } from '../src/sim/bosses/Shchelin';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

const arena = () => parseTiledLevel(LEVELS[6]!.at(-1)!.map);

function arenaWorld(seed = 1): World {
  const w = new World(arena(), [{ id: 1, hero: 'sergey' }], seed);
  w.resume(); // конец вступительной реплики
  return w;
}

const boss = (w: World): Shchelin => {
  if (!(w.boss instanceof Shchelin)) throw new Error('no Shchelin');
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

describe('Shchelin arena (level 6, the ostrich arena of the original)', () => {
  it('one screen: floor at 192 across, ledges 32 px above it left and right; hero starts on the left ledge', () => {
    const l = arena();
    const g = l.grid;
    for (let tx = 0; tx < 16; tx++) expect(g.isSolid(tx, 12), `floor ${tx}`).toBe(true);
    for (const tx of [0, 1, 2, 3, 12, 13, 14, 15]) expect(g.isOneway(tx, 10)).toBe(true);
    for (let tx = 4; tx < 12; tx++) expect(g.isOneway(tx, 10)).toBe(false);
    expect(l.playerStart).toEqual({ x: 24, y: 160 });
    const w = new World(l, [{ id: 1, hero: 'sergey' }]);
    expect(w.boss).toBeInstanceOf(Shchelin);
    expect(boss(w).hp).toBe(SHCHELIN.hp);
  });
});

describe('Shchelin arena is playable with our jump (user: «не допрыгиваю по бокам, не перепрыгнуть»)', () => {
  it('from the floor the hero jumps up onto both ledges', () => {
    for (const [x, dir] of [
      [80, 'left'],
      [176, 'right'],
    ] as const) {
      const w = arenaWorld();
      w.setGod(true);
      const p = w.players[0]!;
      p.x = x - p.w / 2;
      p.y = 192 - p.h;
      const input = new TestInput();
      for (let f = 0; f < 5; f++) w.step({ 1: input.hold() });
      for (let f = 0; f < 50; f++) w.step({ 1: input.hold(dir, 'jump') });
      for (let f = 0; f < 20; f++) w.step({ 1: input.hold(dir) });
      expect(p.y + p.h, `${dir} ledge`).toBe(160);
    }
  });

  it('the hero can jump over him with a run-up when he rolls along the floor towards the hero', () => {
    // Сколько разных моментов прыжка (по расстоянию до него) спасают от удара: окно для человека.
    let ok = 0;
    const res: string[] = [];
    for (let d = 0; d <= 60; d += 2) {
      const w = arenaWorld();
      const b = boss(w);
      stepUntil(w, () => b.state === 'wait' && b.at === 'floorR');
      const p = w.players[0]!;
      p.x = 100;
      p.y = 192 - p.h;
      (b as unknown as { startMove(to: string, w: World): void }).startMove('floorL', w);
      const input = new TestInput();
      // Разбег навстречу и прыжок, когда до него d px; прыжок зажат до верхней точки.
      let jumpAt = -1;
      let hurt = false;
      for (let f = 0; f < 200 && b.state === 'move'; f++) {
        const gap = b.x - (p.x + p.w);
        if (jumpAt < 0 && gap <= d) jumpAt = f;
        const keys: Action[] = ['right'];
        if (jumpAt >= 0 && f - jumpAt < 20) keys.push('jump');
        w.step({ 1: input.hold(...keys) });
        if (p.vitals.invuln > 0) hurt = true;
      }
      if (!hurt) ok++;
      res.push(`${d}:${hurt ? 'x' : 'ok'}`);
    }
    // Окно — несколько разных моментов прыжка (по 2 px), а не один точный кадр.
    expect(ok, res.join(' ')).toBeGreaterThanOrEqual(4);
  });
});

describe('Shchelin cycle', () => {
  it('intro: rides the floor at 4 px/frame through the screen edges, then stops on the right', () => {
    const w = arenaWorld();
    const b = boss(w);
    expect(b.state).toBe('ride');
    let wrapped = false;
    let last = b.x;
    stepUntil(w, () => {
      if (b.x < last) wrapped = true;
      last = b.x;
      return b.state === 'wait';
    });
    expect(wrapped).toBe(true);
    expect(b.feet).toEqual({ x: 224, y: 192 });
  });

  it('waits, bounces (telegraph ≥ 20 frames), throws 3 gears 31 frames apart; the first lands as an item', () => {
    const w = arenaWorld();
    const b = boss(w);
    stepUntil(w, () => b.state === 'bounce');
    const t0 = w.frame;
    stepUntil(w, () => b.state === 'throw');
    expect(w.frame - t0).toBeGreaterThanOrEqual(20);
    const shots: number[] = [];
    let n = 0;
    stepUntil(w, () => {
      const g = w.projectiles.filter((p) => p.kind === 'gear').length;
      if (g > n) shots.push(w.frame);
      n = Math.max(n, g);
      return b.state === 'move';
    });
    expect(shots.length).toBeGreaterThanOrEqual(1);
    stepUntil(w, () => w.items.some((i) => i.kind === 'gear' && i.state === 'resting'), 400);
    const gear = w.items.find((i) => i.kind === 'gear')!;
    expect(gear.x + gear.w / 2).toBeGreaterThanOrEqual(SHCHELIN.gearLand.min);
    expect(gear.x + gear.w / 2).toBeLessThanOrEqual(SHCHELIN.gearLand.max);
    expect(w.items.filter((i) => i.kind === 'gear')).toHaveLength(1);
  });

  it('never more than one gear to pick up on the arena', () => {
    const w = arenaWorld();
    let max = 0;
    const idle = new TestInput();
    for (let f = 0; f < 60 * 40; f++) {
      w.step({ 1: idle.hold() });
      max = Math.max(max, w.items.filter((i) => i.kind === 'gear').length);
    }
    expect(max).toBe(1);
  });

  it('goes to the other side every time, stopping only at the 4 points', () => {
    const w = arenaWorld(3);
    const b = boss(w);
    const stops: string[] = [];
    const idle = new TestInput();
    let was = b.state;
    for (let f = 0; f < 60 * 60; f++) {
      w.step({ 1: idle.hold() });
      if (b.state === 'wait' && was !== 'wait') stops.push(b.at);
      was = b.state;
    }
    expect(stops.length).toBeGreaterThan(4);
    for (let i = 1; i < stops.length; i++)
      expect(stops[i]!.at(-1), stops.join(' ')).not.toBe(stops[i - 1]!.at(-1));
  });
});

describe('Shchelin is hurt only by a thrown gear', () => {
  it('a thrown gear hits; a falling one or a box does not', () => {
    const w = arenaWorld();
    const b = boss(w);
    stepUntil(w, () => b.state === 'wait');
    const p = w.players[0]!;
    const drop = new Item('gear', { x: b.x + b.w / 2, y: b.y - 4 });
    w.items.push(drop);
    w.step({});
    for (let f = 0; f < 30; f++) w.step({});
    expect(b.hp).toBe(SHCHELIN.hp);
    const thrown = new Item('gear', { x: b.x - 20, y: b.y + 30 });
    w.items.push(thrown);
    thrown.launch(p, 'forward', 1);
    for (let f = 0; f < 20 && b.hp === SHCHELIN.hp; f++) w.step({});
    expect(b.hp).toBe(SHCHELIN.hp - 1);
    expect(b.invuln).toBeGreaterThan(0);
  });

  it('phases by the year on the clock: 1991 → 2007 after 3 hits → 2026 after 6', () => {
    const w = arenaWorld();
    const b = boss(w);
    stepUntil(w, () => b.state === 'wait');
    const years: number[] = [b.year];
    for (let i = 0; i < 6; i++) {
      b.invuln = 0;
      b.hit(w);
      years.push(b.year);
    }
    expect(years).toEqual([1991, 1991, 1991, 2007, 2007, 2007, 2026]);
  });

  it('1991: gears fly back towards him; 2007 slower, 2026 faster', () => {
    const speeds: number[] = [];
    for (const hits of [0, 3, 6]) {
      const w = arenaWorld();
      const b = boss(w);
      stepUntil(w, () => b.state === 'wait');
      for (let i = 0; i < hits; i++) {
        b.invuln = 0;
        b.hit(w);
      }
      stepUntil(w, () => w.projectiles.some((p) => p.kind === 'gear' && !p.landsAsItem), 800);
      const g = w.projectiles.find((p) => p.kind === 'gear' && !p.landsAsItem)!;
      speeds.push(Math.abs(g.vx));
      if (hits === 0) expect(Math.sign(g.ax)).toBe(-Math.sign(g.vx));
      else expect(g.ax).toBe(0);
    }
    expect(speeds[1]!).toBeLessThan(speeds[0]!);
    expect(speeds[2]!).toBeGreaterThan(speeds[0]!);
  });

  it('as in the original: the hero dies — his health is back to full', () => {
    const w = arenaWorld();
    const b = boss(w);
    stepUntil(w, () => b.state === 'wait');
    b.hit(w);
    expect(b.hp).toBe(SHCHELIN.hp - 1);
    w.players[0]!.kill(w);
    stepUntil(w, () => w.players[0]!.state !== 'dead');
    expect(b.hp).toBe(SHCHELIN.hp);
  });
});

describe('Shchelin fight is winnable with buttons only', () => {
  // Бот по совету из прохождения оригинала: пережидает вступление на уступе, потом ждёт у самого
  // края напротив босса; пока тот стоит, берёт лежащую шестерёнку и бросает: босс на полу —
  // вперёд с 70 px, на уступе — вверх из-под него (сквозь уступ). Пока летят шестерёнки или
  // босс едет — снова к краю.
  for (const seed of [1, 2, 3]) {
    it(`bot beats him (seed ${seed})`, () => {
      const w = arenaWorld(seed);
      const p = w.players[0]!;
      const b = boss(w);
      const input = new TestInput();
      let prev: Action[] = [];
      let frames = 0;
      const log: string[] = [];
      const orig = w.damagePlayer.bind(w);
      w.damagePlayer = (pl, fromX) => {
        const r = orig(pl, fromX);
        if (r)
          log.push(
            `f${frames} st=${b.state} at=${b.at} b=(${(b.x + 12).toFixed(0)},${(b.y + 48).toFixed(0)}) p=(${(pl.x + 6).toFixed(0)},${(pl.y + 20).toFixed(0)}) from=${fromX.toFixed(0)} carry=${!!pl.carriedItem} gears=${w.projectiles
              .filter((q) => q.kind === 'gear')
              .map((q) => `${q.x.toFixed(0)},${q.y.toFixed(0)}`)
              .join(';')}`,
          );
        return r;
      };
      for (; frames < 60 * 240 && !b.defeated && !w.gameOver; frames++) {
        const cx = p.x + p.w / 2;
        const bx = b.x + b.w / 2;
        const go = (dx: number): Action => (dx > 0 ? 'right' : 'left');
        const walkTo = (x: number): Action[] => (Math.abs(x - cx) > 4 ? [go(x - cx)] : []);
        let keys: Action[] = [];
        const onLedge = b.at.startsWith('ledge');
        const low = b.y + b.h > 176;
        /** Путь от героя до x проходит сквозь стоящего на полу босса. */
        const blocked = (x: number) =>
          low && Math.min(cx, x) - 14 < bx && bx < Math.max(cx, x) + 14;
        // Совет из прохождения: ждать у самого края экрана; к краю — не сквозь босса.
        const edges = [6, 250].filter((e) => !blocked(e));
        const edge = edges.sort((e1, e2) => Math.abs(e1 - cx) - Math.abs(e2 - cx))[0] ?? cx;
        const calm = b.state === 'wait' || b.state === 'bounce';
        const flying = w.projectiles.some((q) => q.kind === 'gear');
        if (!p.onGround && p.vy < 0 && prev.includes('jump')) keys = ['jump'];
        else if (b.state === 'ride') keys = [];
        else if (b.state === 'move') {
          // Пока едет — не перебегать: стоять у края, на середине — к ближнему свободному краю.
          if (Math.abs(cx - 128) < 100) keys = walkTo(edge);
        } else if (p.carriedItem) {
          const dx = bx - cx;
          const near = Math.abs(dx) >= 16 && Math.abs(dx) <= 100;
          if (!calm || flying) keys = walkTo(edge);
          else if (onLedge) keys = Math.abs(dx) < 6 && p.onGround ? ['up', 'action'] : walkTo(bx);
          else if (near) keys = p.facing === Math.sign(dx) ? ['action'] : [go(dx)];
          else keys = blocked(bx) ? walkTo(edge) : walkTo(bx - 70 * Math.sign(bx - 128));
        } else if (p.controlled && p.y + p.h < 170) {
          // С уступа — спрыгнуть на пол, к краю.
          keys = [go(cx < 128 ? 1 : -1)];
        } else if (p.controlled) {
          const it = w.items.find((i) => i.kind === 'gear' && i.state === 'resting');
          const ix = it ? it.x + it.w / 2 : 0;
          if (it && calm && !flying && Math.abs(ix - bx) > 56 && !blocked(ix)) {
            const dx = ix - cx;
            keys = Math.abs(dx) <= 16 ? [go(dx), 'action'] : [go(dx)];
          } else keys = walkTo(edge);
        }
        if (keys.includes('action') && prev.includes('action'))
          keys = keys.filter((k) => k !== 'action');
        if (p.onGround && keys.includes('jump') && prev.includes('jump'))
          keys = keys.filter((k) => k !== 'jump');
        prev = keys;
        w.step({ 1: input.hold(...keys) });
      }
      if (!b.defeated)
        throw new Error(
          `not beaten: hp ${b.hp}, frames ${frames}, lives ${p.vitals.lives}, gameOver ${w.gameOver}\n${log.join('\n')}`,
        );
      console.log(
        `seed ${seed}: ${(frames / 60).toFixed(0)} s, lives ${p.vitals.lives}, hearts ${p.vitals.hearts}, hits taken ${log.length}`,
      );
      expect(frames).toBeLessThan(60 * 240);
    });
  }
});
