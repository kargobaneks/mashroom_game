// Уровень 7, часть 7-1 «Вход в шахту» — по разбору ROM оригинала
// (docs/refs/level7/LEVEL7_WESTERN_WORLD.md, docs/refs/level7/map_7-1.png): склад с бочками пороха,
// 4 экрана — 0–1 вправо, 2 вверх, 3 вправо к выходу. Враги и ящики — по таблице части 7-1
// (4 дикобраза, 2 моли, 1 моль-пикировщик; 32 ящика блоками 2×2 и рядами по 4, 1 жёлудь — кофе).
// Высоты подобраны под наш прыжок: каждый подъём не выше 32 px. Бочки, балки и полки — oneway.
import { placers } from './common.mjs';
import * as A from './mine-art.mjs';
import { MapBuilder, TILE } from './lib.mjs';

/** Экран → (колонка, строка) экрана на карте 3×2. */
const SCREENS = { 0: [0, 1], 1: [1, 1], 2: [1, 0], 3: [2, 0] };

export function buildLevel7Entrance() {
  const m = new MapBuilder(48, 30);
  const { box } = placers(m);
  const gc = (n, c) => SCREENS[n][0] * 16 + c;
  const gr = (n, r) => SCREENS[n][1] * 15 + r;
  const gx = (n, x) => SCREENS[n][0] * 256 + x;
  const gy = (n, y) => SCREENS[n][1] * 240 + y;

  const art = { beams: [], barrels: [], posts: [] };
  /** Деревянная балка-полка: верх на строке r. */
  const beam = (n, r, c0, c1) => {
    m.oneway(gc(n, c0), gc(n, c1), gr(n, r));
    art.beams.push([gx(n, c0 * TILE), gy(n, r * TILE), (c1 - c0 + 1) * TILE]);
  };
  /** Бочка: верх на строке top, стоит на строке bottom. */
  const barrel = (n, c0, c1, top, bottom, big = false) => {
    m.oneway(gc(n, c0), gc(n, c1), gr(n, top));
    art.barrels.push([
      gx(n, c0 * TILE),
      gy(n, bottom * TILE),
      (c1 - c0 + 1) * TILE,
      (bottom - top) * TILE,
      big,
    ]);
  };
  const B = (n, c, r, contains) => box(gc(n, c), gr(n, r), contains);
  const block = (n, c, r, left = null, right = null) => {
    for (const [cc, k] of [
      [c, left],
      [c + 1, right],
    ]) {
      B(n, cc, r, k);
      B(n, cc, r - 1, k);
    }
  };
  const tc = (n, c, r) => m.point('pickup', gc(n, c), gr(n, r), { kind: 'timecode' });
  const E = (n, kind, c, r) => m.point('enemy', gc(n, c), gr(n, r), { kind });

  // ——— Экран 0: небо слева, бочки пороха, ряд ящиков на полке ———
  m.point('spawn', gc(0, 2), gr(0, 13));
  m.point('respawn', gc(0, 2), gr(0, 13));
  m.solid(gc(0, 0), gc(1, 15), gr(0, 13), gr(0, 14));
  barrel(0, 3, 4, 11, 13);
  barrel(0, 6, 8, 9, 13, true);
  block(0, 7, 9, null, 'timecode');
  barrel(0, 11, 13, 9, 13, true);
  block(0, 12, 9, 'timecode', null);
  beam(0, 5, 8, 13);
  B(0, 9, 5);
  B(0, 10, 5, 'timecode');
  B(0, 11, 5);
  B(0, 12, 5, 'timecode');

  // ——— Экран 1: низ подъёма. Бочки, балка с бочками, уступы вверх ———
  E(1, 'porcupine', 8, 13);
  E(1, 'diveMoth', 8, 2);
  barrel(1, 11, 14, 11, 13, true);
  // Ступень к балке — малая бочка на большой (не ящики: их бросают, и подъём пропадал).
  barrel(1, 14, 15, 9, 11);
  block(1, 11, 11);
  beam(1, 7, 6, 15);
  barrel(1, 7, 11, 5, 7);
  E(1, 'porcupine', 11, 5);
  beam(1, 3, 3, 6);
  beam(1, 1, 9, 12);
  for (const [c, r] of [
    [2, 3],
    [3, 3],
    [2, 6],
    [3, 6],
  ])
    tc(1, c, r);

  // ——— Экран 2: подъём (над экраном 1), небо, моль, полка с блоком, столбик ящиков ———
  beam(2, 14, 4, 7);
  barrel(2, 9, 10, 12, 14);
  barrel(2, 11, 13, 10, 14, true);
  E(2, 'moth', 6, 10);
  beam(2, 8, 0, 9);
  block(2, 2, 8);
  tc(2, 8, 5);
  tc(2, 8, 7);
  beam(2, 6, 10, 11);
  beam(2, 4, 12, 15);
  E(2, 'porcupine', 12, 4);
  // Столбик из 4 ящиков — у левого края полки (у нас иначе перегородил бы проход вправо).
  B(2, 0, 8);
  B(2, 0, 7, 'timecode');
  B(2, 0, 6, 'timecode');
  B(2, 0, 5);

  // ——— Экран 3: полка, бочки, выход справа наверху ———
  beam(3, 4, 0, 3);
  barrel(3, 4, 7, 8, 13, true);
  block(3, 4, 8, 'coffee', null);
  E(3, 'moth', 10, 4);
  barrel(3, 9, 12, 8, 13);
  tc(3, 7, 6);
  tc(3, 9, 6);
  m.solid(gc(3, 0), gc(3, 15), gr(3, 13), gr(3, 14));
  E(3, 'porcupine', 7, 13);
  for (const [c, k] of [
    [8, null],
    [9, null],
    [10, 'timecode'],
    [11, 'timecode'],
  ])
    B(3, c, 13, k);
  beam(3, 6, 13, 15);
  m.zone('exit', gx(3, 232), gy(3, 64), 24, 32);

  // ——— Арт ———
  m.paint((p) => {
    A.rockWall(p, 0, 0, m.cols * TILE, m.rows * TILE);
    A.sky(p, gx(0, 0), gy(0, 32), 160, 176);
    A.sky(p, gx(2, 0), gy(2, 32), 192, 96);
    A.cobbles(p, gx(0, 0), gy(0, 208), 512, 32);
    A.cobbles(p, gx(3, 0), gy(3, 208), 256, 32);
    for (const [n, x, y0, y1] of [
      [0, 160, 0, 208],
      [1, 80, 0, 208],
      [1, 176, 112, 208],
      [2, 208, 64, 240],
      [3, 32, 0, 208],
      [3, 208, 96, 208],
    ])
      A.post(p, gx(n, x), gy(n, y0), gy(n, y1));
    A.shovel(p, gx(1, 96), gy(1, 208));
    A.shovel(p, gx(3, 16), gy(3, 208));
  });
  m.decor((p) => {
    for (const [x, y, w] of art.beams) A.beam(p, x, y, w);
    for (const [x, bottom, w, h, big] of art.barrels) A.barrel(p, x, bottom, w, h, big);
  });

  m.segment('right', 0, 240, 512, 240);
  m.segment('up', 256, 0, 256, 480);
  m.segment('right', 256, 0, 512, 240);
  m.pointPx('respawn', gx(1, 40), gy(1, 208));
  m.pointPx('respawn', gx(2, 120), gy(2, 128));
  return m;
}
