import { describe, expect, it } from 'vitest';
import { MACHINE } from '../src/config/balance';
import { LAIR } from '../src/config/mechanisms';
import { LEVELS } from '../src/data/levels';
import { Machine } from '../src/sim/bosses/Machine';
import { overlaps } from '../src/sim/geom';
import { Item } from '../src/sim/Item';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';
import { deepClone } from './planner';

const arena = () => parseTiledLevel(LEVELS[9]!.find((p) => p.artTileset === 'level9_arena')!.map);

function arenaWorld(seed = 1): World {
  const w = new World(arena(), [{ id: 1, hero: 'sergey' }], seed);
  w.drainEvents();
  w.resume();
  return w;
}

const boss = (w: World): Machine => {
  if (!(w.boss instanceof Machine)) throw new Error('no machine');
  return w.boss;
};

function stepUntil(w: World, cond: () => boolean, max = 4000): number {
  const idle = new TestInput();
  for (let f = 0; f < max; f++) {
    if (cond()) return f;
    w.step({ 1: idle.hold() });
  }
  throw new Error('condition not reached');
}

const FLOOR = MACHINE.floorY;

describe('Machine of the End of History: the original cycle', () => {
  it('lights go out, the robot hops, flies off, a DANGER sign shows and the orb falls', () => {
    const w = arenaWorld();
    const b = boss(w);
    w.setGod(true);
    expect(w.dark).toBe(false);
    stepUntil(w, () => b.state === 'hop');
    expect(w.dark).toBe(true);
    stepUntil(w, () => b.state === 'takeoff');
    const from = b.cx;
    stepUntil(w, () => b.state === 'air');
    expect(b.harmful).toBe(false);
    stepUntil(w, () => b.danger);
    expect(MACHINE.landings.map((x) => x)).toContain(b.landX);
    stepUntil(w, () => w.items.some((i) => i.kind === 'orb' && i.state === 'resting'));
    const orb = w.items.find((i) => i.kind === 'orb')!;
    // Шар — в точке взлёта, но не под ногами садящегося робота.
    const ox = orb.x + orb.w / 2;
    if (Math.abs(from - b.landX) >= MACHINE.body.w) expect(ox).toBeCloseTo(from, 0);
    else expect(Math.abs(ox - b.landX)).toBeGreaterThanOrEqual(MACHINE.body.w);
    stepUntil(w, () => b.state === 'ground');
    expect(b.bottom).toBe(FLOOR);
  });

  it('the orb lies 260 frames, blinks 38, then disappears', () => {
    const w = arenaWorld();
    w.dropOrb(40, 150);
    const orb = w.items.at(-1)!;
    stepUntil(w, () => orb.state === 'resting');
    const lay = stepUntil(w, () => orb.state === 'gone', 1000);
    expect(lay).toBeGreaterThanOrEqual(LAIR.orb.lieFrames + LAIR.orb.blinkFrames - 2);
  });

  it('only the thrown orb hurts the body; phases change every 4 hits (a part falls off)', () => {
    const w = arenaWorld();
    const b = boss(w);
    w.setGod(true);
    stepUntil(w, () => b.state === 'stand');
    const phases: number[] = [];
    for (let i = 0; i < 8; i++) {
      b.invuln = 0;
      const p = w.players[0]!;
      const orb = new Item('orb', { x: b.x - 30, y: FLOOR - 4 });
      orb.state = 'thrown';
      orb.launch(p, 'forward', 1);
      orb.x = b.x - 2;
      orb.y = FLOOR - 24;
      w.items.push(orb);
      w.step({ 1: new TestInput().hold() });
      for (const e of w.drainEvents()) if (e.type === 'bossPhase') phases.push(b.hp);
    }
    expect(b.hp).toBe(MACHINE.hp - 8);
    expect(phases).toEqual([8, 4]);
    expect(b.phase).toBe(2);
    // Погиб — здоровье к началу фазы.
    b.hp = 2;
    b.restore();
    expect(b.hp).toBe(4);
  });

  it('attacks come only from the phase list at the far landing point', () => {
    for (const phase of [0, 1, 2]) {
      const w = arenaWorld(phase + 3);
      const b = boss(w);
      w.setGod(true);
      b.hp = MACHINE.hp - phase * MACHINE.hpPerPhase;
      const seen = new Set<string>();
      for (let f = 0; f < 60 * 120; f++) {
        w.step({ 1: new TestInput().hold() });
        if (b.attack) seen.add(b.attack);
      }
      expect(seen.size).toBeGreaterThanOrEqual(2);
      for (const a of seen) expect(MACHINE.phaseAttacks[phase] as readonly string[]).toContain(a);
    }
  });
});

