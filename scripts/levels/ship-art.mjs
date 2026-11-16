// Арт уровня 3 «Порт старого мирового порядка»: трюм грузового корабля (по кадрам уровня 3
// оригинала — On the Ship: оливковые клёпаные стены, иллюминаторы, красные плафоны, серые
// стальные платформы с фермой снизу и чёрной тенью).
import { NES as C } from './pixels.mjs';

/** Оливковый цвет борта (NES $18) и его тень ($08). */
export const HULL = 0x887000;
export const HULL_DARK = 0x503000;

/** Стена трюма: оливковые листы, швы через 64 px, ряды заклёпок. */
export function hullWall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const lx = x % 64;
    if (lx === 0) return C.black;
    if (lx === 1) return HULL_DARK;
    if ((lx === 4 || lx === 60) && y % 16 === 8) return C.black;
    return HULL;
  });
}

/**
 * Колонна труб за средней платформой (как в оригинале): тёмная ниша с голубыми трубами
 * и болтами. x — левый край, ширина 48.
 */
export function pipeTower(pix, x, y0, y1) {
  pix.fillPattern(x, y0, 48, y1 - y0, (px, py) => {
    const lx = px - x;
    if (lx === 0 || lx === 47) return C.black;
    if ([5, 9, 13, 17].includes(lx)) return C.sky;
    if ([4, 8, 12, 16].includes(lx)) return C.black;
    if ((lx === 28 || lx === 36) && py % 32 === 12) return C.black;
    if (lx === 22) return C.black;
    return HULL_DARK;
  });
  clampPipe(pix, x + 42, y0, y1);
}

/** Тонкая голубая труба с хомутами (как у бортов в оригинале). */
export function clampPipe(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++) {
    pix.set(x - 1, y, C.black);
    pix.set(x, y, C.sky);
    pix.set(x + 1, y, C.paleSky);
    pix.set(x + 2, y, C.black);
    if (y % 32 === 0) {
      pix.rect(x - 3, y, 8, 3, C.black);
      pix.rect(x - 2, y + 1, 6, 1, C.paleSky);
    }
  }
}

/** Иллюминатор: чёрная рама с заклёпками, голубое стекло с бликами. Центр, радиус. */
export function porthole(pix, cx, cy, r = 20) {
  pix.ellipse(cx, cy, r + 2, r + 2, C.black);
  pix.ellipse(cx, cy, r, r, C.gray);
  pix.ellipse(cx, cy, r - 2, r - 2, C.black);
  pix.ellipse(cx, cy, r - 3, r - 3, C.paleSky);
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    // Смещение округляем отдельно — иначе в разных периодах шахты точки ложатся по-разному.
    pix.set(
      cx + Math.round(Math.cos(t) * (r - 1)),
      cy + Math.round(Math.sin(t) * (r - 1)),
      C.white,
    );
  }
  // Блики — косые полосы.
  for (let i = -r; i <= r; i++) {
    for (const off of [-6, -3, 5]) {
      const x = cx + i;
      const y = cy - i + off;
      if ((x - cx) ** 2 + (y - cy) ** 2 < (r - 5) ** 2) pix.set(x, y, C.white);
    }
  }
  // Петля сбоку.
  pix.rect(cx + r + 1, cy - 6, 3, 12, C.black);
  pix.rect(cx + r + 2, cy - 5, 1, 10, C.white);
}

/** Красный плафон в решётке (как в оригинале). Левый верх, 12 × 20. */
export function lamp(pix, x, y) {
  pix.box(x, y, 12, 20, C.red, C.black);
  pix.rect(x + 2, y + 2, 8, 8, C.salmon);
  for (const ly of [y + 4, y + 7]) pix.hline(x + 1, ly, 10, C.darkRed);
  pix.vline(x + 6, y + 1, 10, C.darkRed);
  pix.hline(x + 1, y + 11, 10, C.black);
  pix.rect(x + 2, y + 13, 2, 5, C.white);
  pix.rect(x + 7, y + 13, 3, 3, C.darkRed);
}

/**
 * Стальная платформа (как в оригинале): серая плита с заклёпками на торцах и ферма снизу —
 * белые бруски по краям, зигзаг посередине. Верх — на y. Ширина в px, высота 20.
 */
export function platform(pix, x, y, w) {
  const CAP = 14;
  for (let px = x; px < x + w; px++) {
    const lx = px - x;
    const cap = lx < CAP || lx >= w - CAP;
    for (let ly = 0; ly < 12; ly++) {
      let c = C.silver;
      if (ly === 0) c = C.white;
      else if (ly === 11) c = C.gray;
      else if (cap && (lx === CAP - 1 || lx === w - CAP)) c = C.black;
      else if (!cap && ly === 2) c = C.white;
      if (cap && (ly === 3 || ly === 7) && [3, 4, 9, 10].includes(lx % CAP)) c = C.black;
      pix.set(px, y + ly, c);
    }
    for (let ly = 12; ly < 20; ly++) {
      let c;
      if (ly === 12 || ly === 19) c = C.black;
      else if (cap) c = lx % 3 === 0 ? C.black : C.white;
      else {
        const zig = lx % 8 < 4 ? lx % 4 : 3 - (lx % 4);
        c = ly - 14 === zig ? C.black : C.gray;
      }
      pix.set(px, y + ly, c);
    }
  }
}

