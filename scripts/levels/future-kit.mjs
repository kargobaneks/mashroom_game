// Набор для карт уровня 8: экраны оригинала → карта, стены, платформы, ящики, механизмы.
// Координаты — по экранам оригинала (колонка 0–15, строка 0–14 экрана n). Пол экранов — на
// строке 14 (y = 224), как в оригинале.
import * as A from './future-art.mjs';
import { TILE } from './lib.mjs';

const SW = 16;
const SH = 15;

/**
 * screens: номер экрана → [колонка, строка] экрана на карте.
 * Возвращает помощников; finish() рисует арт (вызвать в конце).
 */
export function futureKit(m, screens) {
  const gc = (n, c) => screens[n][0] * SW + c;
  const gr = (n, r) => screens[n][1] * SH + r;
  const gx = (n, x) => screens[n][0] * SW * TILE + x;
  const gy = (n, y) => screens[n][1] * SH * TILE + y;
  const art = { pipes: [], tubes: [], grates: [], pistons: [], magnets: [], doors: [], pinks: [] };

  const kit = {
    gc,
    gr,
    gx,
    gy,
    /** Стена / пол: сплошные тайлы c0..c1 × r0..r1 экрана n. */
    wall(n, c0, c1, r0, r1) {
      m.solid(gc(n, c0), gc(n, c1), gr(n, r0), gr(n, r1));
    },
    /** Белая труба-платформа (oneway): верх на строке r. */
    pipe(n, r, c0, c1) {
      m.oneway(gc(n, c0), gc(n, c1), gr(n, r));
      art.pipes.push([gx(n, c0 * TILE), gy(n, r * TILE), (c1 - c0 + 1) * TILE]);
    },
    /** Оранжевая трубка-ступень (oneway). */
    tube(n, r, c0, c1) {
      m.oneway(gc(n, c0), gc(n, c1), gr(n, r));
      art.tubes.push([gx(n, c0 * TILE), gy(n, r * TILE), (c1 - c0 + 1) * TILE]);
    },
    /** Решётка-ступень (oneway). */
    grate(n, r, c0, c1) {
      m.oneway(gc(n, c0), gc(n, c1), gr(n, r));
      art.grates.push([gx(n, c0 * TILE), gy(n, r * TILE), (c1 - c0 + 1) * TILE]);
    },
    /** Розовая труба фона: колонка c, строки r0..r1. */
    pink(n, c, r0, r1) {
      art.pinks.push([gx(n, c * TILE), gy(n, r0 * TILE), gy(n, (r1 + 1) * TILE)]);
    },
    box(n, c, r, contains) {
      m.point('item', gc(n, c), gr(n, r), contains ? { kind: 'box', contains } : { kind: 'box' });
    },
    /** Блок 2×2 ящиков, низ — на строке r (ящики в строках r-1 и r-2). */
    block2(n, c, r, kinds = [null, null, null, null]) {
      const [tl, tr, bl, br] = kinds;
      kit.box(n, c, r, bl);
      kit.box(n, c + 1, r, br);
      kit.box(n, c, r - 1, tl);
      kit.box(n, c + 1, r - 1, tr);
    },
    tc(n, c, r) {
      m.point('pickup', gc(n, c), gr(n, r), { kind: 'timecode' });
    },
    enemy(n, kind, c, r) {
      m.point('enemy', gc(n, c), gr(n, r), { kind });
    },
    /**
     * Давящий блок: левый край на колонке c, опущенный стоит на строке r (низ блока);
     * над ним — белый цилиндр от потолка (строка ceil) до верхнего положения.
     */
    crusher(n, c, r, ceil, phase = 0) {
      const cx = gx(n, (c + 1) * TILE);
      const floor = gy(n, r * TILE);
      m.pointPx('crusher', cx, floor, { phase });
      art.pistons.push([cx, gy(n, ceil * TILE), floor - 64]);
    },
    /** Складная платформа: центр x (px экрана), верх y. */
    fold(n, x, y) {
      m.pointPx('fold', gx(n, x), gy(n, y));
    },
    /** Магнит: центр x (px экрана), потолок и низ магнита (px экрана). */
    magnet(n, x, ceiling, bottom) {
      m.pointPx('magnet', gx(n, x), gy(n, bottom));
      art.magnets.push([gx(n, x), gy(n, ceiling), gy(n, bottom)]);
    },
    /** Выход: дверь 24×32 у правого края, стоит на строке r. */
    exit(n, r) {
      const x = gx(n, 232);
      const y = gy(n, r * TILE - 32);
      m.zone('exit', x, y, 24, 32);
      art.doors.push([x, y]);
    },
    respawn(n, c, r) {
      m.point('respawn', gc(n, c), gr(n, r));
    },
    /** Нарисовать арт: фон всей карты, стены, потом платформы с контуром. */
    finish() {
      m.paint((p) => {
        A.bg(p, 0, 0, m.cols * TILE, m.rows * TILE);
        for (const [x, y0, y1] of art.pinks) A.pinkPipe(p, x, y0, y1);
        const solid = m.layers.solid;
        A.walls(p, m.cols, m.rows, TILE, (tx, ty) =>
          tx < 0 || ty < 0 || tx >= m.cols || ty >= m.rows ? true : solid[ty * m.cols + tx] !== 0,
        );
        for (const [cx, y0, y1] of art.pistons) A.piston(p, cx, y0, y1);
        for (const [x, y] of art.doors) A.door(p, x, y);
      });
      m.decor((p) => {
        for (const [x, y, w] of art.pipes) A.pipe(p, x, y, w);
        for (const [x, y, w] of art.tubes) A.tube(p, x, y, w);
        for (const [x, y, w] of art.grates) A.grate(p, x, y, w);
        for (const [cx, c, b] of art.magnets) A.magnet(p, cx, c, b);
      });
    },
  };
  return kit;
}
