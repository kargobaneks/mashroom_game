// Уровень 1, часть 1-3: «Мойка» (по структуре части 1-3 оригинала, своя обстановка).
//   • экраны 0–5 — вправо: чередуются духовки (верх — платформа, ступенька-стопка тарелок перед ней)
//     и стены с полками; боты и бариста по полу, звёздочки;
//   • экран 6 — большая раковина: вентиль у пола открывает воду, вода поднимается, всплывает
//     молочник-кораблик; на нём доплыть до высокого уступа с выходом. В воду упал — минус жизнь.
// Сетка 112 × 15.
import * as K from './kitchen-art.mjs';
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel1Sink() {
  const m = new MapBuilder(112, 15);
  const { stack, pair, enemy, tc } = placers(m);
  const FLOOR = 12; // y = 192
  const OVEN = 9; // верх духовки
  const SHELF_LOW = 10;
  const SHELF_HIGH = 8;

  m.paint((p) => K.sinkTiles(p, 0, 0, 112 * TILE, 15 * TILE, FLOOR * TILE));
  m.solid(0, 98, FLOOR, 14);
  m.solid(0, 0, 0, 11);
  m.solid(111, 111, 0, 14);

  // Духовки встроены в ряд тумб: тумба (на 32 выше пола) рядом с духовкой (на 48) — ступенька
  // на неё. Между рядами — стены с полками. Всё стоит где ему место.
  const COUNTER = FLOOR - 2; // верх тумбы
  const kitchenRow = (col) => {
    m.prop(K.counter(4), col, FLOOR);
    m.prop(K.oven, col + 4, FLOOR);
    m.prop(K.counter(4), col + 8, FLOOR);
  };
  const shelf = (col, w, load, row) => m.prop(K.shelf(w, load), col, row + 1);

  // ——— Экран 0 (0–15): ряд тумб с духовкой ———
  m.point('spawn', 1, FLOOR);
  m.point('respawn', 1, FLOOR);
  kitchenRow(3); // тумба 3–6, духовка 7–10, тумба 11–14
  pair(8, OVEN, 'timecode', 'timecode');
  shelf(11, 4, 'plates', SHELF_HIGH);
  tc(12, SHELF_HIGH);
  tc(13, SHELF_HIGH);

  // ——— Экран 1 (16–31): стена с полками ———
  shelf(18, 5, 'jars', SHELF_LOW);
  pair(19, SHELF_LOW);
  shelf(25, 4, 'pots', SHELF_HIGH);
  tc(26, SHELF_HIGH);
  tc(27, SHELF_HIGH);
  enemy('bot', 24, FLOOR);

  // ——— Экран 2 (32–47): ряд тумб с духовкой ———
  kitchenRow(33); // 33–36, 37–40, 41–44
  pair(34, COUNTER, null, 'timecode');
  tc(38, OVEN - 1);
  tc(39, OVEN - 2);
  enemy('asterisk', 40, 3);

  // ——— Экран 3 (48–63): стена с полками ———
  shelf(50, 5, 'plates', SHELF_LOW);
  pair(51, SHELF_LOW);
  shelf(57, 4, 'jars', SHELF_HIGH);
  tc(58, SHELF_HIGH);
  enemy('bot', 58, FLOOR);

  // ——— Экран 4 (64–79): ряд тумб с духовкой ———
  kitchenRow(65); // 65–68, 69–72, 73–76
  stack(67, COUNTER, 'timecode');
  tc(70, OVEN);
  tc(71, OVEN);
  enemy('asterisk', 72, 2);

  // ——— Экран 5 (80–95): бариста, кофе перед раковиной ———
  pair(81, FLOOR, null, 'coffee');
  shelf(88, 4, 'pots', SHELF_LOW);
  tc(89, SHELF_LOW);
  enemy('barista', 85, FLOOR);
  tc(92, FLOOR);
  tc(93, FLOOR);

  // ——— Экран 6 (96–111): раковина с вентилем ———
  // Вентиль — на дне раковины, кораблик всплывает рядом: открыл воду — сразу прыгай на него.
  // Вода поднимается до y = 96, с кораблика — на уступ с выходом справа. Без воды уступ не достать.
  m.decor((p) => K.faucet(p, 101 * TILE, 3 * TILE));
  m.prop(K.sinkBasin(9, 3), 99, 15); // бортики — колонки 99 и 107, дно — строка 14 (y = 224)
  m.decor((p) => K.valve(p, 100 * TILE, 14 * TILE));
  m.zone('trigger', 100 * TILE, 12 * TILE, TILE, 2 * TILE);
  m.zone('flood', 100 * TILE, 6 * TILE, 7 * TILE, 8 * TILE);
  m.pointPx('floater', 103 * TILE + 8, 14 * TILE);
  m.solid(108, 110, 12, 14); // за раковиной — тумба
  m.solid(107, 110, 7, 7); // высокий уступ с выходом (над бортиком)
  m.paint((p) => {
    p.rect(108 * TILE, 12 * TILE, 3 * TILE, 3 * TILE, 0x7c7c7c);
    p.rect(107 * TILE, 7 * TILE, 4 * TILE, TILE, 0x7c7c7c);
    p.hline(107 * TILE, 7 * TILE, 4 * TILE, 0xfcfcfc);
  });
  K.placeExitDoor(m, 109, 7);
  for (const r of [9, 11]) {
    tc(101, r);
    tc(105, r);
  }

  m.segment('right', 0, 0, 112 * TILE, 15 * TILE);
  return m;
}
