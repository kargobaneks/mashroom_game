// Уровень 9, часть 9-4 «Коридор с пушками» — по разбору ROM оригинала
// (docs/refs/level9/LEVEL9_FATCAT_LAIR.md, карта docs/refs/level9/map_9-4.png): 5 экранов
// вправо, низкий коридор. Под потолком — рельс, по нему ездят пушки (экраны 1–4) и стреляют
// шаром, который скачет по коридору как бильярдный. 21 ящик стопками прямо в коридоре —
// инструмент и препятствие; таймкодов и бонусов нет (как в оригинале).
//
// Пол — строка 10, потолок — до строки 4 (коридор 80 px): на стопку из двух ящиков (32 px)
// запрыгивают, сверху до потолка ещё 48 px. Пушку сбивает ящик, брошенный вверх.
// Контрольная точка — экран 2.
import { lairKit } from './lair-kit.mjs';
import { MapBuilder } from './lib.mjs';

const SCREENS = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [i, [i, 0]]));

export function buildLevel9Cannons() {
  const m = new MapBuilder(5 * 16, 15);
  const k = lairKit(m, SCREENS);
  const { wall, box } = k;
  const stack = (n, c) => {
    box(n, c, 10);
    box(n, c, 9);
  };

  for (let n = 0; n < 5; n++) {
    wall(n, 0, 15, 0, 4);
    wall(n, 0, 15, 10, 14);
    k.rail(n, 5);
  }
  for (let n = 1; n < 5; n++) k.cannon(n, 2, 5);

  // ——— Экран 0: блок 2×2, стопка ———
  m.point('spawn', k.gc(0, 1), k.gr(0, 10));
  k.respawn(0, 1, 10);
  k.block2(0, 4, 10);
  stack(0, 14);

  // ——— Экран 1: стопка, пара на полу ———
  stack(1, 4);
  box(1, 14, 10);
  box(1, 15, 10);

  // ——— Экран 2: стопка ———
  stack(2, 4);

  // ——— Экран 3: пара на полу, две стопки ———
  box(3, 0, 10);
  box(3, 1, 10);
  stack(3, 7);
  stack(3, 14);

  // ——— Экран 4: стопка, ящик, выход ———
  stack(4, 2);
  box(4, 8, 10);
  k.exit(4, 10);

  k.finish();

  m.segment('right', 0, 0, 3 * 256, 240);
  m.segment('right', 2 * 256, 0, 3 * 256, 240);
  k.respawn(2, 1, 10);
  return m;
}
