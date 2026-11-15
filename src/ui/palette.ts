/** Цвета — из палитры NES (ТЗ: «Палитра»). */
export const PALETTE = {
  white: 0xfcfcfc,
  gray: 0x7c7c7c,
  darkGray: 0x3c3c3c,
  sky: 0xa4e4fc,
  peach: 0xfcd8a8,
  lime: 0xb8f818,
  black: 0x000000,
  red: 0xd82800,
  pink: 0xf87858,
} as const;

/** Фон уровня (до арта). */
export const LEVEL_BACKGROUNDS = {
  cafe: 0x004058,
  /** Вторая фаза Агранович: съёмочная площадка — цветной свет поверх арены. */
  filmSet: 0xd800cc,
  filmSetAlpha: 0.3,
} as const;
