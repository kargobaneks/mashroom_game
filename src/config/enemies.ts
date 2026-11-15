/** Обычные враги (ТЗ: «Враги»). Пометка «не из ТЗ» — наше стартовое значение. */
export const ENEMIES = {
  /** Враг появляется, когда точка ближе к экрану, чем на столько пикселей. */
  spawnMargin: 16,
  /** Враг исчезает, уйдя за край экрана дальше, чем на столько. */
  despawnMargin: 48,
  bot: { width: 16, height: 16, speed: 0.75 },
  asterisk: {
    width: 8,
    height: 8,
    /** Не из ТЗ: скорость сближения по горизонтали и вертикали. */
    speed: 0.6,
    followYSpeed: 0.4,
    /** Не из ТЗ: синусоида — амплитуда, px, и шаг фазы за кадр. */
    amplitude: 10,
    frequency: 0.08,
    slowFrames: 180,
    maxStacks: 3,
  },
  barista: {
    width: 16,
    height: 16,
    /** Не из ТЗ: скорость «на колёсике». */
    speed: 0.5,
    shotIntervalFrames: 120,
    /** Не из ТЗ: капля латте по дуге. */
    dropVx: 1.5,
    dropVy: -3,
    dropGravity: 0.15,
    dropSize: 6,
  },
} as const;

/** Подбираемое (ТЗ: «Подбираемое»). */
export const PICKUPS = {
  coffee: { width: 10, height: 10 },
  star: { width: 10, height: 10 },
  timecode: { width: 8, height: 8 },
} as const;
