// Арт уровня 8 «Нейросеть» по картам Мира будущего оригинала (docs/refs/level8/map_8-*.png):
// тёмно-синие панели за сине-зелёными балками с узлами-восьмиугольниками, стены и пол —
// блоки в жёлто-чёрную полосу с пурпурной сеткой внутри, белые трубы и оранжево-белые
// трубки-ступени (платформы), сине-зелёные решётки, розовые вертикальные трубы фона,
// белые цилиндры прессов, магнит на цепи.
import { NES as C } from './pixels.mjs';

export const W8 = {
  panel: 0x00006c,
  panelLight: C.navy,
  girder: C.darkTeal,
  girderLight: C.teal,
  stripe: C.tan,
  mesh: C.purple,
  meshDark: 0x2c0028,
  pipe: C.white,
  pipeMid: C.lavender,
  pipeDark: C.periwinkle,
  tube: C.orange,
  tubeLight: C.cream,
  pink: C.rose,
  pinkDark: C.purple,
};

/** Фон: панели и балки — решётка с узлами (тихий, без контура). */
export function bg(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const gx = ((x % 128) + 128) % 128;
    const gy = ((y % 96) + 96) % 96;
    // Вертикальные и горизонтальные балки.
    const vBeam = gx < 14;
    const hBeam = gy < 12;
    // Диагональные раскосы у узлов.
    const dx = Math.min(gx, 128 - gx);
    const dy = Math.min(gy, 96 - gy);
    const brace = Math.abs(dx - dy) < 5 && dx < 34 && dy < 34;
    if (vBeam || hBeam || brace) {
      const edgeLine = gx === 0 || gx === 13 || gy === 0 || gy === 11;
      if (edgeLine && !brace) return C.black;
      return (vBeam && gx < 3) || (hBeam && gy < 3) ? W8.girderLight : W8.girder;
    }
    // Панель: светлая рамка.
    return gx === 14 || gy === 12 ? W8.panelLight : W8.panel;
  });
  // Узлы-восьмиугольники на пересечениях балок.
  for (let y = y0 - (y0 % 96); y < y0 + h; y += 96)
    for (let x = x0 - (x0 % 128); x < x0 + w; x += 128) {
      for (let dy = -10; dy <= 10; dy++)
        for (let dx = -10; dx <= 10; dx++) {
          const px = x + 7 + dx;
          const py = y + 6 + dy;
          if (px < x0 || py < y0 || px >= x0 + w || py >= y0 + h) continue;
          const d = Math.abs(dx) + Math.abs(dy);
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 9 || d > 13) continue;
          pix.set(px, py, d > 11 || d < 2 ? C.black : W8.girderLight);
        }
    }
}

/** Пурпурная сетка (внутри стен). */
export function mesh(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const a = (x + y) % 16;
    const b = (x - y + 1600) % 16;
    if (a === 0 || b === 0) return W8.mesh;
    return (x % 16 === 8 && y % 4 < 2) || (y % 16 === 8 && x % 4 < 2) ? W8.meshDark : C.black;
  });
}

/**
 * Стена или пол: сетка, по краям — полоса в жёлто-чёрную диагональ с белой кромкой.
 * sides — какие края обведены полосой (по умолчанию все).
 */
export function block(pix, x, y, w, h, sides = { t: true, b: true, l: true, r: true }) {
  mesh(pix, x, y, w, h);
  const B = 12;
  const stripe = (sx, sy, sw, sh) =>
    pix.fillPattern(sx, sy, sw, sh, (px, py) =>
      Math.floor((px + py) / 6) % 2 === 0 ? W8.stripe : C.black,
    );
  if (sides.t) stripe(x, y, w, Math.min(B, h));
  if (sides.b) stripe(x, y + h - Math.min(B, h), w, Math.min(B, h));
  if (sides.l) stripe(x, y, Math.min(B, w), h);
  if (sides.r) stripe(x + w - Math.min(B, w), y, Math.min(B, w), h);
  if (sides.t) pix.hline(x, y, w, C.white);
  if (sides.l) pix.vline(x, y, h, C.white);
  if (sides.r) pix.vline(x + w - 1, y, h, C.white);
}

