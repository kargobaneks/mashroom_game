import { BALANCE } from '../config/balance';
import { PLAYER_PHYSICS } from '../config/physics';
import type { PlayerId } from '../systems/InputState';

/** Здоровье и жизни игрока (ТЗ: «Здоровье и жизни»). Чистые функции, удобно тестировать. */
export interface Vitals {
  hearts: number;
  maxHearts: number;
  /** Сколько попыток осталось, включая текущую. 0 — игрок выбыл. */
  lives: number;
  /** Кадры неуязвимости. */
  invuln: number;
}

export function newVitals(): Vitals {
  return {
    hearts: BALANCE.startHearts,
    maxHearts: BALANCE.startHearts,
    lives: BALANCE.startLives,
    invuln: 0,
  };
}

/** Удар: минус сердце и неуязвимость. Сердца кончились — 'killed'. */
export function takeHit(v: Vitals): 'ignored' | 'hurt' | 'killed' {
  if (v.invuln > 0 || v.hearts <= 0) return 'ignored';
  v.hearts -= 1;
  if (v.hearts <= 0) return 'killed';
  v.invuln = PLAYER_PHYSICS.invulnerableFrames;
  return 'hurt';
}

/** Кружка кофе: +1 сердце, не выше максимума. */
export function heal(v: Vitals, amount = 1): void {
  v.hearts = Math.min(v.maxHearts, v.hearts + amount);
}

/** Звезда-лайк: +1 жизнь. */
export function addLife(v: Vitals): void {
  v.lives += 1;
}

/** Значок «Подписка»: +1 к максимуму сердец, до потолка. */
export function raiseMaxHearts(v: Vitals): void {
  v.maxHearts = Math.min(BALANCE.maxHeartsCap, v.maxHearts + 1);
}

/** Потеря жизни: 'respawn' с полными сердцами или 'out', если жизни кончились. */
export function loseLife(v: Vitals): 'respawn' | 'out' {
  v.lives = Math.max(0, v.lives - 1);
  if (v.lives === 0) {
    v.hearts = 0;
    return 'out';
  }
  v.hearts = v.maxHearts;
  v.invuln = PLAYER_PHYSICS.invulnerableFrames;
  return 'respawn';
}

/** Продолжение после конца игры: жизни и сердца на старт, максимум сердец сохраняется. */
export function restoreForContinue(v: Vitals): void {
  v.lives = BALANCE.startLives;
  v.hearts = v.maxHearts;
  v.invuln = 0;
}

/** Что переносится из части уровня в следующую и между уровнями: здоровье, жизни, таймкоды. */
export interface PlayerCarry {
  readonly id: PlayerId;
  readonly vitals: Readonly<Vitals>;
  readonly timecodes: number;
}

/**
 * Награда между уровнями (выбор провода, бонус-игры): игрокам ids — сердца (лечение, не выше
 * максимума) и жизни. Кого нет в carry — начинает со свежих.
 */
export function rewardCarry(
  carry: readonly PlayerCarry[],
  ids: readonly PlayerId[],
  reward: (id: PlayerId) => { hearts: number; lives: number },
): PlayerCarry[] {
  return ids.map((id) => {
    const prev = carry.find((c) => c.id === id);
    const vitals: Vitals = prev ? { ...prev.vitals } : newVitals();
    const r = reward(id);
    heal(vitals, r.hearts);
    for (let i = 0; i < r.lives; i++) addLife(vitals);
    return { id, vitals, timecodes: prev?.timecodes ?? 0 };
  });
}