describe('Machine: every attack can be dodged with buttons, even from the left corner', () => {
  it('for each attack some plan (wait, step, jumps) avoids all hits', () => {
    const w = arenaWorld(1);
    const b = boss(w);
    w.setGod(true);
    const idle = new TestInput();
    while (!(b.state === 'ground' && b.cx === MACHINE.attackSpot)) w.step({ 1: idle.hold() });
    w.setGod(false);
    w.projectiles = [];
    w.items = [];
    const phaseOf = (a: string) =>
      MACHINE.phaseAttacks.findIndex((s) => (s as readonly string[]).includes(a));
    const all = [...new Set(MACHINE.phaseAttacks.flat())];
    for (const a of all) {
      let ok = false;
      search: for (const wait of [0, 12, 24, 36])
        for (const dir of ['none', 'right', 'left'] as const)
          for (const hold of [8, 24, 60])
            for (const jumpAt of [-1, 0, 20, 40, 60, 80, 100])
              for (const every of [0, 34]) {
                const s = deepClone(w);
                const sb = s.boss as Machine;
                const p = s.players[0]!;
                p.x = 16 - p.w / 2;
                p.y = FLOOR - p.h;
                sb.hp = MACHINE.hp - phaseOf(a) * MACHINE.hpPerPhase;
                const raw = sb as unknown as Record<string, unknown>;
                raw.attack = a;
                raw.attackT = 0;
                raw.telegraph = MACHINE.telegraphFrames;
                raw.aimAt = s.target(sb);
                raw.attacks = 1;
                sb.timer = 999;
                const inp = new TestInput();
                const h0 = p.vitals.hearts;
                let hurt = false;
                for (let f = 0; f < 220 && !hurt && sb.state === 'ground'; f++) {
                  const keys: Action[] = [];
                  if (f >= wait && f < wait + hold && dir !== 'none') keys.push(dir);
                  const jumping =
                    jumpAt >= 0 &&
                    f >= jumpAt &&
                    (every === 0 ? f < jumpAt + 16 : (f - jumpAt) % every < 10);
                  if (jumping) keys.push('jump');
                  s.step({ 1: inp.hold(...keys) });
                  hurt = p.vitals.hearts < h0;
                }
                if (!hurt) {
                  ok = true;
                  break search;
                }
              }
      expect(ok, a).toBe(true);
    }
  }, 300_000);
});

/**
 * Бот только кнопками: ждёт у левой стены, уходит от знака DANGER, подбирает шар, бросает
 * в корпус с пола; перепрыгивает низкие снаряды, убегает от кулака.
 */
function bot(w: World, b: Machine): Action[] {
  const p = w.players[0]!;
  const pcx = p.x + p.w / 2;
  const keys: Action[] = [];
  const go = (x: number): void => {
    if (x < pcx - 3) keys.push('left');
    else if (x > pcx + 3) keys.push('right');
  };
  const orb = w.items.find((i) => i.kind === 'orb' && i.state === 'resting');
  const carrying = p.carriedItem?.kind === 'orb';
  const landing = b.state === 'air' || b.state === 'land';
  const safeX = (avoid: number) => (avoid > 128 ? 56 : 220);

  if (b.fist) go(b.fistRect!.x + 8 > pcx ? pcx - 40 : pcx + 40);
  else if (landing && b.state === 'land' && Math.abs(b.landX - pcx) < 60) go(safeX(b.landX));
  else if (carrying) {
    if (b.harmful) {
      const spot = b.cx < 140 ? b.x + b.w + 50 : b.x - 50;
      go(spot);
      const face = b.cx > pcx ? 'right' : 'left';
      if (Math.abs(spot - pcx) < 40 && b.vulnerable && w.frame % 2 === 0) {
        if (!keys.includes(face)) keys.push(face);
        keys.push('action');
      }
    } else if (b.state === 'air' && b.danger) go(safeX(b.landX));
  } else if (orb && !(b.harmful && Math.abs(orb.x - b.cx) < 40)) {
    const ox = orb.x + orb.w / 2;
    if (Math.abs(ox - pcx) > 14) go(ox);
    else {
      keys.push(ox > pcx ? 'right' : 'left');
      if (w.frame % 2 === 0) keys.push('action');
    }
  } else if (b.danger) go(safeX(b.landX));
  else if (b.harmful) go(b.cx < 140 ? 220 : 56);

  return dodge(w, b, keys);
}

