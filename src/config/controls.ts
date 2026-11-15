import type Phaser from 'phaser';
import type { Action, PlayerId } from '../systems/InputState';

export type KeyName = keyof typeof Phaser.Input.Keyboard.KeyCodes;

/** Раскладка клавиатуры (ТЗ: таблица «Управление»). На действие можно повесить несколько клавиш. */
export const KEYBOARD: Readonly<Record<PlayerId, Readonly<Record<Action, readonly KeyName[]>>>> = {
  1: {
    left: ['LEFT'],
    right: ['RIGHT'],
    up: ['UP'],
    down: ['DOWN'],
    jump: ['Z'],
    action: ['X'],
    start: ['ENTER'],
  },
  2: {
    left: ['A'],
    right: ['D'],
    up: ['W'],
    down: ['S'],
    jump: ['G'],
    action: ['H'],
    start: ['ENTER'],
  },
};

/** Глобальные клавиши, не привязанные к игроку. */
export const GLOBAL_KEYS = {
  mute: 'M',
} as const satisfies Record<string, KeyName>;

/** Геймпад, стандартная раскладка Gamepad API. Первый подключённый — игрок 1, второй — игрок 2. */
export const GAMEPAD = {
  buttons: {
    jump: [0],
    action: [2],
    start: [9],
    up: [12],
    down: [13],
    left: [14],
    right: [15],
  },
  /** Левый стик: оси 0 (X) и 1 (Y). */
  stickAxisX: 0,
  stickAxisY: 1,
  stickDeadzone: 0.5,
} as const satisfies {
  buttons: Readonly<Record<Action, readonly number[]>>;
  stickAxisX: number;
  stickAxisY: number;
  stickDeadzone: number;
};
