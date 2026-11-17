// Уровень 7, арена Соболева и Луки — по схеме арены кота-фокусника оригинала
// (docs/refs/level7/arena.png): один экран под открытым небом, сверху каменный свод, пол во всю
// ширину, по два уступа слева (x 0–63) и справа (x 192–255). Отступление: уступы на 32 и 64 px над
// полом (в оригинале — через 64, у нас прыжок ~40 px). В центре — карточный стол (ТЗ): на нём
// стоят, за ним сидит тот, кто сейчас не ходит. Игрок стартует на полу слева.
import * as A from './mine-art.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel7Arena() {
  const m = new MapBuilder(16, 15);
  const FLOOR = 13;
  const LOWER = 11;
  const UPPER = 9;
  m.paint((p) => {
    A.sky(p, 0, 0, 16 * TILE, FLOOR * TILE);
    A.rockWall(p, 0, 0, 16 * TILE, 40);
    A.cobbles(p, 0, FLOOR * TILE, 16 * TILE, 2 * TILE);
  });
  m.decor((p) => {
    for (const [x, r] of [
      [0, LOWER],
      [0, UPPER],
      [192, LOWER],
      [192, UPPER],
    ]) {
      A.beam(p, x, r * TILE, 64);
      A.suits(p, x + 22, r * TILE + 6);
    }
    A.cardTable(p, 96, LOWER * TILE, 64, FLOOR * TILE);
  });
  m.solid(0, 15, FLOOR, 14);
  for (const r of [LOWER, UPPER]) {
    m.oneway(0, 3, r);
    m.oneway(12, 15, r);
  }
  m.oneway(6, 9, LOWER);
  m.point('spawn', 1, FLOOR);
  m.point('respawn', 1, FLOOR);
  m.segment('lock', 0, 0, 16 * TILE, 15 * TILE, { boss: 'duo' });
  return m;
}
