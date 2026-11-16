import { describe, expect, it } from 'vitest';
import { BORDACHEV as C, BOSS_RULES } from '../src/config/balance';
import { RISING_ARENA } from '../src/config/camera';
import { PLAYER_PHYSICS as P } from '../src/config/physics';
import { LEVELS } from '../src/data/levels';
import { Bordachev } from '../src/sim/bosses/Bordachev';
import { overlaps } from '../src/sim/geom';
import { parseTiledLevel, type TiledMap } from '../src/sim/level';
import type { Player } from '../src/sim/Player';
import { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

const map = (): TiledMap => LEVELS[3]!.at(-1)!.map;

function arenaWorld(players: 1 | 2 = 1, seed = 1): World {
  const setup =
    players === 2
      ? [
          { id: 1 as const, hero: 'sergey' as const },
          { id: 2 as const, hero: 'ivan' as const },
        ]
      : [{ id: 1 as const, hero: 'sergey' as const }];
  return new World(parseTiledLevel(map()), setup, seed);
}

function boss(w: World): Bordachev {
  const b = w.boss;
  if (!(b instanceof Bordachev)) throw new Error('no Bordachev');
  return b;
}

/** Верхние края всех опор шахты (платформы и плафоны): левый край, уровень, ширина. */
function ledges(w: World): { x: number; y: number; w: number }[] {
  const out: { x: number; y: number; w: number }[] = [];
  const g = w.grid;
  for (let ty = 0; ty < g.rows; ty++)
    for (let tx = 0; tx < g.cols; tx++) {
      if (!g.isOneway(tx, ty) || g.isOneway(tx - 1, ty)) continue;
      let n = 0;
      while (g.isOneway(tx + n, ty)) n++;
      out.push({ x: tx * 16, y: ty * 16, w: n * 16 });
    }
  return out;
}

/** Только стальные платформы (без плафонов). */
const platforms = (w: World) => ledges(w).filter((l) => l.w >= C.minLedgeWidth);

const feetOf = (p: Player) => p.y + p.h;
const centerOf = (r: { x: number; w: number }) => r.x + r.w / 2;

describe('Bordachev arena: a ship shaft where everything rises (level 3 of the original)', () => {
  it('starts with the boss intro; three columns of steel ledges like the original', () => {
    const w = arenaWorld();
    expect(w.frozen).toBe(true);
    expect(w.drainEvents()).toContainEqual({ type: 'bossIntro', boss: 'bordachev' });
    const xs = [...new Set(platforms(w).map((l) => l.x))].sort((a, b) => a - b);
    expect(xs).toEqual([0, 96, 192]);
  });

  it('middle → side ledge above is a jump (≤ 32 px); side → middle above is too high', () => {
    const w = arenaWorld();
    const L = platforms(w);
    const jump = P.jumpVelocity ** 2 / (2 * P.gravity);
    const mids = L.filter((l) => l.x === 96);
    for (const m of mids) {
      const sideAbove = L.filter((l) => l.x !== 96 && l.y < m.y).sort((a, b) => b.y - a.y)[0];
      if (!sideAbove) continue;
      expect(m.y - sideAbove.y).toBeLessThanOrEqual(32);
      expect(jump).toBeGreaterThan(m.y - sideAbove.y + 4);
    }
    const sides = L.filter((l) => l.x === 0);
    for (const s of sides) {
      const midAbove = mids.filter((m) => m.y < s.y).sort((a, b) => b.y - a.y)[0];
      if (midAbove) expect(s.y - midAbove.y).toBeGreaterThan(jump);
    }
  });

  it('lamps are steps: from the bottom of the shaft you can climb to the top (≤ 32 px up each)', () => {
    const w = arenaWorld();
    const L = ledges(w);
    expect(L.filter((l) => l.w < C.minLedgeWidth).length).toBeGreaterThan(0);
    // Подъём: на опору не выше 32 px и не дальше 48 px по горизонтали.
    const start = L.filter((l) => l.x === 96).sort((a, b) => b.y - a.y)[0]!;
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const a = queue.shift()!;
      for (const b of L) {
        if (seen.has(b) || b.y >= a.y || a.y - b.y > 32) continue;
        const gap = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
        if (gap > 48) continue;
        seen.add(b);
        queue.push(b);
      }
    }
    expect(Math.min(...[...seen].map((l) => l.y))).toBeLessThanOrEqual(16);
  });

  it('the shaft repeats every wrap period, so the jump back up is seamless', () => {
    const m = map();
    const wrap = parseTiledLevel(m).segments[0]!.wrap!;
    const rows = wrap / 16;
    // Камера бывает на y от 0 до wrap: видны строки 0 … (wrap + 240) / 16.
    const seen = (wrap + 240) / 16;
    for (const name of ['art', 'oneway', 'solid']) {
      const data = m.layers.find((l) => l.name === name)!.data!;
      for (let r = 0; r + rows < seen; r++)
        for (let c = 0; c < m.width; c++)
          expect(data[r * m.width + c], `${name} ${c},${r}`).toBe(data[(r + rows) * m.width + c]);
    }
  });

  it('the camera sinks steadily (platforms rise) and wraps; an idle hero is carried up, scraped off at the top, never hurt', () => {
    const w = arenaWorld();
    w.frozen = false; // реплику пропустили, босс не начал (стоит)
    const p = w.players[0]!;
    const input = new TestInput();
    const y0 = w.camera.y;
    w.step({ 1: input.hold() });
    expect(w.camera.y - y0).toBeCloseTo(RISING_ARENA.speed);
    let wrapped = false;
    let prevCam = w.camera.y;
    let scraped = 0;
    let wasOnGround = true;
    for (let i = 0; i < 60 * 30; i++) {
      w.step({ 1: input.hold() });
      if (w.camera.y < prevCam) wrapped = true;
      prevCam = w.camera.y;
      if (wasOnGround && !p.onGround && p.y <= w.camera.y + 1) scraped++;
      wasOnGround = p.onGround;
      expect(p.state).not.toBe('dead');
      expect(p.y).toBeGreaterThanOrEqual(w.camera.y - 0.01);
      expect(feetOf(p)).toBeLessThanOrEqual(w.camera.y + w.camera.h);
    }
    expect(wrapped).toBe(true);
    expect(scraped).toBeGreaterThan(0);
    expect(p.vitals.hearts).toBe(3);
  });
});

