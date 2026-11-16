// Уровень 5, арена Микитко — зал архива по кадрам арены уровня 5 оригинала
// (docs/refs/level_5_boss_*.png): один экран; сверху тьма, стенные панели в шахматку, две колонны
// со свечами, по краям низкие тумбы (на них встают, 32 px), пол — сплошная балюстрада.
// Свет гаснет — призрак появляется справа (всегда; отзыв пользователя). Буквы — только от него
// (отзыв: «снаряды выпадают только с босса»): ни запасных сверху, ни лежащих с начала.
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
  // Тумбы — по тайлу, верх на 32 px выше пола.
  m.oneway(1, 1, FLOOR - 2);
  m.oneway(14, 14, FLOOR - 2);

  m.point('spawn', 4, FLOOR);
  m.point('respawn', 4, FLOOR);
  // Призрак появляется всегда справа (отзыв пользователя; как в кадрах оригинала) — над головой
  // героя: под ним можно стоять. Центр хитбокса.
  m.pointPx('bossPoint', 196, 140);

  m.segment('lock', 0, 0, 16 * TILE, 15 * TILE, { boss: 'mikitko' });
  return m;
}
