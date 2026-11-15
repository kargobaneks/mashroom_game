/**
 * Физика игрока и бросков. Стартовые значения из ТЗ, единицы — пиксели за кадр при 60 к/с
 * (для гравитации — пиксели за кадр за кадр). Подбираются на плейтесте.
 */
export const PLAYER_PHYSICS = {
  walkSpeed: 1.25,
  walkSpeedLightItem: 1.25,
  walkSpeedHeavyItem: 0.75,
  jumpVelocity: -4.5,
  jumpVelocityHeavyItem: -3.5,
  gravity: 0.25,
  maxFallSpeed: 4.0,
  /** Отпустил прыжок рано — скорость вверх обрезается до этого значения. */
  jumpCutVelocity: -1.5,
  hitboxStanding: { width: 12, height: 20 },
  hitboxCrouching: { width: 12, height: 12 },
  invulnerableFrames: 90,
  invulnerableBlinkFrames: 4,
  knockback: { x: 1.5, y: -2 },
  stunFrames: 60,
  throwFrames: 8,
  /** 0 = выключено, как в оригинале. */
  coyoteFrames: 0,
  jumpBufferFrames: 0,
} as const;

export const THROW_PHYSICS = {
  forwardSpeed: 4,
  upSpeed: 5,
  groundSpeed: 3,
} as const;