/** Белая горизонтальная труба (платформа), x, y — левый верх, высота 16. Концы скруглены. */
export function pipe(pix, x, y, w) {
  const rows = [C.black, W8.pipe, W8.pipe, W8.pipeMid, W8.pipeMid, W8.pipe, W8.pipe, W8.pipeMid];
  for (let dy = 0; dy < 16; dy++) {
    const c =
      dy === 0 || dy === 15 ? C.black : dy < 8 ? rows[dy] : dy < 12 ? W8.pipeMid : W8.pipeDark;
    for (let dx = 0; dx < w; dx++) {
      const end = dx < 2 || dx >= w - 2;
      pix.set(x + dx, y + dy, end ? C.black : c);
    }
  }
  // Риски на трубе.
  for (let dx = 24; dx < w - 8; dx += 32)
    for (let k = 0; k < 3; k++) pix.hline(x + dx, y + 5 + k * 3, 8, C.black);
}

/** Оранжево-белая трубка-ступень (платформа), высота 16. */
export function tube(pix, x, y, w) {
  for (let dy = 0; dy < 16; dy++)
    for (let dx = 0; dx < w; dx++) {
      const seg = dx % 16;
      let c;
      if (dy === 0 || dy === 15 || dx === 0 || dx === w - 1) c = C.black;
      else if (seg === 0 || seg === 7) c = C.black;
      else if (seg < 7) c = dy < 4 || dy > 11 ? W8.tube : W8.tubeLight;
      else c = dy < 3 ? W8.tubeLight : dy > 12 ? C.brown : W8.tube;
      pix.set(x + dx, y + dy, c);
    }
}

/** Сине-зелёная решётка с заклёпками (платформа), высота 16. */
export function grate(pix, x, y, w) {
  pix.rect(x, y, w, 16, W8.girder);
  pix.hline(x, y, w, C.black);
  pix.hline(x, y + 15, w, C.black);
  pix.vline(x, y, 16, C.black);
  pix.vline(x + w - 1, y, 16, C.black);
  pix.hline(x + 1, y + 1, w - 2, W8.girderLight);
  for (let dx = 6; dx < w - 6; dx += 3) pix.vline(x + dx, y + 4, 8, C.black);
  for (const dx of [3, w - 4]) {
    pix.set(x + dx, y + 3, C.black);
    pix.set(x + dx, y + 12, C.black);
  }
}

/** Розовая вертикальная труба фона, ширина 24. */
export function pinkPipe(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++)
    for (let dx = 0; dx < 24; dx++) {
      const c =
        dx === 0 || dx === 23
          ? C.black
          : dx < 4
            ? W8.pink
            : dx < 10
              ? C.salmon
              : dx < 16
                ? W8.pink
                : W8.pinkDark;
      pix.set(x + dx, y, (y - y0) % 40 < 2 && dx > 0 && dx < 23 ? C.black : c);
    }
}

/** Белый цилиндр пресса от потолка до верхнего положения блока; cx — центр. */
export function piston(pix, cx, y0, y1) {
  const x = cx - 8;
  for (let y = y0; y < y1; y++)
    for (let dx = 0; dx < 16; dx++) {
      const c =
        dx === 0 || dx === 15
          ? C.black
          : dx < 4
            ? W8.pipeMid
            : dx < 8
              ? W8.pipe
              : dx < 12
                ? W8.pipeMid
                : W8.pipeDark;
      pix.set(x + dx, y, c);
    }
  // Кольца у низа.
  for (let k = 0; k < 3; k++) pix.hline(x + 2, y1 - 4 - k * 3, 12, C.black);
}