/** Чёрная косая тень платформы на стене справа (как в оригинале). */
export function platformShadow(pix, x, y) {
  for (let ly = 0; ly < 26; ly++) {
    const len = ly < 20 ? 12 : 12 - (ly - 19) * 2;
    if (len > 0) pix.hline(x, y + ly, len, C.black);
  }
}

// ——— Палуба (часть 3-1) ———

const T = 16;

/** Небо с облаками (как на палубе в оригинале). */
export function sky(pix, x0, y0, w, h) {
  pix.rect(x0, y0, w, h, C.paleSky);
  for (let x = x0 + 40; x < x0 + w; x += 150) {
    const y = y0 + 20 + ((x * 37) % 90);
    cloud(pix, x, y, 24 + ((x * 13) % 30));
  }
}

/** Облако: несколько белых «бугорков» с плоским низом. */
export function cloud(pix, x, y, w) {
  for (let k = 0; k < w; k += 6) {
    const r = 3 + ((k * 7 + x) % 4);
    pix.ellipse(x + k, y - r + 2, r + 1, r, C.white);
  }
  pix.rect(x - 3, y, w + 6, 3, C.white);
}

/** Море за леерами: голубое, с бликами волн. */
export function sea(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) =>
    (y - y0) % 8 === 2 && (x + (y - y0) * 3) % 24 < 6 ? C.paleSky : C.sky,
  );
}

/** Леера: верхний поручень и стойки до палубы. */
export function railing(pix, x0, x1, y, floorY) {
  pix.rect(x0, y, x1 - x0, 4, HULL_DARK);
  pix.hline(x0, y, x1 - x0, C.black);
  pix.hline(x0, y + 3, x1 - x0, C.black);
  for (let x = x0 + 24; x < x1; x += 96) {
    pix.rect(x, y, 4, floorY - y, HULL_DARK);
    pix.vline(x, y, floorY - y, C.black);
  }
}

/**
 * Палубный настил (как пол палубы в оригинале): серые стальные листы через 64 px с клёпаными
 * накладками, внизу — ферма. y — верх, h — до низа экрана.
 */
export function deckFloor(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const ly = y - y0;
    const lx = (x - x0) % 64;
    if (ly >= h - 8) {
      if (ly === h - 8) return C.black;
      if (lx < 16) return lx % 3 === 0 ? C.black : C.white;
      const zig = lx % 8 < 4 ? lx % 4 : 3 - (lx % 4);
      return ly - (h - 6) === zig ? C.black : C.gray;
    }
    if (ly === 0) return C.white;
    if (lx < 16) {
      if (lx === 15 || lx === 0) return C.black;
      if ((lx === 4 || lx === 10) && ly % 8 === 4) return C.black;
      return C.silver;
    }
    if (ly % 12 === 11) return C.gray;
    if (ly % 12 === 1) return C.white;
    return C.silver;
  });
}

/**
 * Деревянный ящик-контейнер (как большие ящики на палубе оригинала): рамка с уголками, доски.
 * Платформа сверху (oneway): сквозь проходят, на верх встают.
 */
export function woodCrate(wTiles, hTiles) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      pix.rect(x, y, w, h, C.orange);
      // Доски внутри рамки.
      for (let py = y + 6; py < y + h - 6; py++) {
        const ly = py - y - 6;
        for (let px = x + 6; px < x + w - 6; px++) {
          let c = C.brown;
          if (ly % 8 === 0) c = C.black;
          else if ((px * 5 + Math.floor(ly / 8) * 11) % 13 === 0) c = C.orange;
          pix.set(px, py, c);
        }
      }
      // Рамка: светлый верх, тёмные швы, заклёпки в углах.
      pix.hline(x, y + 1, w, C.tan);
      pix.hline(x, y + 5, w, C.black);
      pix.hline(x, y + h - 6, w, C.black);
      pix.vline(x + 5, y + 5, h - 10, C.black);
      pix.vline(x + w - 6, y + 5, h - 10, C.black);
      pix.vline(x + 2, y + 6, h - 12, C.tan);
      for (const [cx, cy] of [
        [x + 2, y + 3],
        [x + w - 4, y + 3],
        [x + 2, y + h - 4],
        [x + w - 4, y + h - 4],
      ])
        pix.rect(cx, cy, 2, 1, C.black);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Мачта: красно-оранжевый ствол в полоску, рея сверху, блок с канатом справа (для люльки). */
