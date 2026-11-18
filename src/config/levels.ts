/** Уровни и порядок сюжета (ТЗ: «Уровни 1–9», «Порядок сцен»). */
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ParkLevelId = 6 | 7 | 8;
export type BonusGame = 'crane';

export const LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** Аттракционы медиапарка: проходятся в любом порядке, каждый даёт ключ. */
export const PARK_LEVELS: readonly ParkLevelId[] = [6, 7, 8];
/** Открывается, когда собраны все ключи парка. */
export const FINAL_LEVEL: LevelId = 9;

export type StoryStep =
  | { readonly kind: 'cutscene'; readonly id: string }
  | { readonly kind: 'level'; readonly level: LevelId }
  | { readonly kind: 'wire' }
  | { readonly kind: 'bonus'; readonly game: BonusGame }
  | { readonly kind: 'park' }
  | { readonly kind: 'ending' };

/**
 * Линейный сценарий игры. Шаг `park` — это хаб: внутри него уровни 6–8 в любом порядке,
 * выход из хаба — в уровень 9 после трёх ключей.
 */
export const STORY: readonly StoryStep[] = [
  { kind: 'cutscene', id: 'intro' },
  { kind: 'level', level: 1 },
  { kind: 'wire' },
  { kind: 'cutscene', id: 'l1_end' },
  { kind: 'level', level: 2 },
  { kind: 'cutscene', id: 'l2_end' },
  { kind: 'level', level: 3 },
  { kind: 'bonus', game: 'crane' },
  { kind: 'cutscene', id: 'l3_end' },
  { kind: 'level', level: 4 },
  { kind: 'cutscene', id: 'l4_end' },
  { kind: 'level', level: 5 },
  { kind: 'cutscene', id: 'l5_end' },
  { kind: 'park' },
  { kind: 'level', level: 9 },
  { kind: 'ending' },
];