describe('Bordachev: jumps ledge to ledge, throws a globe at you, the crane pushes', () => {
  it('stays on screen, visits all three columns, telegraphs every throw', () => {
    const w = arenaWorld();
    w.setGod(true);
    w.resume();
    const b = boss(w);
    const input = new TestInput();
    const cols = new Set<number>();
    let telegraph = 0;
    let throws = 0;
    for (let i = 0; i < 60 * 60; i++) {
      const before = w.projectiles.length;
      w.step({ 1: input.hold() });
      if (b.telegraphing) telegraph++;
      if (w.projectiles.length > before && w.projectiles.some((q) => q.kind === 'globe')) {
        throws++;
        expect(telegraph).toBeGreaterThanOrEqual(BOSS_RULES.minTelegraphFrames);
        telegraph = 0;
      }
      if (!b.airborne) {
        cols.add(Math.floor(centerOf(b) / 96));
        // Стоит на платформе, ноги на её верхе.
        expect(w.grid.isOneway(Math.floor(centerOf(b) / 16), (b.y + b.h) / 16)).toBe(true);
      }
      expect(b.y + b.h).toBeLessThanOrEqual(w.camera.y + w.camera.h);
      expect(b.y).toBeGreaterThan(w.camera.y - C.height);
    }
    expect(cols.size).toBe(3);
    expect(throws).toBeGreaterThan(10);
  });

  it('every 6 s the crane passes: warns at the edge, pushes the hero toward the edge, drops a case on a ledge; no damage', () => {
    const w = arenaWorld();
    w.resume();
    const b = boss(w);
    const p = w.players[0]!;
    const input = new TestInput();
    p.placeAt(128, 160); // средняя колонна
    // Босс не мешает: проверяем только кран.
    let appeared = -1;
    let warn = 0;
    let pushed = false;
    let caseRested = false;
    const x0 = p.x;
    for (let i = 0; i < C.crane.everyFrames + 400; i++) {
      p.vitals.invuln = 999; // глобусы не в счёт
      w.projectiles = [];
      w.step({ 1: input.hold() });
      const c = b.crane;
      if (c && appeared < 0) appeared = i;
      if (c?.phase === 'warn') warn++;
      if (Math.abs(p.x - x0) > 20) pushed = true;
      const dropped = w.items.find((it) => it.kind === 'box');
      if (dropped?.state === 'resting' && w.camera.sees(dropped, 0)) caseRested = true;
    }
    expect(appeared).toBeGreaterThan(C.crane.everyFrames - 10);
    expect(appeared).toBeLessThan(C.crane.everyFrames + 10);
    expect(warn).toBeGreaterThanOrEqual(BOSS_RULES.minTelegraphFrames);
    expect(pushed).toBe(true);
    expect(p.vitals.hearts).toBe(3);
    // Кейс лёг на платформу на экране (потом его уносит вверх вместе с ней).
    expect(caseRested).toBe(true);
  });

  it('hiding in a box does not protect from the crane (TZ)', () => {
    const w = arenaWorld();
    w.resume();
    const b = boss(w);
    const p = w.players[0]!;
    const input = new TestInput();
    // Дать герою ящик и спрятаться.
    p.placeAt(128, 160); // средняя колонна
    w.dropAmmo({ x: centerOf(p) + 10, y: feetOf(p) });
    for (let i = 0; i < 30; i++) w.step({ 1: input.hold() });
    p.facing = 1;
    w.step({ 1: input.hold('right', 'action') });
    w.step({ 1: input.hold() });
    w.step({ 1: input.hold('down') });
    expect(p.state).toBe('hidden');
    let pushed = false;
    for (let i = 0; i < C.crane.everyFrames + 300 && !pushed; i++) {
      w.projectiles = [];
      const before = p.x;
      w.step({ 1: input.hold('down') });
      if (b.crane?.phase === 'pass' && overlaps(b.crane, { ...p, x: before })) pushed = true;
      if (b.crane?.phase === 'pass' && Math.abs(p.x - before) > 1.5) pushed = true;
    }
    expect(pushed).toBe(true);
  });
});

