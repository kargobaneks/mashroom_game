// Уровень 7, заезды на вагонетке 7-2 … 7-4 — по разбору ROM оригинала
// (docs/refs/level7/LEVEL7_WESTERN_WORLD.md, разделы 2 и 4; карты map_7-2..4.png): 8 экранов вправо,
// одна опасность на экран (валун или маятник), первый экран пустой; в 7-3 — обрыв пути
// (вагонетка падает на нижний путь); в 7-4 путь кончается на экране 5, дальше пешком.
// Рельсы — зоны `rail` (под ними пропасть), конец пути — зона `bumper`, земля — сплошные тайлы.
// Таймкоды висят над путём на высоте прыжка из вагонетки (у нас прыжок ниже, чем в оригинале).
import { placers } from './common.mjs';
import * as A from './mine-art.mjs';
import { MapBuilder, TILE } from './lib.mjs';

/**
 * spec: {
 *   rails: [[x0, x1, y]] — пути (px карты), cart: x старта вагонетки,
 *   bumper: x отбойника, ground: x начала земли (до конца карты), groundY,
 *   hazards: [[kind, screen, x, y]] — по таблице оригинала (y — верх объекта / точка подвеса),
 *   timecodes: [[screen, x, y]] — низ таймкода, px экрана,
 *   items(m, helpers) — ящики и прочее на пешем финале; exit: [x, y].
 * }
 */
export function buildRide(spec) {
  const m = new MapBuilder(128, 15);
  const { box } = placers(m);
  const sx = (n, x) => n * 256 + x;

  for (const [x0, x1, y] of spec.rails) m.zone('rail', x0, y, x1 - x0, 16);
  m.zone('bumper', spec.bumper, spec.groundY - 32, 8, 32);
  m.pointPx('cart', spec.cart, spec.rails[0][2]);
  m.pointPx('spawn', spec.cart, spec.rails[0][2] - 4);
  m.pointPx('respawn', spec.cart, spec.rails[0][2] - 4);
  const gcol = Math.floor(spec.ground / TILE);
  const grow = spec.groundY / TILE;
  m.solid(gcol, 127, grow, 14);

  for (const [kind, n, x, y] of spec.hazards) {
    if (kind === 'pendulum') m.pointPx('enemy', sx(n, x), y, { kind });
    else m.pointPx('enemy', sx(n, x) + 8, y + 16, { kind });
  }
  for (const [n, x, y] of spec.timecodes)
    m.pointPx('pickup', sx(n, x) + 4, y, { kind: 'timecode' });
  spec.items?.(m, { box, sx });
  m.zone('exit', spec.exit[0] - 8, spec.exit[1] - 32, 24, 32);

  m.paint((p) => {
    A.mineWall(p, 0, 0, m.cols * TILE, m.rows * TILE);
    // Каменные плиты под потолком, как в оригинале.
    for (let n = 0; n < 8; n++) {
      A.ceilingSlab(p, sx(n, 0), 48, 120);
      A.ceilingSlab(p, sx(n, 136), 64, 120);
    }
    // Фермы под путями.
    for (const [x0, x1, y] of spec.rails)
      for (let x = x0; x < x1 - 32; x += 96) A.truss(p, x + 16, y + 8, 240, 64);
  });
  m.decor((p) => {
    for (const [x0, x1, y] of spec.rails) A.rails(p, x0, x1, y);
    A.bumper(p, spec.bumper, spec.groundY);
    A.cobbles(p, spec.ground, spec.groundY, m.cols * TILE - spec.ground, 240 - spec.groundY);
    spec.decor?.(p, sx);
  });

  m.segment('right', 0, 0, 128 * TILE, 15 * TILE);
  return m;
}

/** 7-2: только валуны (экраны 2–6), путь ровный, в конце пара ящиков и выход. */
export function buildLevel7Ride1() {
  const Y = 192;
  return buildRide({
    rails: [[0, 7 * 256 + 64, Y]],
    cart: 40,
    bumper: 7 * 256 + 64,
    ground: 7 * 256 + 32,
    groundY: Y,
    hazards: [
      ['boulder', 2, 144, 96],
      ['boulder', 3, 144, 112],
      ['boulder', 4, 144, 96],
      ['boulder', 5, 112, 112],
      ['boulder', 6, 112, 112],
    ],
    timecodes: [
      [1, 64, 176],
      [1, 96, 176],
      [1, 160, 144],
      [1, 192, 144],
      [2, 0, 176],
      [2, 16, 176],
      [2, 224, 144],
      [3, 96, 176],
      [3, 192, 176],
      [3, 224, 144],
      [4, 32, 176],
      [4, 0, 144],
      [4, 208, 176],
      [5, 0, 176],
      [5, 224, 144],
      [5, 224, 176],
      [7, 16, 144],
      [7, 48, 144],
    ],
    items: (m, { box, sx }) => {
      box(Math.floor(sx(7, 160) / TILE), Y / TILE);
      box(Math.floor(sx(7, 176) / TILE), Y / TILE, 'timecode');
    },
    decor: (p, sx) => {
      A.barrel(p, sx(7, 96), Y, 32, 40, true);
      A.barrel(p, sx(7, 192), Y, 24, 28);
    },
    exit: [7 * 256 + 232, Y],
  });
}

