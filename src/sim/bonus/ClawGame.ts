import { CLAW as C } from '../../config/bonus';
import type { PlayerId } from '../../systems/InputState';
import type { InputView } from '../Player';
import { Rng } from '../Rng';

export type PrizeKind = 'mug' | 'star';

export interface Prize {
  readonly kind: PrizeKind;
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  vy: number;
  /** Держит кран. */
  held: boolean;
  /** Выдан (упал в лоток) — убран из автомата. */
  gone: boolean;
}

/** idle — едет по рейке; drop — опускается; close — сжимается; rise — поднимается; carry — везёт к лотку. */
export type ClawState = 'idle' | 'drop' | 'close' | 'rise' | 'carry';

export interface Claw {
  readonly player: PlayerId;
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  state: ClawState;
  timer: number;
  held: Prize | null;
  /** Выскользнет на этой высоте (null — держит крепко). */
  slipAt: number | null;
  /** Центр лотка этого игрока. */
  readonly chuteX: number;
}

/**
 * Бонус-игра «Кран» (как игра с краном в оригинале): автомат с мерчем подкаста. Кран ездит
 * по рейке, по кнопке опускается, сжимается и поднимается; приз, взятый точно по центру,
 * держит крепко, взятый краем — может выскользнуть. Наверху кран сам везёт приз к лотку
 * своего игрока. 30 секунд; начатый захват доигрывается.
 */
export class ClawGame {
  readonly prizes: Prize[] = [];
  readonly claws: Claw[];
  /** Осталось кадров. */
  timer: number = C.seconds * 60;
  readonly won = new Map<PlayerId, { mug: number; star: number }>();
  private readonly rng: Rng;

  constructor(players: readonly PlayerId[], seed = 1) {
    this.rng = new Rng(seed);
    const b = C.box;
    this.claws = players.map((player) => {
      const chuteX = player === 1 ? b.x + C.chuteW / 2 : b.x + b.w - C.chuteW / 2;
      this.won.set(player, { mug: 0, star: 0 });
      return {
        player,
        x: chuteX - C.claw.w / 2,
        y: C.claw.restY,
        w: C.claw.w,
        h: C.claw.h,
        state: 'idle' as ClawState,
        timer: 0,
        held: null,
        slipAt: null,
        chuteX,
      };
    });
    this.fillMachine();
  }

  /** Горка призов между лотками: ряды со сдвигом, звёзды — в случайных местах. */
  private fillMachine(): void {
    const b = C.box;
    const S = C.prize.size;
    const left = b.x + C.chuteW + 6;
    const right = b.x + b.w - C.chuteW - 6;
    const slots: { x: number; y: number }[] = [];
    // Горка: ряды по центру с шагом чуть больше приза — верхний лежит на двух нижних.
    const step = S + 2;
    const mid = (left + right) / 2;
    C.rows.forEach((n, row) => {
      for (let i = 0; i < n; i++) {
        const cx = mid + (i - (n - 1) / 2) * step;
        slots.push({ x: cx - S / 2, y: b.y + b.h - S * (row + 1) });
      }
    });
    const stars = new Set<number>();
    while (stars.size < Math.min(C.stars, slots.length))
      stars.add(this.rng.int(0, slots.length - 1));
    slots.forEach((s, i) =>
      this.prizes.push({
        kind: stars.has(i) ? 'star' : 'mug',
        x: s.x,
        y: s.y,
        w: S,
        h: S,
        vy: 0,
        held: false,
        gone: false,
      }),
    );
  }

  /** Время вышло и все краны вернулись на рейку — итоги. */
  get finished(): boolean {
    return (
      this.timer <= 0 &&
      this.claws.every((c) => c.state === 'idle') &&
      this.prizes.every((p) => p.gone || p.vy === 0)
    );
  }

  /** Сколько поймал игрок (всего). */
  total(player: PlayerId): number {
    const w = this.won.get(player);
    return w ? w.mug + w.star : 0;
  }

  step(inputs: Readonly<Partial<Record<PlayerId, InputView>>>): void {
    if (this.timer > 0) this.timer--;
    for (const c of this.claws) this.updateClaw(c, inputs[c.player]);
    this.updatePrizes();
  }

