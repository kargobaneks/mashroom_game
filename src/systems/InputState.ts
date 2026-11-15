/** Чистая логика ввода без Phaser: состояние кнопок, фронты нажатия, чтение геймпада. */

export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'action', 'start'] as const;
export type Action = (typeof ACTIONS)[number];
export type PlayerId = 1 | 2;
export const PLAYER_IDS: readonly PlayerId[] = [1, 2];

export type RawButtons = Readonly<Record<Action, boolean>>;

export function emptyButtons(): Record<Action, boolean> {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    action: false,
    start: false,
  };
}

/** Кнопка нажата, если она нажата хотя бы в одном источнике (клавиатура, геймпад). */
export function mergeButtons(...sources: readonly RawButtons[]): RawButtons {
  const out = emptyButtons();
  for (const src of sources) for (const a of ACTIONS) out[a] ||= src[a];
  return out;
}

/** Снимок геймпада в духе Gamepad API: кнопки и оси. */
export interface GamepadSnapshot {
  readonly buttons: readonly boolean[];
  readonly axes: readonly number[];
}

export interface GamepadMapping {
  readonly buttons: Readonly<Record<Action, readonly number[]>>;
  readonly stickAxisX: number;
  readonly stickAxisY: number;
  readonly stickDeadzone: number;
}

export function readGamepad(pad: GamepadSnapshot, map: GamepadMapping): RawButtons {
  const out = emptyButtons();
  for (const a of ACTIONS) out[a] = map.buttons[a].some((i) => pad.buttons[i] === true);
  const x = pad.axes[map.stickAxisX] ?? 0;
  const y = pad.axes[map.stickAxisY] ?? 0;
  if (x <= -map.stickDeadzone) out.left = true;
  if (x >= map.stickDeadzone) out.right = true;
  if (y <= -map.stickDeadzone) out.up = true;
  if (y >= map.stickDeadzone) out.down = true;
  return out;
}

/**
 * Ввод одного игрока по шагам логики. `pressed` — кнопку нажали на этом шаге.
 * Первый шаг только запоминает состояние: кнопка, зажатая при входе в сцену,
 * не считается новым нажатием (иначе «Старт» на титуле пролистнул бы и следующий экран).
 */
export class PlayerInput {
  private cur: RawButtons = emptyButtons();
  private prev: RawButtons = emptyButtons();
  private primed = false;

  update(raw: RawButtons): void {
    this.prev = this.primed ? this.cur : raw;
    this.cur = { ...raw };
    this.primed = true;
  }

  down(a: Action): boolean {
    return this.cur[a];
  }

  pressed(a: Action): boolean {
    return this.cur[a] && !this.prev[a];
  }

  released(a: Action): boolean {
    return !this.cur[a] && this.prev[a];
  }
}