/** Через сколько кадров героя что-то заденет, если он будет двигаться так (null — не заденет). */
function danger(w: World, b: Machine, dir: -1 | 0 | 1, jump: boolean, horizon = 48): number | null {
  const p = w.players[0]!;
  let x = p.x;
  let y = p.y;
  let vy = jump ? -4.5 : p.onGround ? 0 : p.vy;
  const pr = w.projectiles.map((q) => ({
    x: q.x,
    y: q.y,
    w: q.w,
    h: q.h,
    vx: q.vx,
    vy: q.vy,
    g: q.gravity,
  }));
  const fist = b.fistRect;
  for (let t = 1; t <= horizon; t++) {
    x = Math.max(b.arena.x + 2, Math.min(b.arena.x + b.arena.w - p.w - 2, x + dir * 2));
    vy = Math.min(vy + 0.25, 4);
    y = Math.min(FLOOR - p.h, y + vy);
    const me = { x, y, w: p.w, h: p.h };
    for (const q of pr) {
      q.vy += q.g;
      q.x += q.vx;
      q.y += q.vy;
      if (q.y + q.h < FLOOR + 4 && overlaps(me, q)) return t;
    }
    if (fist && overlaps(me, { x: fist.x - 12, y: fist.y - 8, w: fist.w + 24, h: fist.h + 16 }))
      return t;
    if (b.harmful && overlaps(me, b)) return t;
  }
  return null;
}

/** Выбрать ход, при котором ничего не заденет; желаемый — первым. */
function dodge(w: World, b: Machine, want: Action[]): Action[] {
  const p = w.players[0]!;
  const wantDir: -1 | 0 | 1 = want.includes('left') ? -1 : want.includes('right') ? 1 : 0;
  const extra = want.filter((k) => k === 'action');
  const options: { dir: -1 | 0 | 1; jump: boolean }[] = [
    { dir: wantDir, jump: false },
    { dir: 0, jump: false },
    { dir: -1, jump: false },
    { dir: 1, jump: false },
    { dir: wantDir, jump: true },
    { dir: -1, jump: true },
    { dir: 1, jump: true },
    { dir: 0, jump: true },
  ];
  const keysOf = (o: { dir: -1 | 0 | 1; jump: boolean }): Action[] => [
    ...(o.dir < 0 ? (['left'] as const) : o.dir > 0 ? (['right'] as const) : []),
    ...(o.jump ? (['jump'] as const) : []),
  ];
  // В воздухе: держим прыжок, пока поднимаемся.
  if (!p.onGround)
    return [...keysOf({ dir: wantDir, jump: false }), ...(p.vy < 0 ? (['jump'] as const) : [])];
  let best = options[0]!;
  let bestT = -1;
  for (const o of options) {
    if (o.jump && !p.onGround) continue;
    const t = danger(w, b, o.dir, o.jump);
    // Угроза позже чем через 20 кадров — успеем передумать на следующем кадре.
    if (t === null || t > 20) return [...keysOf(o), ...(o === options[0] ? extra : [])];
    if (t > bestT) {
      bestT = t;
      best = o;
    }
  }
  return keysOf(best);
}

describe('Machine: a button-only bot wins', () => {
  for (const seed of [1, 2, 3])
    it(`seed ${seed}`, () => {
      const w = arenaWorld(seed);
      const b = boss(w);
      const input = new TestInput();
      let frames = 0;
      let hits = 0;
      let hearts = w.players[0]!.vitals.hearts;
      while (!b.defeated && !w.gameOver && frames < 60 * 60 * 8) {
        w.step({ 1: input.hold(...bot(w, b)) });
        w.drainEvents();
        const h = w.players[0]!.vitals.hearts;
        if (h < hearts) hits += hearts - h;
        hearts = h;
        frames++;
      }
      console.log(
        `machine seed ${seed}: ${b.defeated ? 'won' : 'lost'} in ${(frames / 60).toFixed(0)} s, ` +
          `hit ${hits}, lives ${w.players[0]!.vitals.lives}, hp ${b.hp}`,
      );
      expect(b.defeated).toBe(true);
    }, 300_000);
});
