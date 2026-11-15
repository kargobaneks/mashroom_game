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
  const { pair, enemy, tc } = placers(m);
  const FLOOR = 27; // пол низа, y = 432 (192 внутри экрана)
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

  // ——— Экраны 0–5: ряд тумб и плит вдоль стены ———
  // Ярусы как в зале: пол в проходах между тумбами (бариста-боты), столешницы на тумбах
  // (y = 400, на 32 выше пола), полки над столешницами (y = 368). Всё стоит где ему место:
  // тарелки и кастрюли — на столешницах, банки и посуда — на полках, кастрюля — на плите.
  const TOP = FLOOR - 2; // верх столешницы
  const SHELF = TOP - 2; // полка над столешницей
  const counter = (col, w) => m.prop(K.counter(w), col, FLOOR);
  const stove = (col) => {
    m.decor((p) => K.hood(p, col * TILE, (SHELF - 4) * TILE));
    m.prop(K.stove, col, FLOOR);
  };
  const shelf = (col, w, load) => m.prop(K.shelf(w, load), col, SHELF + 1);

  // Экран 0 (0–15): холодильник у входа, первая тумба. Первые ящики — с таймкодами.
  m.point('spawn', 2, FLOOR);
  m.point('respawn', 2, FLOOR);
  m.decor((p) => K.fridge(p, 0, FLOOR * TILE));
  counter(5, 8); // 5–12
  pair(6, TOP, 'timecode', 'timecode');
  m.prop(K.plateStack(1), 11, TOP); // стопка тарелок на столешнице — ступенька к полке
  shelf(9, 5, 'jars'); // 9–13
  tc(10, SHELF);
  tc(11, SHELF - 1);
  enemy('barista', 14, FLOOR); // проход 13–15

  // Экран 1 (16–31): плита, тумба с кастрюлей, полка с посудой.
  stove(16); // 16–18
  counter(19, 8); // 19–26
  shelf(20, 5, 'pots'); // 20–24
  pair(21, SHELF, null, 'timecode');
  m.prop(K.bigPot, 25, TOP);
  enemy('asterisk', 23, 19);
  tc(17, TOP - 2);
  tc(28, TOP);
  tc(29, TOP + 1); // дуга над проходом 27–29

  // Экран 2 (32–47): тумба с ботом, плита, тумба с полкой.
  counter(30, 8); // 30–37
  pair(31, TOP, null, 'coffee');
  enemy('bot', 34, TOP);
  stove(38); // 38–40
  counter(41, 8); // 41–48
  shelf(42, 5, 'jars');
  pair(43, SHELF, 'timecode', null);
  enemy('asterisk', 46, 19);
  tc(39, TOP - 2);

  // Экран 3 (48–63): проход с баристой, тумба с кастрюлей, плита.
  enemy('barista', 50, FLOOR); // проход 49–51
  tc(50, TOP);
  counter(52, 8); // 52–59
  pair(53, TOP);
  m.prop(K.bigPot, 57, TOP);
  tc(57, TOP - 3);
  stove(60); // 60–62

  // Экран 4 (64–79): тумба с ботом и полкой, проход.
  counter(63, 8); // 63–70
  pair(64, TOP, null, 'timecode');
  enemy('bot', 68, TOP);
  shelf(66, 5, 'pots');
  tc(67, SHELF);
  tc(68, SHELF);
  enemy('asterisk', 77, 19);
  tc(72, TOP);
  tc(73, TOP + 1); // дуга над проходом 71–73

  // Экран 5 (80–95): тумба, проход с баристой, последняя тумба перед подъёмом.
  counter(74, 8); // 74–81
  pair(75, TOP, 'coffee', null);
  m.prop(K.plateStack(1), 80, TOP);
  enemy('barista', 83, FLOOR); // проход 82–84
  counter(85, 8); // 85–92
  shelf(86, 5, 'jars');
  pair(87, SHELF);
  tc(89, SHELF);
  tc(90, SHELF);

  // ——— Экран 6 (96–111): подъём — полки зигзагом ———
  m.decor((p) => {
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
  K.placeExitDoor(m, 141, TOP_FLOOR);

  // ——— Камера ———
  m.segment('right', 0, 15 * TILE, 112 * TILE, 15 * TILE);
  m.segment('up', 96 * TILE, 0, 16 * TILE, 30 * TILE);
  m.segment('right', 96 * TILE, 0, 48 * TILE, 15 * TILE);
  return m;
}
