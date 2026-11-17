/**
 * Физика игрока и бросков. Стартовые значения из ТЗ, единицы — пиксели за кадр при 60 к/с
 * (для гравитации — пиксели за кадр за кадр). Подбираются на плейтесте.
 * Пометка «не из ТЗ» — значение, которого в ТЗ нет; выбрано нами, сверить на плейтесте.
 */
export const PLAYER_PHYSICS = {
  /** Замер оригинала (референс уровня 1): 2 px/кадр. В ТЗ было 1,25. */
  walkSpeed: 2,
  walkSpeedLightItem: 2,
  /** Тяжёлый предмет замедляет в той же пропорции, что в ТЗ (0,75 / 1,25). */
  walkSpeedHeavyItem: 1.2,
  jumpVelocity: -4.5,
  jumpVelocityHeavyItem: -3.5,
  gravity: 0.25,
  maxFallSpeed: 4.0,
  /** Отпустил прыжок рано — скорость вверх обрезается до этого значения. */
  jumpCutVelocity: -1.5,
  hitboxStanding: { width: 12, height: 20 },
  hitboxCrouching: { width: 12, height: 12 },
  /** Замер оригинала: 63 кадра. В ТЗ было 90. */
  invulnerableFrames: 63,
  invulnerableBlinkFrames: 4,
  knockback: { x: 1.5, y: -2 },
  stunFrames: 60,
  throwFrames: 8,
  /** 0 = выключено, как в оригинале. */
  coyoteFrames: 0,
  jumpBufferFrames: 0,
  /** Не из ТЗ: сколько кадров игрок неуправляем после удара. */
  hurtFrames: 20,
  /** Не из ТЗ: пауза между гибелью и возрождением. */
  deathFrames: 60,
  /** Не из ТЗ: игрок мигает на месте перед тем, как снова получить управление. */
  respawnFrames: 30,
  /** Не из ТЗ: сколько кадров игнорируются oneway-платформы после «вниз + прыжок». */
  dropThroughFrames: 10,
  /** Не из ТЗ: на каком расстоянии перед собой игрок может взять предмет. */
  pickupReach: 3,
  /** Не из ТЗ: дуга брошенного напарника. */
  partnerThrowVx: 2,
  partnerThrowVy: -3.5,
  /** Не из ТЗ: напарник, брошенный вверх (↑ + действие), — по боссу над головой. */
  partnerThrowUpVy: -5.5,
  /** Не из ТЗ: подскок, когда напарник вырывается из рук прыжком. */
  breakFreeVelocity: -3,
} as const;

export const THROW_PHYSICS = {
  forwardSpeed: 4,
  upSpeed: 5,
  groundSpeed: 3,
  /** Не из ТЗ: сколько кадров брошенный предмет не задевает бросившего. */
  ownerImmuneFrames: 8,
  /**
   * Как в оригинале: брошенный вперёд или по земле предмет, ни во что не попав, падает на
   * ближайшую платформу и остаётся лежать. Дальность полёта до падения, px — не замерена, подобрать.
   */
  missRange: 128,
} as const;

/** Предметы для броска (ТЗ: «Предметы, бросок, кооп»). */
export const ITEMS = {
  box: { width: 16, height: 16, heavy: false, hideable: true },
  case: { width: 16, height: 16, heavy: true, hideable: true },
  /** Буква ѣ, і, ѳ (арена Микитко): лёгкая, разбивается о цель, под ней не спрятаться. */
  letter: { width: 16, height: 16, heavy: false, hideable: false },
  /** Шестерёнка Щелина (арена уровня 6): лёгкая, разбивается о цель, под ней не спрятаться. */
  gear: { width: 16, height: 16, heavy: false, hideable: false },
  /** Карта Соболева и Луки (арена уровня 7): лёгкая, разбивается о цель. */
  card: { width: 16, height: 12, heavy: false, hideable: false },
  /**
   * Металлический блок (уровень 8): носится как ящик, в том числе в прыжке (замер); не бьётся —
   * врезавшись, падает и лежит. Его тянет магнит.
   */
  metal: { width: 16, height: 16, heavy: false, hideable: true },
  /** Обломок от удара шара (арена Маркова): лёгкий, разбивается о цель. */
  scrap: { width: 16, height: 12, heavy: false, hideable: false },
  gravity: 0.25,
  maxFallSpeed: 4,
} as const;