export function mast(pix, x, y0, y1) {
  pix.fillPattern(x, y0, 32, y1 - y0, (px) => {
    const lx = px - x;
    if (lx === 0 || lx === 31) return C.black;
    if (lx < 6) return C.red;
    if (lx < 10) return C.salmon;
    if (lx < 16) return C.tan;
    if (lx < 22) return C.orange;
    return C.red;
  });
  // Рея.
  pix.rect(x - 64, y0 + 8, 160, 10, C.orange);
  pix.hline(x - 64, y0 + 8, 160, C.black);
  pix.hline(x - 64, y0 + 10, 160, C.tan);
  pix.hline(x - 64, y0 + 17, 160, C.black);
  // Блок.
  pix.ellipse(x + 44, y0 + 26, 7, 7, C.black);
  pix.ellipse(x + 44, y0 + 26, 5, 5, HULL);
  pix.rect(x + 43, y0 + 18, 3, 6, C.black);
}

/** Щит со спасательными кругами (как в оригинале). Левый верх; 96 × 48. */
export function lifeRings(pix, x, y) {
  pix.box(x, y, 96, 48, C.white, C.black);
  pix.hline(x, y + 4, 96, C.red);
  for (const cx of [x + 26, x + 70]) {
    pix.ellipse(cx, y + 26, 16, 16, C.black);
    pix.ellipse(cx, y + 26, 15, 15, C.red);
    pix.ellipse(cx, y + 26, 9, 9, C.black);
    pix.ellipse(cx, y + 26, 8, 8, C.white);
    for (const [dx, dy] of [
      [-13, -2],
      [11, -2],
      [-2, 11],
      [-2, -14],
    ])
      pix.rect(cx + dx, y + 26 + dy, 3, 4, C.white);
  }
}

/** Надстройка: оливковая клёпаная стена с иллюминатором (вход в трюм — дверь в ней). */
export function cabin(pix, x, y, w, h) {
  hullWall(pix, x, y, w, h);
  pix.rect(x, y, w, 6, HULL_DARK);
  pix.hline(x, y + 6, w, C.black);
  pix.vline(x, y, h, C.black);
  porthole(pix, x + w / 2, y + 40, 14);
}

/** Стальная дверь в надстройке и зона выхода (вход в трюм). */
export function placeHatchDoor(m, col, floorRow) {
  m.decor((p) => {
    const x = col * T;
    const fy = floorRow * T;
    p.box(x, fy - 56, 32, 56, C.gray, C.black);
    p.rect(x + 3, fy - 53, 26, 50, C.silver);
    p.ellipse(x + 16, fy - 38, 6, 6, C.black);
    p.ellipse(x + 16, fy - 38, 4, 4, C.paleSky);
    p.rect(x + 23, fy - 24, 4, 3, C.black);
    for (const ry of [fy - 50, fy - 10]) p.hline(x + 4, ry, 24, C.gray);
  });
  m.zone('exit', col * T + 4, floorRow * T - 48, 24, 48);
}

// ——— Трюм (часть 3-2) ———

/** Нижняя стена трюма: тёмные вертикальные рейки с голубыми бликами (как в оригинале). */
export function stripedWall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const ly = y - y0;
    if (ly < 3) return ly === 1 ? C.sky : C.black;
    const lx = x % 8;
    if (lx === 0) return C.black;
    if (lx === 2) return C.sky;
    return HULL_DARK;
  });
}

/** Полоса труб с вентилями на стене (фон между верхом и низом трюма). */
export function valveBand(pix, x0, y, w) {
  pix.rect(x0, y, w, 18, HULL);
  pix.hline(x0, y, w, C.sky);
  pix.hline(x0, y + 17, w, C.black);
  for (let x = x0; x < x0 + w; x += 8) pix.set(x, y + 2, C.paleSky);
  for (let x = x0 + 40; x < x0 + w; x += 120) {
    pix.ellipse(x, y + 9, 7, 7, C.sky);
    pix.ellipse(x, y + 9, 5, 5, HULL);
    pix.hline(x - 5, y + 9, 11, C.sky);
    pix.vline(x, y + 4, 11, C.sky);
  }
}

/** Гора мешков с грузом: oneway сверху. wTiles × hTiles. */
export function sacks(wTiles, hTiles) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      const rowH = 16;
      // Крупные мешки, как в оригинале: ряды со сдвигом на полмешка.
      for (let ry = y + h - rowH, k = 0; ry >= y - 4; ry -= rowH, k++) {
        const off = k % 2 ? 13 : 0;
        for (let rx = x - 6 + off; rx < x + w - 6; rx += 26) {
          pix.ellipse(rx + 13, ry + 8, 14, 8, C.black);
          pix.ellipse(rx + 13, ry + 8, 13, 7, C.salmon);
          pix.ellipse(rx + 13, ry + 9, 12, 5, C.red);
          pix.hline(rx + 5, ry + 3, 10, C.white);
          pix.hline(rx + 3, ry + 12, 20, C.darkRed);
          pix.hline(rx + 9, ry + 7, 8, C.salmon);
        }
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Стальная полка (та же платформа, что в шахте арены): oneway. */
export function steelShelf(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      platform(pix, x, y, wTiles * T);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}