/**
 * Бот на одних кнопках, тактика «у стены»: стоит у внешней стены боковой колонны (крюк крана
 * прижимает к стене, а не сталкивает, и кладёт коробку рядом), берёт коробку и бросает в
 * Бордачёва, когда тот на линии броска (с прыжка, если чуть выше). От глобусов — прыжком.
 */
function botKeys(w: World, p: Player, b: Bordachev, prev: Action[]): Action[] {
  const cx = centerOf(p);
  const feet = feetOf(p);
  const col = cx < 80 ? 0 : cx < 176 ? 1 : 2;
  const go = (dx: number): Action => (dx > 0 ? 'right' : 'left');
  const tap = (k: Action): Action[] => (prev.includes(k) ? [] : [k]);
  if (!p.controlled) return [];
  const bossDx = centerOf(b) - cx;
  const onThrowLine = () =>
    b.harmful && p.y < b.y + b.h && p.y + 16 > b.y && Math.abs(bossDx) < 160;

  if (!p.onGround) {
    const keys: Action[] = [];
    if (p.vy < 0 && prev.includes('jump')) keys.push('jump');
    // Со средней колонны — к ближней стене; над пропастью — не останавливаться.
    const held = prev.find((k): k is 'left' | 'right' => k === 'left' || k === 'right');
    if (col === 1 || (cx > 60 && cx < 200 && held))
      keys.push(held ?? (cx < 128 ? 'left' : 'right'));
    if (p.carriedItem && onThrowLine() && Math.sign(bossDx) === p.facing)
      keys.push(...tap('action'));
    return keys;
  }

  // Глобус упадёт на нас — перепрыгнуть.
  const threat = w.projectiles.some((q) => {
    let x = q.x;
    let y = q.y;
    let vy = q.vy;
    for (let t = 0; t < 24; t++) {
      vy += q.gravity;
      x += q.vx;
      y += vy;
      if (x < p.x + p.w + 2 && x + q.w > p.x - 2 && y < feet && y + q.h > p.y) return t > 6;
    }
    return false;
  });
  // У верха экрана прыгать некуда — отойти от стены.
  if (threat) return feet > w.camera.y + 64 ? tap('jump') : [col === 2 ? 'left' : 'right'];

  // Со средней колонны — уйти к стене (сойти на боковую).
  if (col === 1) return [cx < 128 ? 'left' : 'right'];
  const wallX = col === 0 ? 8 : 248;

  if (p.carriedItem) {
    if (!b.harmful) return [];
    const inward: Action = col === 0 ? 'right' : 'left';
    if (onThrowLine() && Math.sign(bossDx) === (col === 0 ? 1 : -1))
      return p.facing === Math.sign(bossDx) ? tap('action') : [inward];
    const above = feet - (b.y + b.h);
    if (above > 8 && above < 56 && Math.sign(bossDx) === (col === 0 ? 1 : -1)) {
      if (p.facing !== Math.sign(bossDx)) return [inward];
      return tap('jump');
    }
    return Math.abs(wallX - cx) > 6 ? [go(wallX - cx)] : [];
  }

  // Коробка на нашей платформе — взять.
  const mine = w.items.find(
    (i) =>
      i.state === 'resting' &&
      Math.abs(i.y + i.h - feet) < 2 &&
      (i.x + i.w / 2 < 80 ? 0 : i.x + i.w / 2 < 176 ? 1 : 2) === col,
  );
  if (mine) {
    const dx = centerOf(mine) - cx;
    if (Math.abs(dx) <= 15)
      return p.facing === Math.sign(dx) ? [go(dx), ...tap('action')] : [go(dx)];
    return [go(dx)];
  }
  return Math.abs(wallX - cx) > 6 ? [go(wallX - cx)] : [];
}

