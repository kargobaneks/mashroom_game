// Уровень 1, часть 1-1: «Сытая Москва» — зал модной кофейни (в оригинале — зал ресторана).
// Дальше: 1-2 кухня, 1-3 мойка, 1-4 подвал с ареной.
// Структура по правилам зала оригинала, но своя раскладка и мебель:
//   • два яруса: нижний — стулья (сиденье y=192) и столы (y=160) на высоких ножках, между ними
//     провалы, пола нет; верхний — подоконник (y=96) под окнами, необязательный путь с наградой;
//   • предметы на столах (кружки, стаканы, сахарницы) — ступеньки на подоконник; высоты кратны 32,
//     под наш прыжок (~38 px);
//   • ящики всегда парами: горизонтально на подоконнике/столе или стопкой у края платформы;
//   • рядом с каждым врагом есть ящики; на экране не больше одного летуна (звёздочка) высоко
//     и одного ходока (бот, бариста) на поверхности; первый экран без врагов;
//   • первые ящики учат: под обоими спрятаны таймкоды; примерно каждый четвёртый — с сюрпризом,
//     кофе — только перед боссом;
//   • таймкоды размечают маршрут: дугами над провалами, на подоконнике, столбиком в шахте.
// Сетка 128 × 15 тайлов, экран — 16 × 15. В конце — служебная дверь (выход части).
import * as A from './cafe-art.mjs';
import * as K from './kitchen-art.mjs';
import { MapBuilder, TILE } from './lib.mjs';

/** Строки (верх поверхности, тайлы): на что опирается предмет. */
const ROW = {
  chair: 12, // y = 192
  table: 10, // y = 160
  onTable: 8, // верх кружки/стакана, y = 128
  sill: 6, // y = 96
};