  private updateClaw(c: Claw, input: InputView | undefined): void {
    const K = C.claw;
    const b = C.box;
    switch (c.state) {
      case 'idle': {
        if (this.timer <= 0 || !input) return;
        const dir = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
        c.x = Math.min(b.x + b.w - c.w, Math.max(b.x, c.x + dir * K.moveSpeed));
        if (input.pressed('action') || input.pressed('jump')) c.state = 'drop';
        return;
      }
      case 'drop': {
        c.y += K.dropSpeed;
        const bottom = c.y + c.h;
        const top = this.supportUnder(c);
        if (bottom >= top) {
          c.y = top - c.h;
          c.state = 'close';
          c.timer = C.closeFrames;
        }
        return;
      }
      case 'close':
        if (--c.timer > 0) return;
        this.grab(c);
        c.state = 'rise';
        return;
      case 'rise':
        c.y -= K.riseSpeed;
        if (c.held && c.slipAt !== null && c.y <= c.slipAt) this.release(c);
        if (c.y <= K.restY) {
          c.y = K.restY;
          c.state = c.held ? 'carry' : 'idle';
        }
        this.carryPrize(c);
        return;
      case 'carry': {
        const target = c.chuteX - c.w / 2;
        const d = target - c.x;
        c.x += Math.sign(d) * Math.min(Math.abs(d), K.carrySpeed);
        this.carryPrize(c);
        if (Math.abs(target - c.x) < 0.01) {
          // Над лотком: приз падает в выдачу.
          this.release(c);
          c.state = 'idle';
        }
        return;
      }
    }
  }

  /** Куда опустится кран: верх самого высокого приза под его центром, иначе пол. */
  private supportUnder(c: Claw): number {
    const cx = c.x + c.w / 2;
    let top = C.box.y + C.box.h;
    for (const p of this.prizes) {
      if (p.gone || p.held) continue;
      if (cx > p.x - 2 && cx < p.x + p.w + 2) top = Math.min(top, p.y);
    }
    return top;
  }

  private grab(c: Claw): void {
    const cx = c.x + c.w / 2;
    const bottom = c.y + c.h;
    let best: Prize | null = null;
    let bestD = Infinity;
    for (const p of this.prizes) {
      if (p.gone || p.held || Math.abs(p.y - bottom) > 4) continue;
      const d = Math.abs(p.x + p.w / 2 - cx);
      if (d <= p.w / 2 + 2 && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    if (!best) return;
    best.held = true;
    best.vy = 0;
    c.held = best;
    const secure = bestD <= C.secureOffset;
    c.slipAt =
      !secure && this.rng.next() < C.slipChance
        ? C.claw.restY + this.rng.next() * (c.y - C.claw.restY)
        : null;
  }

  private carryPrize(c: Claw): void {
    const p = c.held;
    if (!p) return;
    p.x = c.x + c.w / 2 - p.w / 2;
    p.y = c.y + c.h - 2;
  }

  private release(c: Claw): void {
    const p = c.held;
    if (!p) return;
    p.held = false;
    p.vy = 0.01;
    c.held = null;
    c.slipAt = null;
  }

  /** Отпущенные призы падают: на пол, на другие призы или в лоток (выдача). */
  private updatePrizes(): void {
    const b = C.box;
    const floor = b.y + b.h;
    for (const p of this.prizes) {
      if (p.gone || p.held || p.vy === 0) continue;
      p.vy = Math.min(C.prize.maxFall, p.vy + C.prize.gravity);
      let ny = p.y + p.vy;
      const cx = p.x + p.w / 2;
      const chute = this.claws.find((c) => Math.abs(c.chuteX - cx) <= C.chuteW / 2);
      if (chute && ny + p.h >= floor) {
        p.gone = true;
        const w = this.won.get(chute.player)!;
        w[p.kind]++;
        continue;
      }
      let land = floor;
      for (const q of this.prizes) {
        if (q === p || q.gone || q.held) continue;
        if (q.x < p.x + p.w && q.x + q.w > p.x && q.y >= p.y + p.h - 0.01)
          land = Math.min(land, q.y);
      }
      if (ny + p.h >= land) {
        ny = land - p.h;
        p.vy = 0;
      }
      p.y = ny;
    }
    // Взяли приз снизу — те, что лежали на нём, падают.
    for (const p of this.prizes) {
      if (p.gone || p.held || p.vy !== 0) continue;
      if (p.y + p.h >= floor - 0.01) continue;
      const supported = this.prizes.some(
        (q) =>
          q !== p &&
          !q.gone &&
          !q.held &&
          q.x < p.x + p.w &&
          q.x + q.w > p.x &&
          Math.abs(q.y - (p.y + p.h)) < 0.5,
      );
      if (!supported) p.vy = 0.01;
    }
  }
}
