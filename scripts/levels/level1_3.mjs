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

  const oven = (col) => {
    m.prop(K.plateStack(1), col - 1, FLOOR);
    m.prop(K.oven, col, FLOOR);
  };

  // ——— Экран 0 (0–15): духовка, полка с тарелками ———
  m.point('spawn', 2, FLOOR);
  m.point('respawn', 2, FLOOR);
  oven(6);
  pair(7, OVEN, 'timecode', 'timecode');
  m.prop(K.shelf(4, 'plates'), 11, SHELF_HIGH + 1);
  tc(12, SHELF_HIGH);
  tc(13, SHELF_HIGH);

  // ——— Экран 1 (16–31): стена с полками ———
  m.prop(K.shelf(5, 'jars'), 18, SHELF_LOW + 1);
  pair(19, SHELF_LOW);
  m.prop(K.shelf(4, 'pots'), 25, SHELF_HIGH + 1);
  tc(26, SHELF_HIGH);
  tc(27, SHELF_HIGH);
  enemy('bot', 24, FLOOR);

  // ——— Экран 2 (32–47): духовка, звёздочка ———
  pair(33, FLOOR, null, 'timecode');
  oven(36);
  tc(37, OVEN - 1);
  tc(38, OVEN - 2);
  tc(39, OVEN - 1);
  enemy('asterisk', 40, 3);

  // ——— Экран 3 (48–63): стена с полками, бот ———
  m.prop(K.shelf(5, 'plates'), 50, SHELF_LOW + 1);
  pair(51, SHELF_LOW);
  m.prop(K.shelf(4, 'jars'), 57, SHELF_HIGH + 1);
  tc(58, SHELF_HIGH);
  enemy('bot', 58, FLOOR);

  // ——— Экран 4 (64–79): духовка, звёздочка ———
  stack(65, FLOOR, 'timecode');
  oven(68);
  tc(69, OVEN);
  tc(70, OVEN);
  enemy('asterisk', 72, 2);

  // ——— Экран 5 (80–95): бариста, кофе перед раковиной ———
  pair(81, FLOOR, null, 'coffee');
  m.prop(K.shelf(4, 'pots'), 88, SHELF_LOW + 1);
  tc(89, SHELF_LOW);
  enemy('barista', 85, FLOOR);
  tc(92, FLOOR);
  tc(93, FLOOR);

  // ——— Экран 6 (96–111): раковина с вентилем ———
  // Вентиль — на дне раковины, кораблик всплывает рядом: открыл воду — сразу прыгай на него.
  // Вода поднимается до y = 96, с кораблика — на уступ с выходом справа. Без воды уступ не достать.
  m.paint((p) => K.faucet(p, 101 * TILE, 3 * TILE));
  m.prop(K.sinkBasin(9, 3), 99, 15); // бортики — колонки 99 и 107, дно — строка 14 (y = 224)
  m.paint((p) => K.valve(p, 100 * TILE, 14 * TILE));
  m.zone('trigger', 100 * TILE, 12 * TILE, TILE, 2 * TILE);
  m.zone('flood', 100 * TILE, 6 * TILE, 7 * TILE, 8 * TILE);
  m.pointPx('floater', 103 * TILE + 8, 14 * TILE);
  m.solid(108, 110, 12, 14); // за раковиной — тумба
  m.solid(107, 110, 7, 7); // высокий уступ с выходом (над бортиком)
  m.paint((p) => {
    p.rect(108 * TILE, 12 * TILE, 3 * TILE, 3 * TILE, 0x7c7c7c);
    p.rect(107 * TILE, 7 * TILE, 4 * TILE, TILE, 0x7c7c7c);
    p.hline(107 * TILE, 7 * TILE, 4 * TILE, 0xfcfcfc);
    K.exitDoor(p, 109 * TILE, 7 * TILE);
  });
  m.zone('exit', 108 * TILE, 4 * TILE, 3 * TILE, 3 * TILE);
  for (const r of [9, 11]) {
    tc(101, r);
    tc(105, r);
  }

  m.segment('right', 0, 0, 112 * TILE, 15 * TILE);
  return m;
}
