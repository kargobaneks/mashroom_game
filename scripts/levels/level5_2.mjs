// Уровень 5, часть 5-2: портретный зал — по кадрам оригинала (docs/refs/level_5_part_8..10.png):
// обои с узором, серый деревянный столб, полки вдоль стены с подсвечниками и свечами, красный
// буфет, большой портрет. Свет то и дело гаснет (всё становится тёмно-синими силуэтами, как в
// оригинале). Тайник со звездой (ТЗ) — на нижней планке рамы портрета: туда ведут ящики у столба
// и полка. В конце — Петровский (ТЗ: перед ареной восстанавливает сердца) и проход на арену.
// 3 экрана вправо, пол — строка 13. Полки, буфет, рама — oneway; всё ≤ 32 px.
import { placers } from './common.mjs';
import { NES } from './pixels.mjs';
import { MapBuilder, TILE } from './lib.mjs';
import * as S from './warehouse-art.mjs';

export function buildLevel5Hall() {
  const m = new MapBuilder(48, 15);
  const { box, stack, pair, enemy, tc } = placers(m);
  const F = 13;
  const y = (row) => row * TILE;
  m.properties.flicker = true;

  const shelf = (col, w, row) => m.prop(S.wallShelf(w), col, row + 1);

  m.paint((p) => {
    S.wallpaper(p, 0, 0, m.cols * TILE, y(F));
    S.woodPost(p, 12 * TILE, 0, y(F));
    S.floor(p, 0, y(F), m.cols * TILE, 2 * TILE);
  });
  m.solid(0, m.cols - 1, F, F + 1);

  // ——— Экран 0 (0–15): буфет, полки лесенкой влево-вверх, ящики у столба ———
  m.point('spawn', 2, F);
  m.point('respawn', 2, F);
  m.prop(S.sideboard(6, 2), 4, F); // 4–9, верх 176
  shelf(0, 8, 9); // 0–7, верх 144
  shelf(0, 4, 7); // 0–3, верх 112
  m.decor((p) => {
    S.tallCandle(p, 6 * TILE + 8, y(9));
    S.holder(p, 2 * TILE + 8, y(7));
  });
  enemy('candle', 3, 9);
  tc(1, 5);
  tc(2, 5);
  stack(11, F, null); // ящики у столба: верх стопки 176
  shelf(13, 4, 10); // 13–16, верх 160

  // ——— Портрет (16–22, строки 2–8): нижняя планка рамы — тайник со звездой ———
  S.placePortrait(m, 16, 2);
  m.point('pickup', 21, 8, { kind: 'star' });
  tc(17, 8);
  tc(18, 8);

  // ——— Экран 1 (16–31): низкая полка со свечой, призрак, свеча на полу, кофе ———
  shelf(24, 8, 11); // 24–31, верх 176
  m.decor((p) => {
    S.tallCandle(p, 26 * TILE + 8, y(11));
    S.holder(p, 30 * TILE + 8, y(11));
  });
  enemy('candle', 22, F);
  m.point('enemy', 29, 4, { kind: 'commentGhost' });
  pair(19, F, 'coffee', null);
  tc(28, 9);
  tc(29, 9);

  // ——— Экран 2 (32–47): полка, Петровский, проход на арену ———
  shelf(33, 6, 10); // 33–38, верх 160
  m.decor((p) => S.holder(p, 35 * TILE + 8, y(10)));
  enemy('candle', 37, 10);
  box(32, F, 'timecode');
  m.zone('helper', 39 * TILE, y(F) - 40, 3 * TILE, 40);
  // Проход на арену — тёмная арка в стене.
  m.decor((p) => {
    const x = 44 * TILE;
    p.rect(x, y(F) - 64, 48, 64, NES.black);
    p.ellipse(x + 24, y(F) - 64, 24, 14, NES.black);
    p.rect(x - 4, y(F) - 64, 4, 64, S.W5.gray);
    p.rect(x + 48, y(F) - 64, 4, 64, S.W5.gray);
  });
  m.zone('exit', 45 * TILE, y(F) - 48, 32, 48);

  m.segment('right', 0, 0, m.cols * TILE, 15 * TILE);
  return m;
}
