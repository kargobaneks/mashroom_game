// Уровень 1, часть 1-4: «Подвал» — служебный спуск по трубам и арена Агранович (подвал-обжарочная).
// Сетка 16 × 30: строки 0–14 — шахта (прокрутка вниз), 15–29 — арена (зафиксированный экран).
import * as A from './cafe-art.mjs';
import { placers } from './common.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel1Basement() {
  const m = new MapBuilder(16, 30);
  const { box, tc } = placers(m);
  const AY = 15 * TILE;

  m.paint((p) => {
    A.brickWall(p, 0, 0, 16 * TILE, 30 * TILE, true, 28 * TILE);
    p.rect(0, 0, 10 * TILE, 15 * TILE, 0x000000);
    p.rect(0, AY, 10 * TILE, TILE, 0x000000);
    p.rect(0, AY, TILE, 15 * TILE, 0x000000);
    p.rect(15 * TILE, 0, TILE, 30 * TILE, 0x000000);
  });

  // ——— Шахта ———
  m.solid(0, 9, 0, 14);
  m.solid(15, 15, 0, 29);
  m.point('spawn', 12, 2);
  m.prop(A.pipe(2), 10, 6);
  m.prop(A.pipe(2), 13, 11);
  m.point('respawn', 10, 5);
  for (const r of [3, 7, 9, 13]) tc(12, r);
  tc(10, 5);
  tc(14, 10);

  // ——— Арена ———
  m.solid(0, 9, 15, 15); // потолок, справа — проём шахты
  m.solid(0, 0, 15, 29);
  m.solid(1, 14, 28, 29);
  m.paint((p) => A.roaster(p, 4 * TILE + 8, 28 * TILE));
  m.prop(A.arenaShelf(4), 1, 27);
  m.prop(A.arenaShelf(4), 11, 27);
  // Пена — у пола; ступеньки поверх неё, чтобы их было видно.
  m.paint((p) => A.milkFoam(p, TILE, AY + 184, 14 * TILE, 24));
  m.prop(A.step, 5, 28);
  m.prop(A.step, 10, 28);
  m.zone('foam', TILE, AY + 184, 14 * TILE, 24);
  box(2, 26);
  box(13, 26);
  box(8, 28);
  m.point('respawn', 12, 26);
  m.pointPx('bossPoint', 64, AY + 194);
  m.pointPx('bossPoint', 192, AY + 194);
  m.pointPx('bossPoint', 96, AY + 120);
  m.pointPx('bossPoint', 160, AY + 120);

  m.segment('down', 0, 0, 16 * TILE, 30 * TILE);
  m.segment('lock', 0, AY, 16 * TILE, 15 * TILE, { boss: 'agranovich' });
  return m;
}