/** Магнит на цепи: цепь от потолка, красная подкова 24×16 с белыми полюсами; низ — bottom. */
export function magnet(pix, cx, ceiling, bottom) {
  const top = bottom - 16;
  for (let y = ceiling; y < top; y++) {
    const link = (y - ceiling) % 8;
    for (let dx = -3; dx <= 3; dx++) {
      const ring = link < 6 ? Math.abs(dx) === 3 || link === 0 || link === 5 : dx === 0;
      if (ring) pix.set(cx + dx, y, link < 6 ? C.silver : C.gray);
    }
  }
  for (let dy = 0; dy < 16; dy++)
    for (let dx = -12; dx < 12; dx++) {
      const ax = dx + 0.5;
      const outer = dy < 8 ? Math.hypot(ax, 8 - dy) <= 12 : Math.abs(ax) <= 12;
      const inner = dy < 8 ? Math.hypot(ax, 8 - dy) < 5 : Math.abs(ax) < 5;
      if (!outer || inner) continue;
      const rim =
        (dy < 8 ? Math.hypot(ax, 8 - dy) > 11 : Math.abs(ax) > 11) ||
        (dy < 8 ? Math.hypot(ax, 8 - dy) < 6 : Math.abs(ax) < 6) ||
        dy === 15;
      const pole = dy >= 11;
      pix.set(cx + dx, top + dy, rim ? C.black : pole ? C.white : C.red);
    }
}

/** Дверь-выход: проём 24×32 в рамке; x, y — левый верх. */
export function door(pix, x, y) {
  pix.rect(x, y, 24, 32, C.black);
  pix.rect(x + 2, y + 2, 20, 30, W8.panelLight);
  pix.rect(x + 4, y + 4, 16, 28, C.black);
  for (let k = 0; k < 4; k++) pix.hline(x + 6, y + 8 + k * 6, 12, W8.girderLight);
}

/**
 * Стены по сетке тайлов: сетка внутри, полоса в жёлто-чёрную диагональ с белой кромкой —
 * только по краям, где стена граничит с пустотой (стыки соседних стен не видны).
 * solidAt(tx, ty) — сплошной ли тайл (за краем карты — да).
 */
export function walls(pix, cols, rows, T, solidAt) {
  const B = 12;
  const stripe = (px, py) => (Math.floor((px + py) / 6) % 2 === 0 ? W8.stripe : C.black);
  for (let ty = 0; ty < rows; ty++)
    for (let tx = 0; tx < cols; tx++) {
      if (!solidAt(tx, ty)) continue;
      const x0 = tx * T;
      const y0 = ty * T;
      mesh(pix, x0, y0, T, T);
      const open = {
        t: !solidAt(tx, ty - 1),
        b: !solidAt(tx, ty + 1),
        l: !solidAt(tx - 1, ty),
        r: !solidAt(tx + 1, ty),
      };
      for (let y = y0; y < y0 + T; y++)
        for (let x = x0; x < x0 + T; x++) {
          const dx = x - x0;
          const dy = y - y0;
          const band =
            (open.t && dy < B) ||
            (open.b && dy >= T - B) ||
            (open.l && dx < B) ||
            (open.r && dx >= T - B);
          // Внутренние углы: полоса и там, где пусто по диагонали.
          const corner =
            (!open.t && !open.l && !solidAt(tx - 1, ty - 1) && dx < B && dy < B) ||
            (!open.t && !open.r && !solidAt(tx + 1, ty - 1) && dx >= T - B && dy < B) ||
            (!open.b && !open.l && !solidAt(tx - 1, ty + 1) && dx < B && dy >= T - B) ||
            (!open.b && !open.r && !solidAt(tx + 1, ty + 1) && dx >= T - B && dy >= T - B);
          if (band || corner) pix.set(x, y, stripe(x, y));
          const rim = (open.t && dy === 0) || (open.l && dx === 0) || (open.r && dx === T - 1);
          if (rim) pix.set(x, y, C.white);
        }
    }
}
