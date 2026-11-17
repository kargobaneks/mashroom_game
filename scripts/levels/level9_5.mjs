// Уровень 9, часть 9-5 «Коридор DANGER» — по разбору ROM оригинала
// (docs/refs/level9/LEVEL9_FATCAT_LAIR.md, карта docs/refs/level9/map_9-5.png): 4 экрана
// вправо, передышка перед боссом. На каждом экране один шаблон: блоки ящиков 2×2 (в каждом —
// кофе, жёлудь оригинала; всего 7), буквы из таймкодов и бегающий враг посередине. Таймкоды
// складываются в надпись D-A-N-G-E-R — она читается по дороге к боссу.
//
// Отступления: буквы 5×7 с шагом 8 px (в оригинале — с шагом 16 и выше прыжка: у нас прыжок
// ~40 px, верх буквы должен быть достижим). Крылатая мышь оригинала — краб уровня 3
// (ТЗ: «все типы врагов»).
import { lairKit } from './lair-kit.mjs';
import { MapBuilder } from './lib.mjs';

const SCREENS = Object.fromEntries(Array.from({ length: 4 }, (_, i) => [i, [i, 0]]));

/** Буквы 5×7 (сверху вниз). */
const GLYPHS = {
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
};

const FLOOR = 12;

export function buildLevel9Danger() {
  const m = new MapBuilder(4 * 16, 15);
  const k = lairKit(m, SCREENS);
  const { wall, tc } = k;

  /** Буква: левая колонка — x (px экрана), нижняя строка точек — на 4 px выше пола. */
  const letter = (n, ch, x) => {
    const rows = GLYPHS[ch];
    rows.forEach((row, i) =>
      [...row].forEach((c, j) => {
        if (c === '#') k.tcPx(n, x + 4 + j * 8, FLOOR * 16 - 2 - (rows.length - 1 - i) * 8);
      }),
    );
  };
  void tc;

  for (let n = 0; n < 4; n++) {
    wall(n, 0, 15, 0, 1);
    wall(n, 0, 15, FLOOR, 14);
  }

  m.point('spawn', k.gc(0, 2), k.gr(0, FLOOR));
  k.respawn(0, 2, FLOOR);
  k.block2(0, 9, FLOOR, [null, null, null, 'coffee']);
  letter(0, 'D', 192);

  const LETTERS = [
    ['A', 'N'],
    ['G', 'E'],
    ['R', null],
  ];
  LETTERS.forEach(([a, b], i) => {
    const n = i + 1;
    k.block2(n, 1, FLOOR, [null, null, null, 'coffee']);
    k.block2(n, 9, FLOOR, [null, null, null, 'coffee']);
    letter(n, a, 64);
    if (b) letter(n, b, 192);
    k.enemy(n, 'crab', 6, FLOOR);
  });
  k.exit(3, FLOOR);

  k.finish();
  m.segment('right', 0, 0, 4 * 256, 240);
  return m;
}
