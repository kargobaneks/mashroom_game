// Набор для карт уровня 9: всё из набора уровня 8 (цех Мира будущего — тот же, что в логове
// оригинала) плюс конвейеры с рычагами, пресс с лазерами, генераторы, висящие платформы,
// пушки на рельсе, точки вылета птиц, засады, обломки. Координаты — по экранам оригинала
// (колонка 0–15, строка 0–14 экрана n).
import * as L from './lair-art.mjs';
import { futureKit } from './future-kit.mjs';
import { TILE } from './lib.mjs';

export function lairKit(m, screens) {
  const k = futureKit(m, screens);
  const { gc, gr, gx, gy } = k;
  const art = {
    belts: [],
    presses: [],
    nozzles: [],
    generators: [],
    hangers: [],
    rails: [],
    hooks: [],
    cracks: [],
  };

  const lair = {
    ...k,
    /**
     * Лента конвейера: верх на строке r, колонки c0..c1. Под лентой — сплошная машинерия
     * до строки bottom (по умолчанию — до низа экрана).
     */
    conveyor(n, r, c0, c1, bottom = 14) {
      m.solid(gc(n, c0), gc(n, c1), gr(n, r), gr(n, bottom));
      const x = gx(n, c0 * TILE);
      const y = gy(n, r * TILE);
      const w = (c1 - c0 + 1) * TILE;
      m.zone('conveyor', x, y, w, 16);
      art.belts.push([x, y, w]);
    },
    /** Рычаг конвейера: стоит на строке r, колонка c. */
    lever(n, c, r) {
      m.point('lever', gc(n, c), gr(n, r));
    },
    /** Пресс под потолком: колонки c0..c1, строки 0..r1 — сплошной (низ — строка r1 + 1). */
    press(n, c0, c1, r1) {
      m.solid(gc(n, c0), gc(n, c1), gr(n, 0), gr(n, r1));
      art.presses.push([gx(n, c0 * TILE), gy(n, 0), (c1 - c0 + 1) * TILE, (r1 + 1) * TILE]);
    },
    /**
     * Лазер: сопло под прессом (низ пресса — строка top), луч до пола (строка floor); x — центр,
     * px экрана; phase — сдвиг цикла, кадры.
     */
    laser(n, x, top, floor, phase = 0) {
      const y0 = gy(n, top * TILE) + 8;
      const y1 = gy(n, floor * TILE);
      m.pointPx('enemy', gx(n, x), y1, { kind: 'laser', h: y1 - y0, phase });
      art.nozzles.push([gx(n, x), gy(n, top * TILE)]);
    },
    /** Белый генератор на колёсах (мебель: встать сверху, пройти насквозь), 3 × 2 тайла на полу r. */
    generator(n, c, r) {
      m.oneway(gc(n, c), gc(n, c + 2), gr(n, r - 2));
      art.generators.push([gx(n, c * TILE), gy(n, (r - 2) * TILE)]);
    },
    /** Висящая полосатая платформа (oneway) на цепях от потолка ceil. */
    hanger(n, r, c0, c1, ceil = 0) {
      m.oneway(gc(n, c0), gc(n, c1), gr(n, r));
      art.hangers.push([
        gx(n, c0 * TILE),
        gy(n, r * TILE),
        (c1 - c0 + 1) * TILE,
        gy(n, ceil * TILE),
      ]);
    },
    /** Рельс пушек по низу потолка (строка r — первая под потолком). */
    rail(n, r, c0 = 0, c1 = 15) {
      art.rails.push([gx(n, c0 * TILE), gy(n, r * TILE), (c1 - c0 + 1) * TILE]);
    },
    /** Пушка на рельсе: висит под строкой r, колонка c. */
    cannon(n, c, r) {
      m.pointPx('enemy', gx(n, c * TILE + 8), gy(n, r * TILE) + 18, { kind: 'cannon' });
    },
    /** Точка вылета птиц у правого края (строка r — высота полёта). */
    nest(n, r, eggs = false) {
      m.pointPx('enemy', gx(n, 232), gy(n, r * TILE), { kind: eggs ? 'eggNest' : 'nest' });
    },
    hook(n, c, ceil, bottom) {
      art.hooks.push([gx(n, c * TILE + 8), gy(n, ceil * TILE), gy(n, bottom * TILE)]);
    },
    /** Обломок под потолком (побег): падает, когда герой под ним; низ потолка — строка r. */
    rubble(n, c, r) {
      m.pointPx('enemy', gx(n, c * TILE + 8), gy(n, r * TILE) + 12, { kind: 'rubble' });
    },
    cracks(n, r, c0, c1) {
      art.cracks.push([gx(n, c0 * TILE), gy(n, r * TILE) - 6, (c1 - c0 + 1) * TILE]);
    },
    /** Таймкод в пикселях: центр x, низ y (буквы надписи DANGER). */
    tcPx(n, x, y) {
      m.pointPx('pickup', gx(n, x), gy(n, y), { kind: 'timecode' });
    },
    finish() {
      k.finish();
      m.paint((p) => {
        for (const [x, y, w] of art.rails) L.rail(p, x, y, w);
        for (const [cx, c, b] of art.hooks) L.hook(p, cx, c, b);
        for (const [x, y, w, h] of art.presses) L.press(p, x, y, w, h);
        for (const [cx, y] of art.nozzles) L.nozzle(p, cx, y);
        for (const [x, y, w] of art.belts) L.conveyor(p, x, y, w);
        for (const [x, y, w] of art.cracks) L.cracks(p, x, y, w, Math.round(x));
      });
      m.decor((p) => {
        for (const [x, y] of art.generators) L.generator(p, x, y);
        for (const [x, y, w, c] of art.hangers) L.hanger(p, x, y, w, c);
      });
    },
  };
  return lair;
}