/** 7-3: валуны и маятники вперемешку; обрыв пути после экрана 3 (на 32 px вниз); жёлудь в конце. */
export function buildLevel7Ride2() {
  const HI = 176;
  const LO = 208;
  return buildRide({
    rails: [
      [0, 4 * 256 - 64, HI],
      [4 * 256 - 96, 7 * 256 + 64, LO],
    ],
    cart: 40,
    bumper: 7 * 256 + 64,
    ground: 7 * 256 + 32,
    groundY: LO,
    hazards: [
      ['boulder', 1, 16, 80],
      ['pendulum', 2, 144, 64],
      ['pendulum', 4, 112, 96],
      ['boulder', 5, 112, 112],
      ['pendulum', 6, 192, 96],
    ],
    timecodes: [
      [0, 80, 160],
      [0, 112, 160],
      [0, 144, 160],
      [1, 128, 128],
      [1, 160, 128],
      [2, 32, 160],
      [2, 64, 160],
      [2, 128, 128],
      [2, 144, 128],
      [3, 32, 96],
      [3, 32, 112],
      [3, 32, 128],
      [3, 128, 160],
      [3, 160, 160],
      [4, 16, 160],
      [4, 48, 176],
      [4, 80, 192],
      [5, 96, 192],
      [5, 112, 192],
      [6, 0, 160],
      [6, 32, 160],
      [6, 80, 160],
      [6, 112, 160],
      [7, 16, 176],
      [7, 48, 176],
    ],
    items: (m, { box, sx }) => {
      const c = Math.floor(sx(7, 128) / TILE);
      box(c, LO / TILE, 'coffee');
      box(c, LO / TILE - 1);
    },
    decor: (p, sx) => {
      A.barrel(p, sx(7, 160), LO, 40, 56, true);
    },
    exit: [7 * 256 + 232, LO],
  });
}

/**
 * 7-4: валуны, маятники; путь кончается на экране 5 — дальше пешком: бочки, ящики, два жёлудя,
 * летучие мыши (экраны 6–7), змея в коробке на уступе, выход.
 */
export function buildLevel7Ride3() {
  const Y = 192;
  return buildRide({
    rails: [[0, 5 * 256 + 96, Y]],
    cart: 40,
    bumper: 5 * 256 + 96,
    ground: 5 * 256 + 64,
    groundY: Y,
    hazards: [
      ['pendulum', 1, 96, 64],
      ['boulder', 2, 112, 96],
      ['pendulum', 3, 64, 96],
      ['boulder', 4, 112, 96],
      ['pendulum', 5, 40, 112],
      ['bat', 6, 240, 96],
      ['bat', 7, 224, 96],
    ],
    timecodes: [
      [0, 64, 160],
      [0, 112, 176],
      [0, 160, 160],
      [0, 208, 176],
      [1, 64, 144],
      [1, 80, 144],
      [2, 32, 144],
      [2, 32, 176],
      [2, 224, 176],
      [3, 0, 176],
      [3, 192, 144],
      [3, 224, 144],
      [4, 32, 144],
      [4, 64, 144],
      [4, 160, 144],
      [4, 192, 144],
      [5, 16, 144],
      [5, 48, 144],
      [6, 16, 160],
      [6, 32, 160],
    ],
    items: (m, { box, sx }) => {
      const col = (n, x) => Math.floor(sx(n, x) / TILE);
      const R = Y / TILE;
      // Экран 5: пара ящиков на земле; жёлудь — в ящике на бочке.
      box(col(5, 128), R);
      box(col(5, 144), R);
      m.oneway(col(5, 176), col(5, 192), R - 2);
      box(col(5, 176), R - 2, 'coffee');
      // Экран 6: стойка салуна, за ней — камео Стаса Васильева (концепция); пара ящиков.
      // Кадр «по пояс»: видимая часть (28 px) кончается на верху стойки (24 px над полом).
      m.zone('cameo', sx(6, 24), Y - 24 - 28, 24, 40);
      box(col(6, 160), R);
      box(col(6, 176), R, 'coffee');
      // Экран 7: уступ слева со змеёй в коробке и ящиком; две стопки.
      m.oneway(col(7, 0), col(7, 47), R - 2);
      box(col(7, 0), R - 2, 'timecode');
      m.pointPx('enemy', sx(7, 40), Y - 32, { kind: 'snakeBox' });
      box(col(7, 64), R);
      box(col(7, 64), R - 1);
      box(col(7, 112), R, 'timecode');
      box(col(7, 112), R - 1);
    },
    decor: (p, sx) => {
      A.barrel(p, sx(5, 172), Y, 40, 32);
      A.beam(p, sx(7, 0), Y - 32, 48);
      A.barrel(p, sx(6, 96), Y, 40, 56, true);
      A.barCounter(p, sx(6, 8), Y, 56);
    },
    exit: [7 * 256 + 232, Y],
  });
}
