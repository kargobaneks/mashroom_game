/** Баланс: здоровье, жизни, продолжения, подбираемое. Стартовые числа из ТЗ. */
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
    cooldownSeconds: 20,
  },
  bonusSeconds: 30,
  fridgeSeconds: 180,
  escapeSeconds: 60,
} as const;
