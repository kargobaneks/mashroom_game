// Уровень 3, часть 3-1: палуба грузового корабля (по кадрам уровня 3 оригинала — On the Ship:
// небо, море за леерами, стальной палубный настил, большие деревянные ящики, мачта с блоком и
// «обезьяной в ведре», щит со спасательными кругами).
// ~6 экранов вправо. В воду упасть нельзя — настил сплошной (как в оригинале).
// Ящики — мебель (oneway): сквозь проходят, на верх встают; высота ящика 32 px — запрыгнуть.
// Враги уровня 3 по ТЗ: контейнерный краб, чайка-дрон; бот-такелажник в люльке на мачте —
// на месте обезьяны в ведре. В конце — дверь в надстройку, за ней трюм (часть 3-2).
// Сетка 96 × 15, пол — строка 13 (y = 208).
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';
import * as S from './ship-art.mjs';

export function buildLevel3Deck() {
  const m = new MapBuilder(96, 15);
  const { box, pair, enemy, tc } = placers(m);
  const FLOOR = 13;
  const W = m.cols * TILE;
  const MASTS = [36, 68];

  m.paint((p) => {
    S.sky(p, 0, 0, W, 152);
    S.sea(p, 0, 152, W, 56);
    S.railing(p, 0, W, 140, FLOOR * TILE);
    for (const c of MASTS) S.mast(p, c * TILE, 0, FLOOR * TILE);
    S.cabin(p, 89 * TILE, 4 * TILE, 7 * TILE, (FLOOR - 4) * TILE);
    S.deckFloor(p, 0, FLOOR * TILE, W, 2 * TILE);
  });
  m.decor((p) => {
    S.lifeRings(p, 25 * TILE, 152);
    S.lifeRings(p, 74 * TILE, 152);
  });
  m.solid(0, m.cols - 1, FLOOR, FLOOR + 1);
  const crate = (col, w, row = FLOOR) => m.prop(S.woodCrate(w, 2), col, row);
  const rigger = (mastCol, bottomRow) =>
    m.pointPx('enemy', mastCol * TILE + 44, bottomRow * TILE, { kind: 'rigger' });

  // Экран 0 (0–15): старт, первые коробки, ящик, краб.
  m.point('spawn', 2, FLOOR);
  m.point('respawn', 2, FLOOR);
  pair(5, FLOOR, 'timecode', null);
  crate(9, 4); // 9–12, верх y = 176
  tc(10, 11);
  tc(11, 11);
  enemy('crab', 14, FLOOR);

  // Экран 1 (16–31): штабель ящиков в два яруса, щит с кругами, чайка.
  crate(17, 4); // 17–20
  crate(21, 4); // 21–24
  crate(19, 4, 11); // 19–22, верх y = 144
  tc(20, 9);
  tc(21, 9);
  box(24, 11);
  enemy('gull', 28, 4);

  // Экран 2 (32–47): мачта с такелажником в люльке, ящик под ним, кофе, краб.
  rigger(MASTS[0], 10);
  crate(39, 4); // 39–42 — с него гайкой не промахнуться, но и его достать броском
  tc(40, 11);
  pair(44, FLOOR, null, 'coffee');
  enemy('crab', 46, FLOOR);

  // Экран 3 (48–63): лесенка ящиков к звезде, чайка.
  crate(49, 4); // 49–52, верх 176
  crate(53, 6); // 53–58, верх 176
  crate(54, 4, 11); // 54–57, верх 144
  crate(55, 2, 9); // 55–56, верх 112
  m.point('pickup', 56, 7, { kind: 'star' });
  tc(50, 11);
  tc(51, 11);
  enemy('gull', 61, 3);

  // Экран 4 (64–79): вторая мачта с такелажником, боты-комментаторы, круги.
  pair(65, FLOOR, null, 'timecode');
  rigger(MASTS[1], 10);
  crate(71, 4); // 71–74
  tc(72, 11);
  tc(73, 11);
  enemy('bot', 76, FLOOR);
  enemy('bot', 78, FLOOR);

  // Экран 5 (80–95): последний ящик, кофе, краб, дверь в надстройку → трюм.
  crate(81, 4); // 81–84
  box(83, 11, 'timecode');
  pair(86, FLOOR, 'coffee', null);
  enemy('crab', 89, FLOOR);
  S.placeHatchDoor(m, 92, FLOOR);

  m.segment('right', 0, 0, W, 15 * TILE);
  return m;
}