export function buildLevel1Hall() {
  const m = new MapBuilder(128, 15);
  const SEAT = ROW.chair;
  const TOP = ROW.table;
  const SILL = ROW.sill;

  const box = (col, row, contains) =>
    m.point('item', col, row, contains ? { kind: 'box', contains } : { kind: 'box' });
  /** Стопка из двух ящиков у края платформы. */
  const stack = (col, row, topContains) => {
    box(col, row);
    box(col, row - 1, topContains);
  };
  /** Горизонтальная пара. */
  const pair = (col, row, a, b) => {
    box(col, row, a);
    box(col + 1, row, b);
  };
  const enemy = (kind, col, row) => m.point('enemy', col, row, { kind });
  const tc = (col, row) => m.point('pickup', col, row, { kind: 'timecode' });
  const chair = (col, back = 'left') => m.prop(A.chair(4, back), col, SEAT + 1);
  const table = (col, w = 7) => m.prop(A.table(w), col, TOP + 1);
  const onTable = (prop, col) => m.prop(prop, col, TOP);
  const sill = (from, to) => {
    m.paint((p) => {
      for (let x = from * TILE; x < (to + 1) * TILE; x += 8 * TILE) {
        A.hallWindow(p, x + 6, Math.min(8 * TILE, (to + 1) * TILE - x) - 12, SILL * TILE);
      }
    });
    m.prop(A.sill(to - from + 1), from, SILL + 1);
  };

  // ——— Фоны ———
  m.paint((p) => {
    A.hallWall(p, 0, 0, 128 * TILE, 15 * TILE);
    p.rect(127 * TILE, 0, TILE, 15 * TILE, 0x000000);
  });
  m.solid(127, 127, 0, 14);

  // Подоконники верхнего яруса (окна рисуются вместе с ними).
  sill(8, 43);
  sill(58, 84);
  sill(100, 121);

  // ——— Экран 0 (0–15): старт. Врагов нет, первые ящики — с таймкодами внутри ———
  chair(0);
  m.point('spawn', 2, SEAT);
  m.point('respawn', 2, SEAT);
  table(5);
  onTable(A.latteCup, 6); // ступенька на подоконник
  onTable(A.sugar, 10);
  pair(8, TOP, 'timecode', 'timecode');
  chair(13, 'right');
  tc(12, 10);
  tc(12, SILL);
  tc(13, SILL);

  // ——— Экран 1 (16–31): первая звёздочка-сноска ———
  chair(18);
  stack(18, SEAT, 'timecode');
  table(23);
  onTable(A.laptop, 24);
  onTable(A.icedLatte, 28);
  pair(25, SILL);
  enemy('asterisk', 26, 3);
  tc(22, 10);
  tc(26, 9);
  for (const c of [19, 20, 21]) tc(c, SILL);

  // ——— Экран 2 (32–47): бот на столе ———
  chair(31, 'right');
  stack(34, SEAT);
  table(36);
  onTable(A.croissant, 37);
  onTable(A.latteCup, 40);
  pair(38, SILL, null, 'timecode');
  enemy('bot', 39, TOP);
  enemy('asterisk', 45, 2);
  tc(35, 10);
  for (const c of [33, 34, 35]) tc(c, SILL);

  // ——— Экран 3 (48–63): бариста на стуле ———
  chair(44);
  pair(45, SEAT, 'timecode', null);
  chair(49, 'right');
  enemy('barista', 51, SEAT);
  table(54);
  stack(60, TOP);
  onTable(A.avocadoToast, 55);
  onTable(A.sugar, 59); // ступенька на второй подоконник
  tc(48, 10);
  tc(53, 9);
  for (const c of [60, 61, 62]) tc(c, SILL);

  // ——— Экран 4 (64–79): звёздочка и бот на подоконнике ———
  chair(62);
  chair(67, 'right');
  stack(67, SEAT);
  table(72);
  onTable(A.latteCup, 73);
  onTable(A.laptop, 76);
  pair(70, SILL, null, 'timecode');
  enemy('asterisk', 68, 2);
  enemy('bot', 74, SILL);
  tc(66, 10);
  tc(71, 10);
  for (const c of [77, 78, 79]) tc(c, SILL);

  // ——— Экран 5 (80–95): дуга таймкодов с края подоконника, бот на стуле ———
  chair(80);
  pair(81, SEAT, 'timecode', null);
  chair(85, 'right');
  enemy('bot', 86, SEAT);
  enemy('asterisk', 90, 3);
  for (const [c, r] of [
    [84, 6],
    [85, 7],
    [86, 8],
    [86, 9],
    [87, 10],
    [87, 11],
  ])
    tc(c, r);
  table(90);
  onTable(A.icedLatte, 91);
  onTable(A.croissant, 93);

  // ——— Экран 6 (96–111): перед боссом — кофе в ящике ———
  pair(95, TOP, 'coffee', null);
  chair(98);
  stack(98, SEAT);
  table(103);
  onTable(A.latteCup, 104);
  onTable(A.sugar, 108); // ступенька на третий подоконник
  enemy('asterisk', 99, 2);
  enemy('bot', 106, SILL);
  tc(97, 10);
  tc(102, 10);
  for (const c of [101, 102, 103]) tc(c, SILL);

  // ——— Экран 7 (112–127): стойка выдачи и служебная дверь на кухню ———
  chair(111, 'right');
  pair(112, SEAT, null, 'coffee');
  m.prop(A.serviceCounter(11), 116, SEAT + 1); // колонки 116–126, твёрдая до низа
  stack(116, SEAT);
  enemy('barista', 119, SEAT);
  enemy('asterisk', 114, 2);
  m.point('pickup', 120, SILL, { kind: 'star' }); // награда верхнего пути
  m.paint((p) => K.exitDoor(p, 123 * TILE, SEAT * TILE));
  // Выход — от дверного проёма до стены, по всей высоте от подоконника: с верхнего пути не перелететь.
  m.zone('exit', 123 * TILE, SILL * TILE, 4 * TILE, (SEAT - SILL) * TILE);

  m.segment('right', 0, 0, 128 * TILE, 15 * TILE);
  return m;
}
