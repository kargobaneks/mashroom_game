// Уровень 5, часть 5-1: склад архива — по кадрам склада с привидениями оригинала
// (docs/refs/level_5_part_1..7.png): синяя стена в трещинах, цепные колонны с лампами-горгульями,
// красные балки с ящиками, широкий красный пол, деревянные шкафы-ступени, свечи на ножках
// (по полу и вверх ногами под балками), синие призраки-огоньки (у нас — призраки удалённых
// комментариев, ТЗ), подъём по балкам, большая дверь «22» — в портретный зал (часть 5-2).
//   A. вправо по полу, 5 экранов (строки 30–44, пол — строка 43);
//   B. вверх по балкам, 2 экрана (колонки 64–79);
//   C. вправо по верхнему ярусу к двери, 1 экран (строки 15–29, пол — строка 24 = 144 на экране).
// Балки и шкафы — oneway; сплошной только пол. Всё, на что прыгать, — не выше 32 px.
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';
import * as S from './warehouse-art.mjs';

export function buildLevel5Warehouse() {
  const m = new MapBuilder(96, 45);
  const { box, pair, enemy, tc } = placers(m);
  const y = (row) => row * TILE;
  const FA = 43;
  const FC = 24;
  const A = (r) => 30 + r; // строка экрана в полосе A → строка карты

  const girder = (col, w, top) => m.prop(S.girder(w), col, top + 1);
  const cabinet = (col, w, h, floorRow, doors = false) =>
    m.prop(S.cabinet(w, h, doors), col, floorRow);
  // Свеча вверх ногами под балкой (верх балки — top): верх свечи у низа балки.
  const ceilCandle = (col, top) =>
    m.pointPx('enemy', col * TILE + 8, y(top + 1) + 20, { kind: 'candleCeil' });
  const ghost = (col, row) => m.point('enemy', col, row, { kind: 'commentGhost' });

  // ——— Фон ———
  m.paint((p) => {
    S.wall(p, 0, 0, m.cols * TILE, m.rows * TILE);
    for (const [col, row] of [
      [5, 32],
      [3, 39],
      [19, 31],
      [27, 38],
      [37, 32],
      [45, 39],
      [56, 31],
      [70, 33],
      [75, 40],
      [66, 22],
      [77, 17],
      [86, 18],
      [91, 16],
    ])
      S.crack(p, col * TILE, y(row));
    // Цепная балка поперёк — на высоте ламп.
    S.chainBeam(p, 0, 80 * TILE, y(A(7)));
    S.chainBeam(p, 64 * TILE, 96 * TILE, y(19));
    for (const col of [1, 10, 18, 27, 36, 45, 54, 63, 72, 81, 90]) {
      S.chainPillar(p, col * TILE, col >= 64 ? 0 : y(30), col >= 80 ? y(FC) : y(FA));
    }
    S.floor(p, 0, y(FA), 80 * TILE, 2 * TILE);
    S.floor(p, 80 * TILE, y(FC), 16 * TILE, 6 * TILE);
  });
  m.decor((p) => {
    for (const col of [10, 27, 45, 63]) S.gargoyleLamp(p, col * TILE + 8, y(A(3)));
    for (const col of [72, 90]) S.gargoyleLamp(p, col * TILE + 8, y(16));
  });
  m.solid(0, 79, FA, FA + 1);
  m.solid(80, 95, FC, FC + 5);

  // ——— A, экран 0 (0–15): старт, ящики на полу, низкая балка с ящиком (кадр 1) ———
  m.point('spawn', 3, FA);
  m.point('respawn', 3, FA);
  pair(6, FA, null, 'timecode');
  girder(9, 7, A(11)); // 9–15, верх 176 (32 над полом)
  box(13, A(11));
  tc(10, A(9));
  tc(11, A(9));

  // Экран 1 (16–31): балка дальше, выше — балка с двумя ящиками, свеча на полу (кадры 1–2).
  girder(16, 6, A(11)); // 16–21
  girder(23, 8, A(9)); // 23–30, верх 144
  pair(28, A(9), null, 'coffee');
  tc(24, A(7));
  tc(25, A(7));
  enemy('candle', 26, FA);
  box(31, FA);

  // Экран 2 (32–47): низкая и высокая балки, под высокой — свеча вверх ногами (кадр 3–4).
  girder(33, 5, A(11)); // 33–37
  girder(38, 7, A(9)); // 38–44
  ceilCandle(41, A(9));
  pair(42, A(9));
  tc(39, A(7));
  enemy('candle', 46, FA);

  // Экран 3 (48–63): шкафы-ступени (кадры 3–5): по бокам — на 16 px, посередине — на 32 px.
  cabinet(48, 3, 1, FA); // 48–50, верх 192
  cabinet(51, 4, 2, FA, true); // 51–54, верх 176, дверцы
  cabinet(55, 3, 1, FA); // 55–57
  pair(52, A(11));
  girder(53, 7, A(9)); // 53–59 — над шкафами
  tc(56, A(7));
  tc(57, A(7));
  ghost(61, A(5));
  cabinet(59, 3, 1, FA); // 59–61
  cabinet(62, 2, 2, FA); // 62–63, верх 176

  // ——— Экран 4 (64–79) — низ подъёма B: балки зигзагом (кадр 6) ———
  m.point('respawn', 66, FA); // B
  const B = [
    [72, 8, 41],
    [64, 7, 39],
    [73, 7, 37],
    [64, 8, 35],
    [72, 8, 33],
    [65, 7, 31],
    [72, 8, 29],
    [64, 7, 27],
    [72, 8, 25],
  ];
  for (const [col, w, top] of B) girder(col, w, top);
  pair(65, 35, null, 'timecode');
  tc(75, 36);
  enemy('candle', 75, 29);
  ceilCandle(67, 31);
  ghost(78, 34);
  tc(66, 26);
  tc(67, 26);
  // Звезда — на верхнем краю, с самой высокой балки слева (прыжок вверх-влево).
  m.point('pickup', 64, 24, { kind: 'star' });

  // ——— C (64–95, верх): пол, балки над дверью, дверь «22» (кадр 7) ———
  m.point('respawn', 75, 25); // C — на верхней балке подъёма
  girder(80, 5, 22); // 80–84, верх на 32 над полом
  girder(83, 6, 20); // 83–88 — выше, до двери
  ceilCandle(86, 20);
  tc(85, 18);
  tc(86, 18);
  ghost(94, 17);
  enemy('candle', 82, FC);
  S.placeBigDoor(m, 89, FC); // 89–94

  // ——— Камера ———
  m.segment('right', 0, y(30), 80 * TILE, 15 * TILE);
  m.segment('up', 64 * TILE, y(15), 16 * TILE, 30 * TILE);
  m.segment('right', 64 * TILE, y(15), 32 * TILE, 15 * TILE);
  return m;
}
