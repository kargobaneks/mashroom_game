// Уровень 6, арена Щелина — по схеме арены страуса оригинала (docs/refs/level6/arena.png):
// один экран без скролла, пол на y=192 во всю ширину (ям нет), два уступа — левый x 0–63 и правый
// x 192–255; игрок начинает на левом уступе. Отступление: уступы на y=160 (32 px над полом), а не на
// 128, как в оригинале, — у нас прыжок ~40 px (отзыв пользователя: «не допрыгиваю по бокам»). Сзади — небо и город, по краям —
// стены башни с трубами; над серединой — циферблат (на нём год фазы).
import * as A from './clock-art.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel6Arena() {
  const m = new MapBuilder(16, 15);
  const FLOOR = 12;
  const LEDGE = 10;
  m.paint((p) => {
    A.wall(p, 0, 0, 16 * TILE, 15 * TILE);
    A.window(p, 48, 0, 160, FLOOR * TILE);
    A.pipeV(p, 16, 0, FLOOR * TILE);
    A.pipeV(p, 224, 0, FLOOR * TILE);
    A.clockFace(p, 128, 76, 24);
  });
  m.decor((p) => {
    A.slab(p, 0, LEDGE * TILE, 4 * TILE);
    A.slab(p, 12 * TILE, LEDGE * TILE, 4 * TILE);
    A.slab(p, 0, FLOOR * TILE, 16 * TILE, 48);
  });
  m.solid(0, 15, FLOOR, 14);
  m.oneway(0, 3, LEDGE);
  m.oneway(12, 15, LEDGE);
  m.point('spawn', 1, LEDGE);
  m.point('respawn', 1, LEDGE);
  m.segment('lock', 0, 0, 16 * TILE, 15 * TILE, { boss: 'shchelin' });
  return m;
}
