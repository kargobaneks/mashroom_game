// Уровень 3, часть 3-2: трюм (по кадрам уровня 3 оригинала: оливковые клёпаные стены,
// иллюминаторы, полоса труб с вентилями, внизу — стена в рейках, горы мешков, красные ящики,
// стальные полки; спуск — металлические ярусы внутри корабля).
//   • экран 0 — спуск из люка по стальным полкам зигзагом;
//   • экраны 0–5 (низ) — вправо по трюму до двери в шахту (арена Бордачёва — часть 3-3).
// Мешки и полки — мебель (oneway). Всё, на что надо запрыгнуть, — не выше 32 px.
// Сетка 96 × 30: строки 0–14 — верх спуска, 15–29 — трюм, пол — строка 28 (208 на экране).
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';
import * as S from './ship-art.mjs';

export function buildLevel3Hold() {
  const m = new MapBuilder(96, 30);
  const { box, pair, enemy, tc } = placers(m);
  const FLOOR = 28;
  const TOP = 15; // первая строка трюма
  const W = m.cols * TILE;
  const y = (row) => row * TILE;

  m.paint((p) => {
    // Спуск: тёмная шахта с трубами и иллюминаторами.
    S.hullWall(p, 0, 0, 16 * TILE, y(TOP) + 112);
    S.clampPipe(p, 12, 0, y(FLOOR));
    S.porthole(p, 200, 60, 16);
    S.porthole(p, 56, 200, 16);
    S.lamp(p, 226, 300);
    // Трюм: верх — борт с иллюминаторами, полоса вентилей, низ — стена в рейках.
    S.hullWall(p, 16 * TILE, y(TOP), W - 16 * TILE, 112);
    for (let x = 20 * TILE; x < W; x += 160) S.porthole(p, x + 40, y(TOP) + 52, 18);
    for (let x = 20 * TILE + 114; x < W; x += 320) S.lamp(p, x, y(TOP) + 42);
    S.valveBand(p, 0, y(TOP) + 112, W);
    S.stripedWall(p, 0, y(TOP) + 130, W, y(FLOOR) - y(TOP) - 130);
    S.deckFloor(p, 0, y(FLOOR), W, 2 * TILE);
  });
  m.solid(0, m.cols - 1, FLOOR, FLOOR + 1);
  const shelf = (col, w, row) => m.prop(S.steelShelf(w), col, row + 1);
  const sacks = (col, w, h) => m.prop(S.sacks(w, h), col, FLOOR);
  const crate = (col, w, row = FLOOR) => m.prop(S.woodCrate(w, 2), col, row);

  // ——— Экран 0: спуск из люка ———
  shelf(1, 6, 3); // 1–6, верх y = 48 — сюда спрыгнули из люка
  m.point('spawn', 3, 3);
  m.point('respawn', 3, 3);
  shelf(9, 6, 7); // 9–14
  shelf(2, 6, 11); // 2–7
  shelf(8, 6, 15); // 8–13
  shelf(1, 6, 19); // 1–6
  shelf(9, 6, 23); // 9–14
  tc(11, 7);
  tc(12, 7);
  tc(10, 15);
  tc(11, 15);
  box(12, 23, 'timecode');
  enemy('asterisk', 13, 13);

  // ——— Трюм, экран 0 (0–15): мешки, коробки ———
  m.point('respawn', 3, FLOOR);
  sacks(5, 4, 2); // 5–8, верх 176 на экране
  pair(10, FLOOR, null, 'coffee');
  enemy('crab', 14, FLOOR);

  // Экран 1 (16–31): мешки ступенькой → полка → таймкоды, чайка.
  sacks(17, 4, 2); // 17–20, верх 176
  sacks(21, 3, 4); // 21–23, верх 144
  shelf(25, 4, 22); // 25–28, верх 112
  tc(26, 22);
  tc(27, 22);
  enemy('gull', 30, 18);

  // Экран 2 (32–47): штабель ящиков, коробки, боты, звёздочка.
  crate(33, 4); // 33–36, верх 176
  crate(35, 4, 26); // 35–38, верх 144
  tc(36, 24);
  tc(37, 24);
  pair(40, FLOOR, 'timecode', null);
  enemy('bot', 43, FLOOR);
  enemy('bot', 45, FLOOR);
  enemy('asterisk', 46, 20);

  // Экран 3 (48–63): лесенка полок к звезде, краб внизу.
  shelf(49, 4, 26); // 49–52, верх 176
  shelf(54, 4, 24); // 54–57, верх 144
  shelf(59, 4, 22); // 59–62, верх 112
  m.point('pickup', 61, 20, { kind: 'star' });
  tc(55, 24);
  enemy('crab', 56, FLOOR);

  // Экран 4 (64–79): такелажник на тали под потолком, мешки, кофе.
  m.decor((p) => {
    // Балка тали под потолком.
    p.rect(66 * TILE, y(TOP) + 2, 8 * TILE, 8, S.HULL_DARK);
    p.hline(66 * TILE, y(TOP) + 2, 8 * TILE, 0x000000);
  });
  m.pointPx('enemy', 70 * TILE, y(24), { kind: 'rigger' });
  sacks(66, 4, 2); // 66–69, верх 176
  pair(73, FLOOR, 'coffee', null);
  tc(67, 26);
  tc(68, 26);

  // Экран 5 (80–95): последние мешки, краб, дверь в шахту.
  sacks(81, 4, 2); // 81–84
  enemy('crab', 87, FLOOR);
  S.placeHatchDoor(m, 92, FLOOR);

  m.segment('down', 0, 0, 16 * TILE, 30 * TILE);
  m.segment('right', 0, y(TOP), W, 15 * TILE);
  return m;
}
