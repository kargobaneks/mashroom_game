// Уровень 2, часть 2-1: «Серверная» (по структуре уровня 2 оригинала — канализации: вправо
// по полу с пропастями, трубы как платформы, ящики на трубах, вертикальный спуск, снова вправо).
//   • экраны 0–5 (верх) — вправо: стойки, медные трубы, кабельные лотки, три пропасти
//     (средняя — под лотком-мостом); заголовки летят навстречу, змейки ползут по полу;
//   • экран 6 — спуск в шахту по лоткам зигзагом;
//   • экраны 7–8 (низ) — вправо до двери в машинный зал (арена — часть 2-2).
// Прыжок ~40 px: всё, на что надо запрыгнуть, — не выше 32 px над опорой, пропасти — до 48 px.
// Сетка 144 × 30: верх (строки 0–14) — экраны 0–6, низ (строки 15–29) — экраны 6–8.
import { NES } from './pixels.mjs';
import * as S from './server-art.mjs';
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel2Server() {
  const m = new MapBuilder(144, 30);
  const { box, pair, enemy, tc } = placers(m);
  const FLOOR = 13; // пол верха, y = 208
  const FLOOR_B = 28; // пол низа, y = 448 (208 внутри экрана)
  const PITS = [
    [26, 28],
    [51, 57],
    [77, 79],
  ];

  // ——— Фоны ———
  m.paint((p) => {
    p.rect(0, 0, m.cols * TILE, m.rows * TILE, NES.black);
    S.wall(p, 0, 0, 112 * TILE, FLOOR * TILE);
    S.raisedFloor(p, 0, FLOOR * TILE, 105 * TILE, 2 * TILE);
    for (const [a, b] of PITS) S.pit(p, a * TILE, FLOOR * TILE, (b - a + 1) * TILE, 2 * TILE);
    // Шахта и низ.
    S.shaftWall(p, 97 * TILE, 15 * TILE, 13 * TILE, 13 * TILE);
    S.wall(p, 110 * TILE, 15 * TILE, 34 * TILE, 13 * TILE);
    S.raisedFloor(p, 96 * TILE, FLOOR_B * TILE, 48 * TILE, 2 * TILE);
    // Стены шахты и правая стена верха — тёмные блоки.
    p.rect(110 * TILE, 0, 2 * TILE, 15 * TILE, NES.navy);
    p.rect(96 * TILE, 15 * TILE, TILE, 13 * TILE, NES.navy);
    p.rect(143 * TILE, 15 * TILE, TILE, 13 * TILE, NES.navy);
  });
  m.decor((p) => {
    S.bluePipe(p, 12 * TILE, 0, FLOOR * TILE);
    S.bluePipe(p, 60 * TILE, 0, FLOOR * TILE);
    S.bluePipe(p, 90 * TILE, 0, FLOOR * TILE);
    S.bluePipe(p, 128 * TILE, 15 * TILE, FLOOR_B * TILE);
    S.wallMonitor(p, 29 * TILE, 3 * TILE);
    S.wallMonitor(p, 84 * TILE, 3 * TILE);
    S.wallMonitor(p, 133 * TILE, 18 * TILE);
  });
  m.solid(0, 104, FLOOR, FLOOR + 1);
  for (const [a, b] of PITS) m.clear(a, b, FLOOR, FLOOR + 1);
  m.solid(110, 111, 0, 14);
  m.solid(96, 96, 15, 27);
  m.solid(96, 143, FLOOR_B, FLOOR_B + 1);
  m.solid(143, 143, 15, 27);

  const rack = (col, h = 2) => m.prop(S.rack(h), col, FLOOR);
  const pipe = (col, w, row) => m.prop(S.copperPipe(w, FLOOR * TILE), col, row + 1);
  const tray = (col, w, row) => m.prop(S.cableTray(w), col, row + 1);

  // Экран 0 (0–15): стойка, лоток над ней, первые ящики — с таймкодом.
  m.point('spawn', 2, FLOOR);
  m.point('respawn', 2, FLOOR);
  rack(4); // 4–5, верх y = 176
  tray(3, 5, 9); // 3–7, y = 144
  tc(5, 9);
  tc(6, 9);
  pair(8, FLOOR, 'timecode', null);
  enemy('bot', 13, FLOOR);

  // Экран 1 (16–31): стойка → труба с ящиками (как в оригинале), пропасть.
  rack(17); // 17–18
  pipe(19, 6, 9); // 19–24, y = 144
  pair(21, 9, null, 'coffee');
  tc(20, 9);
  for (const [c, r] of [
    [26, 11],
    [27, 10],
    [28, 11],
  ])
    tc(c, r);
  enemy('headline', 31, 9);

  // Экран 2 (32–47): стойка, длинная труба, змейка по полу, звёздочка.
  rack(33); // 33–34
  pipe(36, 7, 9); // 36–42
  box(40, 9, 'timecode');
  tc(37, 9);
  tc(38, 9);
  enemy('cable', 45, FLOOR);
  enemy('asterisk', 46, 5);

  // Экран 3 (48–63): ящики перед большой пропастью, лоток-мост над ней (с ботом).
  pair(48, FLOOR);
  tray(50, 9, 11); // 50–58, y = 176 — на 32 px выше пола
  enemy('bot', 54, 11);
  tc(52, 11);
  tc(56, 11);
  rack(60);
  enemy('headline', 63, 10);

  // Экран 4 (64–79): лесенка стойка → труба → лоток со звездой; пропасть.
  rack(64); // 64–65, y = 176
  pipe(66, 6, 9); // 66–71, y = 144
  tray(69, 6, 7); // 69–74, y = 112
  m.point('pickup', 73, 7, { kind: 'star' });
  tc(70, 7);
  tc(71, 7);
  enemy('cable', 72, FLOOR);
  for (const [c, r] of [
    [77, 11],
    [78, 10],
    [79, 11],
  ])
    tc(c, r);
  enemy('headline', 79, 8);

  // Экран 5 (80–95): стойки, кофе в ящике, стая ботов.
  rack(81);
  pair(84, FLOOR, 'coffee', null);
  enemy('bot', 88, FLOOR);
  enemy('bot', 91, FLOOR);
  rack(93);
  tc(81, 11);
  tc(82, 11);
  enemy('headline', 95, 10);

  // ——— Экран 6 (96–111): спуск в шахту ———
  m.point('respawn', 100, FLOOR);
  box(101, FLOOR, 'timecode');
  tray(104, 6, 18); // 104–109 — ловит упавшего из люка
  tray(98, 6, 22); // 98–103
  tray(104, 6, 25); // 104–109
  for (const [c, r] of [
    [107, 16],
    [107, 18],
    [100, 22],
    [101, 22],
    [106, 25],
  ])
    tc(c, r);
  pair(105, 25, null, 'timecode');
  enemy('asterisk', 99, 19);

  // ——— Экраны 7–8 (низ, 112–143): к двери машинного зала ———
  m.point('respawn', 99, FLOOR_B);
  const rackB = (col, h = 2) => m.prop(S.rack(h), col, FLOOR_B);
  const pipeB = (col, w, row) => m.prop(S.copperPipe(w, FLOOR_B * TILE), col, row + 1);
  rackB(114);
  pipeB(117, 7, 24); // 117–123, y = 384 (144 внутри экрана)
  pair(119, 24, 'timecode', null);
  tc(117, 24);
  enemy('bot', 121, FLOOR_B);
  enemy('cable', 126, FLOOR_B);
  rackB(131);
  tc(131, 26);
  tc(132, 26);
  enemy('headline', 134, 23);
  enemy('asterisk', 136, 19);
  pair(136, FLOOR_B, null, 'coffee');
  S.placeExitDoor(m, 140, FLOOR_B);

  // ——— Камера ———
  m.segment('right', 0, 0, 112 * TILE, 15 * TILE);
  m.segment('down', 96 * TILE, 0, 16 * TILE, 30 * TILE);
  m.segment('right', 96 * TILE, 15 * TILE, 48 * TILE, 15 * TILE);
  return m;
}
