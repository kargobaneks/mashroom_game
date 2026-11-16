import { describe, expect, it } from 'vitest';
import { CLAW } from '../src/config/bonus';
import { ClawGame, type Claw, type Prize } from '../src/sim/bonus/ClawGame';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

/** Довести кран до центра приза и нажать кнопку; ждать, пока кран вернётся. */
function fish(g: ClawGame, claw: Claw, prize: Prize, offset = 0, input = new TestInput()): void {
  const target = prize.x + prize.w / 2 + offset - claw.w / 2;
  for (let i = 0; i < 600 && Math.abs(claw.x - target) > CLAW.claw.moveSpeed / 2; i++) {
    const keys: Action[] = [claw.x < target ? 'right' : 'left'];
    g.step({ [claw.player]: input.hold(...keys) });
  }
  g.step({ [claw.player]: input.hold('action') });
  for (let i = 0; i < 900 && !(claw.state === 'idle' && g.prizes.every((p) => p.vy === 0)); i++)
    g.step({ [claw.player]: input.hold() });
}

const topPrizes = (g: ClawGame) => {
  const minY = Math.min(...g.prizes.filter((p) => !p.gone).map((p) => p.y));
  return g.prizes.filter((p) => !p.gone && p.y === minY);
};

describe('bonus game «Кран» (TZ: catch podcast merch: mug = heart, star = life; 30 s)', () => {
  it('fills the machine with mugs and a few stars between the chutes', () => {
    const g = new ClawGame([1]);
    expect(g.prizes.length).toBe(CLAW.rows.reduce((a, b) => a + b, 0));
    expect(g.prizes.filter((p) => p.kind === 'star').length).toBe(CLAW.stars);
    const b = CLAW.box;
    for (const p of g.prizes) {
      expect(p.x).toBeGreaterThanOrEqual(b.x + CLAW.chuteW);
      expect(p.x + p.w).toBeLessThanOrEqual(b.x + b.w - CLAW.chuteW);
    }
    expect(g.timer).toBe(30 * 60);
  });

  it('a centred grab holds: the claw carries the prize to the player chute and it counts', () => {
    const g = new ClawGame([1]);
    const claw = g.claws[0]!;
    const prize = topPrizes(g)[0]!;
    fish(g, claw, prize);
    expect(prize.gone).toBe(true);
    expect(g.total(1)).toBe(1);
    expect(g.won.get(1)![prize.kind]).toBe(1);
  });

  it('missing (claw over empty floor) catches nothing', () => {
    const g = new ClawGame([1]);
    const claw = g.claws[0]!;
    g.step({ 1: new TestInput().hold('action') }); // над своим лотком — там пусто
    for (let i = 0; i < 400; i++) g.step({ 1: new TestInput().hold() });
    expect(claw.state).toBe('idle');
    expect(g.total(1)).toBe(0);
  });

  it('an edge grab sometimes slips; a slipped prize falls back into the machine', () => {
    let slipped = 0;
    let caught = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = new ClawGame([1], seed);
      const prize = topPrizes(g)[0]!;
      fish(g, g.claws[0]!, prize, prize.w / 2);
      if (prize.gone) caught++;
      else {
        slipped++;
        expect(prize.held).toBe(false);
        expect(prize.vy).toBe(0);
      }
    }
    expect(slipped).toBeGreaterThan(0);
    expect(caught).toBeGreaterThan(0);
  });

  it('after 30 s the claws stop taking new turns, a grab in progress is finished', () => {
    const g = new ClawGame([1]);
    const claw = g.claws[0]!;
    const input = new TestInput();
    while (g.timer > 5) g.step({ 1: input.hold() });
    // Последние кадры — опустить кран над призом.
    const prize = topPrizes(g)[0]!;
    claw.x = prize.x + prize.w / 2 - claw.w / 2;
    g.step({ 1: input.hold('action') });
    expect(claw.state).toBe('drop');
    for (let i = 0; i < 900 && !g.finished; i++) g.step({ 1: input.hold() });
    expect(g.finished).toBe(true);
    expect(g.total(1)).toBe(1);
    g.step({ 1: input.hold('action') });
    expect(claw.state).toBe('idle');
  });

  it('co-op: two claws, each delivers to its own chute', () => {
    const g = new ClawGame([1, 2]);
    expect(g.claws).toHaveLength(2);
    const [a, b] = g.claws as [Claw, Claw];
    expect(a.chuteX).toBeLessThan(b.chuteX);
    const tops = topPrizes(g);
    fish(g, a, tops[0]!);
    fish(g, b, tops.at(-1)!);
    expect(g.total(1)).toBe(1);
    expect(g.total(2)).toBe(1);
  });

  it('a prize lies on two below; taking both lets it fall, taking one does not', () => {
    const g = new ClawGame([1]);
    const S = CLAW.prize.size;
    const floorRow = Math.max(...g.prizes.map((q) => q.y));
    const above = g.prizes.find((p) => p.y === floorRow - S)!;
    const under = g.prizes.filter(
      (q) => q.y === floorRow && q.x < above.x + above.w && q.x + q.w > above.x,
    );
    expect(under).toHaveLength(2);
    const y0 = above.y;
    under[0]!.gone = true;
    for (let i = 0; i < 30; i++) g.step({});
    expect(above.y).toBe(y0);
    under[1]!.gone = true;
    for (let i = 0; i < 60; i++) g.step({});
    expect(above.y).toBeGreaterThan(y0);
    expect(above.vy).toBe(0);
  });
});
