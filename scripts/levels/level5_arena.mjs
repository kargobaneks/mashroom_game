// Уровень 5, арена Микитко — зал архива по кадрам арены уровня 5 оригинала
// (docs/refs/level_5_boss_*.png): один экран; сверху тьма, стенные панели в шахматку, две колонны
// со свечами, по краям урны (фон), пол — сплошная балюстрада. Платформ нет, как в оригинале
// (LEVEL5_GHOST_BOSS.md; решение пользователя 18.11 — тумбы убраны). Буквы — только от призрака.
// Маршрут уровня до арены (склад, стеллажи, Петровский) — следующим шагом, по кадрам оригинала.
import * as A from './archive-art.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel5Arena() {
  const m = new MapBuilder(16, 15);
  const FLOOR = 13;
  const fy = FLOOR * TILE;
  const PILLARS = [69, 189];

  m.paint((p) => {
    p.rect(0, 0, 16 * TILE, 15 * TILE, 0x000000);
    for (const [x0, x1] of [
      [0, 60],
      [86, 178],
      [206, 256],
    ])
      A.panel(p, x0, 112, x1, fy);
    A.balustrade(p, 0, fy, 16 * TILE, [112, 146]);
  });
  m.decor((p) => {
    for (const cx of PILLARS) A.candlePillar(p, cx, fy);
    A.urn(p, 24, fy - 32, fy);
    A.urn(p, 232, fy - 32, fy);
  });
  for (const cx of PILLARS) m.zone('flame', cx - 8, fy - 92 - 11, 16, 11);
  m.solid(0, 15, FLOOR, FLOOR + 1);

  // Старт и возрождение — у левого края пола, как в оригинале (24, пол).
  m.pointPx('spawn', 24, fy);
  m.pointPx('respawn', 24, fy);

  m.segment('lock', 0, 0, 16 * TILE, 15 * TILE, { boss: 'mikitko' });
  return m;
}
