/** Баланс: здоровье, жизни, продолжения, боссы. Стартовые числа из ТЗ. */
export const BALANCE = {
  startHearts: 3,
  maxHeartsCap: 5,
  startLives: 3,
  continues: 3,
  /** Сколько таймкодов нужно за уровень, чтобы получить значок «Подписка». */
  badgeThreshold: 10,
  metamodernLetters: 9,
  duet: {
    /** Окно одновременного нажатия «реплики дуэтом», кадры. */
    windowFrames: 6,
    stunFrames: 120,
    cooldownFrames: 20 * 60,
  },
  bonusSeconds: 30,
  fridgeSeconds: 180,
  escapeSeconds: 60,
} as const;

/** Общие правила боссов (ТЗ: «Боссы → Общие правила»). */
export const BOSS_RULES = {
  /** Знак перед атакой — не меньше стольких кадров. */
  minTelegraphFrames: 20,
  /** Замер оригинала: 32 кадра. В ТЗ было 40. */
  hitInvulnerableFrames: 32,
  /** На половине жизни тайминги ускоряются на 25%. */
  halfHpTimingFactor: 0.75,
  /** Если на арене нет предмета, сверху падает коробка через столько кадров. */
  ammoDropFrames: 4 * 60,
} as const;

/** Босс 1: Агранович (кофейня). */
export const AGRANOVICH = {
  hp: 6,
  width: 32,
  height: 32,
  /** После стольких попаданий — вторая фаза (съёмочная площадка, пейнтбол). */
  phase2AfterHits: 3,
  /** Не из ТЗ: скорость перелёта между точками. */
  flySpeed: 1.5,
  /** «Останавливается на 1 с». */
  hoverFrames: 60,
  /** Не из ТЗ: знак перед выстрелом (не меньше BOSS_RULES.minTelegraphFrames). */
  telegraphFrames: 24,
  /** Не из ТЗ: пауза после выстрела, босс всё ещё стоит и уязвим. */
  recoverFrames: 30,
  /** Пена в нижней части арены тянет игрока вниз. */
  foamGravityBonus: 0.1,
  streams: { count: 3, spreadRad: 0.35, speed: 2.2, size: 6 },
  paintballs: { count: 5, spreadRad: 0.25, speed: 2.5, size: 5 },
} as const;
