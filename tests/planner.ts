import type { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

/**
 * Бот-планировщик для проверки проходимости уровней с движущимися платформами (цепи уровня 6).
 * Каждый раз, стоя на опоре, перебирает короткие планы (идти / прыгнуть / пройти и прыгнуть,
 * с разной длительностью зажатого направления), проигрывает каждый на копии мира и выполняет
 * первый, который ставит героя на следующую цель маршрута. Ни один не подошёл — ждёт кадр
 * (платформа подъедет). Только кнопки: никаких телепортов.
 */

export type Target =
  | { readonly kind: 'surface'; readonly y: number; readonly x0: number; readonly x1: number }
  | { readonly kind: 'chain'; readonly index: number };

/** Глубокая копия с сохранением прототипов; level и grid — общие (не меняются). */
export function deepClone<T>(v: T, memo = new Map<unknown, unknown>()): T {
  if (v === null || typeof v !== 'object') return v;
  if (memo.has(v)) return memo.get(v) as T;
  if (ArrayBuffer.isView(v)) return v; // тайлы — только чтение
  if (Array.isArray(v)) {
    const out: unknown[] = [];
    memo.set(v, out);
    for (const x of v) out.push(deepClone(x, memo));
    return out as T;
  }
  if (v instanceof Map) {
    const out = new Map();
    memo.set(v, out);
    for (const [k, x] of v) out.set(deepClone(k, memo), deepClone(x, memo));
    return out as T;
  }
  if (v instanceof Set) {
    const out = new Set();
    memo.set(v, out);
    for (const x of v) out.add(deepClone(x, memo));
    return out as T;
  }
  const out = Object.create(Object.getPrototypeOf(v) as object) as Record<string, unknown>;
  memo.set(v, out);
  for (const k of Object.keys(v)) {
    const x = (v as Record<string, unknown>)[k];
    out[k] = k === 'level' || k === 'grid' ? x : deepClone(x, memo);
  }
  return out as T;
}

export function reached(w: World, t: Target): boolean {
  const p = w.players[0]!;
  if (!p.onGround) return false;
  if (t.kind === 'chain') return w.mech.chains[t.index]!.isRider(p);
  const cx = p.x + p.w / 2;
  return Math.abs(p.y + p.h - t.y) < 0.5 && cx >= t.x0 && cx <= t.x1;
}

type Plan = Action[][];

function plans(): Plan[] {
  const out: Plan[] = [];
  const LEN = 100;
  const mk = (f: (i: number) => Action[]): Plan => Array.from({ length: LEN }, (_, i) => f(i));
  out.push(mk((i) => (i < 30 ? ['jump'] : [])));
  for (const d of ['left', 'right'] as const) {
    for (const h of [2, 5, 8, 12, 16, 20, 26, 32, 40, 50, 64])
      out.push(mk((i) => (i < h ? [d] : [])));
    for (const h of [2, 4, 6, 9, 12, 16, 20, 26, 32, 40, 100])
      out.push(mk((i) => [...(i < h ? [d] : []), ...(i < 30 ? (['jump'] as const) : [])]));
    // Прыжок вверх, направление — в полёте.
    for (const delay of [6, 12, 18])
      for (const h of [6, 12, 24])
        out.push(
          mk((i) => [
            ...(i >= delay && i < delay + h ? [d] : []),
            ...(i < 30 ? (['jump'] as const) : []),
          ]),
        );
    // Пройти, потом прыгнуть (направление зажато до конца).
    for (const k of [4, 8, 12, 16, 24, 32, 48])
      out.push(mk((i) => [d, ...(i >= k && i < k + 30 ? (['jump'] as const) : [])]));
  }
  return out;
}
const PLANS = plans();

/** Сколько кадров плана нужно, чтобы встать на цель (null — не встаёт). */
function tryPlan(w: World, input: TestInput, plan: Plan, t: Target): number | null {
  const sim = deepClone(w);
  const inp = deepClone(input);
  // После последнего нажатия, приземлившись не туда, ждать дальше незачем.
  let last = 0;
  plan.forEach((k, f) => {
    if (k.length > 0) last = f;
  });
  const hearts = sim.players[0]!.vitals.hearts;
  for (let f = 0; f < plan.length; f++) {
    inp.hold(...plan[f]!);
    sim.step({ 1: inp });
    sim.drainEvents();
    const p = sim.players[0]!;
    if (p.state === 'dead' || p.state === 'respawn') return null;
    // План, на котором героя ранило (давящий блок, шипы), не годится.
    if (p.vitals.hearts < hearts) return null;
    if (reached(sim, t)) return f + 1;
    if (f > last && p.onGround) return null;
  }
  return null;
}

/**
 * Пройти маршрут. Возвращает индекс цели, на которой застрял (null — дошёл), и кадры.
 * after() вызывается каждый кадр — можно ловить события.
 */
export function followRoute(
  w: World,
  route: readonly Target[],
  maxFrames: number,
  after: () => void = () => {},
  log: (msg: string) => void = () => {},
): { stuckAt: number | null; frames: number; keys: Action[][] } {
  const input = new TestInput();
  const keys: Action[][] = [];
  let frames = 0;
  let queue: Action[][] = [];
  let i = 0;
  let cooldown = 0;
  const step = (k: Action[]) => {
    keys.push(k);
    input.hold(...k);
    w.step({ 1: input });
    after();
    frames++;
  };
  while (i < route.length) {
    if (frames > maxFrames) return { stuckAt: i, frames, keys };
    if (reached(w, route[i]!)) {
      log(`target ${i} at frame ${frames}`);
      i++;
      queue = [];
      continue;
    }
    if (queue.length > 0) {
      step(queue.shift()!);
      continue;
    }
    const p = w.players[0]!;
    if (!p.onGround || cooldown > 0) {
      cooldown = Math.max(0, cooldown - 1);
      step([]);
      continue;
    }
    let best: { n: number; plan: Plan } | null = null;
    for (const plan of PLANS) {
      const n = tryPlan(w, input, plan, route[i]!);
      if (n !== null && (best === null || n < best.n)) best = { n, plan };
    }
    if (best) queue = best.plan.slice(0, best.n);
    else {
      cooldown = 3;
      step([]);
    }
  }
  return { stuckAt: null, frames, keys };
}
