// Уровень 2, часть 2-2: предбанник и машинный зал — арена Уралова.
// По ТЗ: серверная со стойками; по кадрам оригинала (уровень 2): ровный пол, босс летает над ним
// и машет крыльями у стены, ящики для броска появляются на полу.
// Ярусы: пол (y = 208) и стойки у стен (y = 176). Босс — выше: с пола его достаёт бросок вверх,
// со стойки — и прыжок (касание ранит).
// Сетка 32 × 15: экран 0 — предбанник (прокрутка вправо), экран 1 — арена (зафиксирована).
import { NES } from './pixels.mjs';
import * as S from './server-art.mjs';
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel2Arena() {
  const m = new MapBuilder(32, 15);
  const { box, pair, tc } = placers(m);
  const FLOOR = 13;
  const A = 16; // первая колонка арены

  m.paint((p) => {
    S.wall(p, 0, 0, 32 * TILE, FLOOR * TILE);
    S.raisedFloor(p, 0, FLOOR * TILE, 32 * TILE, 2 * TILE);
    // Проём в машинный зал и правая стена.
    p.rect(A * TILE, 0, TILE, 9 * TILE, NES.navy);
    p.rect(31 * TILE, 0, TILE, FLOOR * TILE, NES.navy);
  });
  m.decor((p) => {
    S.wallMonitor(p, 4 * TILE, 3 * TILE);
    S.bluePipe(p, 10 * TILE, 0, FLOOR * TILE);
    // Стена мониторов в машинном зале — паника на всех экранах.
    for (const x of [20, 23.5, 27]) S.wallMonitor(p, x * TILE, 2 * TILE);
    for (const x of [21.75, 25.25]) S.wallMonitor(p, x * TILE, 5 * TILE);
  });
  m.solid(0, 31, FLOOR, FLOOR + 1);
  m.solid(A, A, 0, 8);
  m.solid(31, 31, 0, FLOOR - 1);

  // Предбанник: кофе перед боем, таймкоды.
  m.point('spawn', 2, FLOOR);
  m.point('respawn', 2, FLOOR);
  pair(7, FLOOR, 'coffee', null);
  tc(4, FLOOR);
  tc(11, FLOOR - 1);
  tc(12, FLOOR - 1);

  // Арена: стойки у стен, ящики на полу; новые появляются на полу (как блоки в оригинале).
  m.prop(S.rack(2), A + 1, FLOOR); // 17–18
  m.prop(S.rack(2), A + 13, FLOOR); // 29–30
  box(A + 5, FLOOR);
  box(A + 10, FLOOR);
  m.point('ammo', A + 4, FLOOR);
  m.point('ammo', A + 11, FLOOR);
  m.point('respawn', A + 7, FLOOR);

  m.segment('right', 0, 0, 32 * TILE, 15 * TILE);
  m.segment('lock', A * TILE, 0, 16 * TILE, 15 * TILE, { boss: 'uralov' });
  return m;
}
