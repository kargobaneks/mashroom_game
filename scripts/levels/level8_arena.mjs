// Уровень 8: бонус перед 8-3 и арена Маркова.
//
// Бонус (в оригинале — Монти между 8-2 и 8-3, восстанавливает сердца): у нас Петровский, как
// перед ареной уровня 5 (ТЗ: путешественник — на месте Рокфора). Один экран: подошёл —
// реплика и полные сердца, дальше — дверь справа.
//
// Арена (docs/refs/level8/arena.png): один экран без прокрутки, пол на y = 192 во всю ширину,
// ям нет, герой стартует слева (24, 192). Кран с Марковым — босс (src/sim/bosses/Markov.ts),
// на карте его нет.
import * as A from './future-art.mjs';
import { futureKit } from './future-kit.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel8Bonus() {
  const m = new MapBuilder(16, 15);
  const k = futureKit(m, { 0: [0, 0] });
  m.point('spawn', 2, 14);
  k.respawn(0, 2, 14);
  k.wall(0, 0, 15, 0, 3);
  k.wall(0, 0, 15, 14, 14);
  k.grate(0, 11, 6, 9);
  k.pink(0, 3, 4, 13);
  k.pink(0, 12, 4, 13);
  m.zone('helper', 7 * TILE, 14 * TILE - 40, 3 * TILE, 40);
  k.exit(0, 14);
  k.finish();
  m.segment('lock', 0, 0, 256, 240);
  return m;
}

export function buildLevel8Arena() {
  const m = new MapBuilder(16, 15);
  const FLOOR = 12;
  m.paint((p) => {
    A.bg(p, 0, 0, 16 * TILE, FLOOR * TILE);
    A.block(p, 0, 0, 16 * TILE, 24, { t: false, b: true, l: false, r: false });
    A.block(p, 0, FLOOR * TILE, 16 * TILE, 3 * TILE, { t: true, b: false, l: false, r: false });
  });
  m.solid(0, 15, FLOOR, 14);
  m.point('spawn', 1, FLOOR);
  m.point('respawn', 1, FLOOR);
  m.segment('lock', 0, 0, 16 * TILE, 15 * TILE, { boss: 'markov' });
  return m;
}
