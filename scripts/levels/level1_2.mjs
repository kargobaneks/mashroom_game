// Уровень 1, часть 1-2: «Кухня» (по структуре части 1-2 оригинала, своя обстановка).
//   • экраны 0–5 — вправо по сплошному полу кухни: полки с кастрюлями и тарелками, плиты (жгут),
//     стопки тарелок и кастрюли как ступеньки; бариста-боты ходят по полу, звёздочки летают;
//   • экран 6 — подъём вверх: полки зигзагом, таймкоды столбиками;
//   • экраны 7–8 — вправо поверху: три бутылки сиропа с помпами-лифтами — необязательный путь
//     к звезде; кто упал с бутылок — второй попытки нет. Выход — служебная дверь в конце.
// Кофе — в ящиках до бутылок (экраны 2 и 5), как жёлуди в оригинале.
// Сетка 144 × 30: низ (строки 15–29) — экраны 0–6, верх (строки 0–14) — экраны 6–8.
import { NES } from './pixels.mjs';
import * as K from './kitchen-art.mjs';
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel1Kitchen() {
  const m = new MapBuilder(144, 30);
  const { stack, pair, enemy, tc } = placers(m);
  const FLOOR = 27; // пол низа, y = 432 (192 внутри экрана)
  const LOW = 25; // низкая полка / верх стопки тарелок
  const HIGH = 23; // высокая полка
  const TOP_FLOOR = 9; // пол верха, y = 144

  // ——— Фоны ———
  m.paint((p) => {
    K.tiles(p, 0, 15 * TILE, 112 * TILE, 15 * TILE, FLOOR * TILE);
    // Верх: кафель; шахматный пол — только там, где пол есть (с колонки 109). Над шахтой — пустота.
    K.tiles(p, 96 * TILE, 0, 48 * TILE, 15 * TILE);
    K.floorStrip(p, 109 * TILE, TOP_FLOOR * TILE, 35 * TILE, 6 * TILE);
  });
  m.solid(0, 111, FLOOR, 29);
  m.solid(109, 143, TOP_FLOOR, 14);
  m.solid(143, 143, 0, 8);

  // ——— Экран 0 (0–15) ———
  m.point('spawn', 2, FLOOR);
  m.point('respawn', 2, FLOOR);
  m.paint((p) => K.fridge(p, 4 * TILE, FLOOR * TILE));
  pair(8, FLOOR, 'timecode', 'timecode');
  m.prop(K.plateStack(2), 10, FLOOR);
  m.prop(K.shelf(4, 'plates'), 11, LOW + 1);
  tc(12, LOW);
  tc(13, LOW);
  enemy('barista', 15, FLOOR);

  // ——— Экран 1 (16–31): плита, высокая полка ———
  m.paint((p) => K.hood(p, 18 * TILE, 18 * TILE));
  m.prop(K.stove, 18, FLOOR);
  m.prop(K.plateStack(2), 22, FLOOR);
  m.prop(K.shelf(5, 'pots'), 23, HIGH + 1);
  pair(24, HIGH, null, 'timecode');
  enemy('asterisk', 27, 18);
  tc(18, 22);
  tc(19, 21);
  tc(20, 22);

  // ——— Экран 2 (32–47): кастрюля, полка с банками, кофе ———
  m.prop(K.bigPot, 34, FLOOR);
  m.prop(K.shelf(5, 'jars'), 38, HIGH + 1);
  tc(39, HIGH);
  tc(40, HIGH);
  pair(40, FLOOR, 'coffee', null);
  enemy('barista', 44, FLOOR);

  // ——— Экран 3 (48–63) ———
  m.prop(K.plateStack(2), 50, FLOOR);
  m.prop(K.shelf(4, 'plates'), 52, HIGH + 1);
  pair(53, HIGH);
  stack(60, FLOOR, 'timecode');
  enemy('asterisk', 58, 18);
  tc(51, 22);

  // ——— Экран 4 (64–79): вторая плита, бот на полке ———
  pair(64, FLOOR);
  m.paint((p) => K.hood(p, 66 * TILE, 18 * TILE));
  m.prop(K.stove, 66, FLOOR);
  m.prop(K.plateStack(2), 71, FLOOR);
  m.prop(K.shelf(5, 'pots'), 73, HIGH + 1);
  enemy('bot', 75, HIGH);
  tc(67, 22);
  tc(68, 21);
  tc(69, 22);

  // ——— Экран 5 (80–95): кофе перед подъёмом ———
  pair(82, FLOOR, null, 'coffee');
  m.prop(K.shelf(4, 'jars'), 85, LOW + 1);
  tc(86, LOW);
  tc(87, LOW);
  enemy('barista', 90, FLOOR);
  enemy('asterisk', 92, 19);

  // ——— Экран 6 (96–111): подъём — полки зигзагом ———
  m.paint((p) => {
    K.tallCabinet(p, 96 * TILE - 8, 2 * TILE, 12, 25 * TILE);
    K.tallCabinet(p, 112 * TILE - 4, 10 * TILE, 8, 17 * TILE);
  });
  m.point('respawn', 100, FLOOR);
  const zig = [
    [97, 25],
    [104, 23],
    [97, 21],
    [104, 19],
    [97, 17],
    [104, 15],
    [97, 13],
    [104, 11],
  ];
  zig.forEach(([col, row], i) => {
    m.prop(K.shelf(5, i % 2 ? 'plates' : 'pots'), col, row + 1);
    tc(i % 2 ? 106 : 99, row - 1);
  });
  tc(102, 18);
  tc(102, 14);

  // ——— Экраны 7–8 (верх, 112–143): бутылки сиропа с помпами ———
  m.point('respawn', 110, TOP_FLOOR);
  pair(110, TOP_FLOOR);
  // Бутылки стоят на высокой барной полке: под ней по полу идёт основной путь,
  // на полку (y = 112) запрыгивают с пола за звездой. Помпы поднимают выше и выше.
  const BAR_SHELF = 7;
  m.prop(K.shelf(17, 'jars'), 113, BAR_SHELF + 1);
  const bottles = [
    { col: 114, h: 1, color: NES.darkRed },
    { col: 120, h: 2, color: NES.olive },
    { col: 126, h: 3, color: NES.darkGreen },
  ];
  for (const b of bottles) {
    const top = m.prop(K.syrupBottle(b.h, b.color), b.col, BAR_SHELF);
    m.pointPx('lift', (b.col + 1) * TILE, top * TILE); // помпа по центру горлышка
  }
  m.pointPx('pickup', 127 * TILE, TILE, { kind: 'star' }); // над третьей бутылкой, трудно достать
  tc(117, 3);
  tc(123, 2);
  enemy('asterisk', 124, 1);
  pair(132, TOP_FLOOR, 'timecode', null);
  enemy('barista', 136, TOP_FLOOR);
  m.paint((p) => K.exitDoor(p, 140 * TILE, TOP_FLOOR * TILE));
  m.zone('exit', 141 * TILE, (TOP_FLOOR - 3) * TILE, TILE, 3 * TILE);

  // ——— Камера ———
  m.segment('right', 0, 15 * TILE, 112 * TILE, 15 * TILE);
  m.segment('up', 96 * TILE, 0, 16 * TILE, 30 * TILE);
  m.segment('right', 96 * TILE, 0, 48 * TILE, 15 * TILE);
  return m;
}