/** Бой ботом: кадры, сколько раз ранен, попаданий по боссу. */
function fight(seed: number, god: boolean, maxFrames = 60 * 240) {
  const w = arenaWorld(1, seed);
  w.resume();
  w.setGod(god);
  const b = boss(w);
  const p = w.players[0]!;
  const input = new TestInput();
  let prev: Action[] = [];
  let frames = 0;
  let hurt = 0;
  let lastHearts = p.vitals.hearts;
  let lastLives = p.vitals.lives;
  for (; frames < maxFrames && !b.defeated && !w.gameOver; frames++) {
    const keys = botKeys(w, p, b, prev);
    prev = keys;
    w.step({ 1: input.hold(...keys) });
    if (p.vitals.hearts < lastHearts || p.vitals.lives < lastLives) hurt++;
    lastHearts = p.vitals.hearts;
    lastLives = p.vitals.lives;
  }
  return { frames, hurt, hits: b.maxHp - b.hp, defeated: b.defeated };
}

describe('Bordachev fight with buttons only', () => {
  for (const seed of [1, 2, 3]) {
    it(`a bot (invulnerable, like F1) beats him: ammo reachable, he is hittable (seed ${seed})`, () => {
      const r = fight(seed, true);
      expect(r.defeated, JSON.stringify(r)).toBe(true);
      expect(r.frames).toBeLessThan(60 * 150);
    });
    it(`a bot without invulnerability keeps landing hits (seed ${seed})`, () => {
      // Простой бот не умеет толком уворачиваться и проигрывает; проверяем, что попадает
      // стабильно. Сложность для человека — на ручной проверке.
      const r = fight(seed, false);
      expect(r.hits, JSON.stringify(r)).toBeGreaterThanOrEqual(1);
    });
  }
});
