// Уровень 9: бонус после 9-2, приёмная с Саймсом, аппаратная (арена) и побег.
//
// Бонус (в оригинале — Монти после 9-2, восстанавливает сердца): у нас Петровский, как в уровнях
// 5 и 8. Приёмная: в оригинале перед боем — ролик с Толстопузом; по ТЗ перед аппаратной — сцена
// с Дмитрием Саймсом (подошёл — реплика), дверь в аппаратную справа.
// Арена (docs/refs/level9/arena.png): один экран, пол на y = 192 во всю ширину, площадок нет,
// старт героя (24, 192); балки наверху — только рисунок фона. Свет гаснет — видны робот и спрайты.
// Побег (ТЗ): 4 экрана вправо, таймер 60 с, с потолка в трещинах падают обломки; ямы до 48 px
// и завалы до 32 px. Дверь в конце — наружу.
import * as A from './future-art.mjs';
import { lairKit } from './lair-kit.mjs';
import { MapBuilder, TILE } from './lib.mjs';

export function buildLevel9Bonus() {
  const m = new MapBuilder(16, 15);
  const k = lairKit(m, { 0: [0, 0] });
  m.point('spawn', 2, 12);
  k.respawn(0, 2, 12);
  k.wall(0, 0, 15, 0, 2);
  k.wall(0, 0, 15, 12, 14);
  k.generator(0, 11, 12);
  k.hook(0, 4, 0, 7);
  m.zone('helper', 7 * TILE, 12 * TILE - 40, 3 * TILE, 40);
  k.exit(0, 12);
  k.finish();
  m.segment('lock', 0, 0, 256, 240);
  return m;
}

export function buildLevel9Simes() {
  const m = new MapBuilder(16, 15);
  const k = lairKit(m, { 0: [0, 0] });
  m.point('spawn', 2, 12);
  k.respawn(0, 2, 12);
  k.wall(0, 0, 15, 0, 2);
  k.wall(0, 0, 15, 12, 14);
  k.pink(0, 3, 3, 11);
  k.pink(0, 12, 3, 11);
  m.zone('simes', 7 * TILE, 12 * TILE - 40, 3 * TILE, 40);
  k.exit(0, 12);
  k.finish();
  m.segment('lock', 0, 0, 256, 240);
  return m;
}

export function buildLevel9Arena() {
  const m = new MapBuilder(16, 15);
  const FLOOR = 12;
  m.paint((p) => {
    A.bg(p, 0, 0, 16 * TILE, FLOOR * TILE);
    A.block(p, 0, FLOOR * TILE, 16 * TILE, 3 * TILE, { t: true, b: false, l: false, r: false });
  });
  m.solid(0, 15, FLOOR, 14);
  m.point('spawn', 1, FLOOR);
  m.point('respawn', 1, FLOOR);
  m.segment('lock', 0, 0, 16 * TILE, 15 * TILE, { boss: 'machine' });
  return m;
}

export function buildLevel9Escape() {
  const m = new MapBuilder(4 * 16, 15);
  const k = lairKit(m, Object.fromEntries(Array.from({ length: 4 }, (_, i) => [i, [i, 0]])));
  m.properties.timer = 60;
  const { wall } = k;
  for (let n = 0; n < 4; n++) {
    wall(n, 0, 15, 0, 3);
    k.cracks(n, 4, 0, 15);
  }
  m.point('spawn', k.gc(0, 1), k.gr(0, 12));
  k.respawn(0, 1, 12);

  // Экран 0: ровно, два обломка.
  wall(0, 0, 15, 12, 14);
  k.rubble(0, 6, 4);
  k.rubble(0, 11, 4);

  // Экран 1: яма 48 px, завал 32 px.
  wall(1, 0, 3, 12, 14);
  wall(1, 7, 15, 12, 14);
  wall(1, 10, 11, 10, 11);
  k.rubble(1, 8, 4);
  k.rubble(1, 13, 4);

  // Экран 2: яма, ступени из завалов.
  wall(2, 0, 2, 12, 14);
  wall(2, 6, 15, 12, 14);
  wall(2, 9, 9, 11, 11);
  wall(2, 12, 13, 10, 11);
  for (const c of [1, 7, 10, 14]) k.rubble(2, c, 4);

  // Экран 3: последний рывок, выход наружу.
  wall(3, 0, 15, 12, 14);
  for (const c of [3, 8, 12]) k.rubble(3, c, 4);
  k.exit(3, 12);

  k.finish();
  m.segment('right', 0, 0, 4 * 256, 240);
  return m;
}
