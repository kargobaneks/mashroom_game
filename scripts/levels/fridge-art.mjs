// Арт уровня 4 «Заморозка-2007» по кадрам Гигантского холодильника оригинала
// (docs/refs/level_4_*.png): тёмно-синяя стенка, стойки с инеем и болтами, висящие полосы инея,
// решётки вентиляции; пол из клёпаных деревянных ящиков; ряды банок, оранжевые ящики,
// полки холодильника, заиндевевшие трубы с вентилями, фермы, морозильные блоки, сугробы.
// Вместо надписей оригинала — «2007» и «07»: всё в холодильнике — из 2007 года.
import { NES as C } from './pixels.mjs';

const T = 16;

/** Цвета, снятые с кадров оригинала. */
export const FRIDGE = {
  wall: 0x0e2b61,
  frost: 0x39835c,
  orange: 0xf2a73b,
  wood: 0xae4d1e,
  steel: 0xb2b2b2,
};

// ——— Фон ———

/** Стенка холодильника: ровная тёмно-синяя. */
export function wall(pix, x0, y0, w, h) {
  pix.rect(x0, y0, w, h, FRIDGE.wall);
}

/** Детерминированный «шум» по координатам (одинаковый при каждой сборке). */
const noise = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

/** Вертикальная стойка: белая полоса, слева иней, справа болты через 48 px (как в оригинале). */
export function pole(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++) {
    pix.set(x, y, C.black);
    pix.set(x + 1, y, C.white);
    pix.set(x + 2, y, C.white);
    pix.set(x + 3, y, C.black);
    // Иней — рваная зелёная кромка слева.
    const n = noise(x, y) % 5;
    for (let k = 1; k <= n; k++) pix.set(x - k, y, k === 1 && n > 2 ? C.white : FRIDGE.frost);
    if ((y - y0) % 48 === 12) {
      pix.ellipse(x + 8, y, 2, 2, C.black);
      pix.set(x + 8, y, C.gray);
    }
  }
}

/** Висящая полоса инея (сверху вниз): белая середина, зелёные рваные края. */
export function frostStrand(pix, x, y0, len) {
  for (let y = y0; y < y0 + len; y++) {
    const ly = y - y0;
    const taper = ly > len - 8 ? Math.max(0, 3 - Math.floor((ly - (len - 8)) / 3)) : 3;
    const n = noise(x + 7, y) % 3;
    for (let dx = -taper - n; dx <= taper + (noise(y, x) % 2); dx++) {
      const core = Math.abs(dx) <= 1;
      pix.set(x + dx, y, core ? C.white : FRIDGE.frost);
    }
  }
}

/** Решётка вентиляции: чёрная рамка, тёмные планки с зелёной кромкой. */
export function vent(pix, x, y, w, h) {
  pix.rect(x, y, w, h, C.black);
  for (let ly = 3; ly < h - 3; ly += 4) {
    pix.hline(x + 3, y + ly, w - 6, FRIDGE.wall);
    pix.set(x + 3, y + ly, FRIDGE.frost);
    pix.set(x + 3, y + ly + 1, FRIDGE.frost);
  }
  pix.vline(x + 1, y + 1, h - 2, FRIDGE.frost);
  pix.vline(x + w - 2, y + 1, h - 2, FRIDGE.wall);
  for (const [cx, cy] of [
    [x + 2, y + 1],
    [x + w - 3, y + 1],
    [x + 2, y + h - 2],
    [x + w - 3, y + h - 2],
  ])
    pix.set(cx, cy, C.gray);
}

// ——— Пол ———

/** Пол из клёпаных деревянных ящиков (как в оригинале): ящик 64 × 32, стальная рамка, косой крест. */
export function crateFloor(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const lx = (x - x0) % 64;
    const ly = (y - y0) % 32;
    if (lx === 0 || ly === 0) return C.black;
    // Стальная рамка сверху и по бокам.
    if (ly <= 5) {
      if (ly === 1) return C.white;
      if ((lx === 6 || lx === 58) && ly === 3) return C.black;
      return (lx + ly * 3) % 11 === 0 ? C.white : C.steel;
    }
    if (lx <= 4 || lx >= 60) return lx === 2 || lx === 62 ? C.black : C.steel;
    // Доски с крестом.
    const u = lx - 5;
    const v = ly - 6;
    const d1 = Math.abs(u * 26 - v * 55) < 40;
    const d2 = Math.abs((54 - u) * 26 - v * 55) < 40;
    if (d1 || d2) return (u + v) % 4 === 0 ? C.white : C.steel;
    if (v % 7 === 0) return C.black;
    return (u * 3 + v) % 13 === 0 ? FRIDGE.orange : FRIDGE.wood;
  });
}

// ——— Мебель (oneway: на верх встают, сквозь проходят) ———

const oneway = (wTiles) => (m, col, top) => m.oneway(col, col + wTiles - 1, top);

/** Сугроб на верхней кромке (декор, как в оригинале). Низ — на y. */
export function snowPile(pix, x, y, w = 16) {
  for (let lx = 0; lx < w; lx++) {
    const t = Math.sin((lx / (w - 1)) * Math.PI);
    const hgt = Math.max(1, Math.round(t * (w * 0.55)) + (noise(x + lx, y) % 2));
    for (let ly = 0; ly < hgt; ly++) {
      const edge = ly === hgt - 1 && noise(lx, x) % 3 === 0;
      pix.set(x + lx, y - 1 - ly, edge ? FRIDGE.frost : C.white);
    }
  }
}

/** Цифры 3 × 5 для надписей «2007» / «07». */
const DIGITS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
};
function digits(pix, x, y, text, color) {
  [...text].forEach((ch, i) => {
    DIGITS[ch].forEach((row, ry) => {
      for (let rx = 0; rx < 3; rx++) if (row[rx] === '#') pix.set(x + i * 4 + rx, y + ry, color);
    });
  });
}

/**
 * Ряд банок газировки 2007 года (как банки с вишней в оригинале): красный верх с ягодой,
 * белый низ с «07». Банка 24 px шириной.
 */
export function cans(wTiles, hTiles = 2) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      for (let cx = x; cx < x + w; cx += 24) {
        const cw = Math.min(24, x + w - cx);
        pix.rect(cx, y, cw, h, C.white);
        pix.rect(cx, y, cw, Math.floor(h * 0.45), C.red);
        pix.rect(cx, y + 2, cw, 3, FRIDGE.orange);
        pix.hline(cx, y, cw, C.silver);
        pix.vline(cx, y, h, C.black);
        // Ягода на этикетке.
        if (cw >= 16) {
          pix.ellipse(cx + 9, y + 9, 2, 2, C.darkRed);
          pix.ellipse(cx + 14, y + 9, 2, 2, C.darkRed);
          pix.set(cx + 11, y + 6, C.black);
          pix.set(cx + 12, y + 5, C.black);
          digits(pix, cx + 6, y + h - 12, '07', C.red);
        }
        pix.vline(cx + cw - 3, y + Math.floor(h * 0.45), Math.ceil(h * 0.55), C.silver);
      }
    },
    collide: oneway(wTiles),
  };
}

/** Оранжевые ящики «2007» с красными рейками и косыми распорками (ящики SNFI оригинала). */
export function crates2007(wTiles, hTiles) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      pix.rect(x, y, w, h, FRIDGE.orange);
      for (let by = y; by < y + h; by += 16) {
        pix.hline(x, by, w, C.black);
        pix.rect(x, by + 11, w, 3, C.red);
        pix.hline(x, by + 1, w, C.white);
      }
      for (let bx = x; bx < x + w; bx += 48) {
        pix.vline(bx, y, h, C.black);
        // Распорки «X» по краям, надпись в середине.
        for (let ly = 0; ly < h; ly++) {
          const k = ly % 16;
          pix.set(bx + 2 + Math.floor(k / 2), y + ly, C.red);
          pix.set(bx + 10 - Math.floor(k / 2), y + ly, C.red);
        }
        pix.vline(bx + 13, y, h, C.white);
        pix.vline(bx + 14, y, h, C.red);
        for (let by = y; by < y + h; by += 16) digits(pix, bx + 19, by + 4, '2007', C.red);
      }
    },
    collide: oneway(wTiles),
  };
}

/** Полка холодильника (зелёная стальная рама): сверху бутылки, снизу трубки старых телефонов. */
export function fridgeShelf(wTiles, hTiles = 3) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      pix.rect(x, y, w, h, C.black);
      // Верхняя кромка в снегу.
      pix.rect(x, y, w, 4, C.white);
      for (let lx = 0; lx < w; lx += 3) pix.set(x + lx, y + 3, FRIDGE.frost);
      pix.set(x + 4, y + 2, C.black);
      pix.set(x + w - 5, y + 2, C.black);
      // Стойки рамы.
      for (const sx of [x + 2, x + w - 5]) {
        pix.rect(sx, y + 4, 3, h - 4, FRIDGE.frost);
        pix.vline(sx + 1, y + 4, h - 4, C.white);
      }
      const mid = y + Math.floor(h / 2);
      pix.rect(x, mid, w, 3, FRIDGE.frost);
      pix.hline(x, mid, w, C.white);
      // Верхний ярус: бутылки.
      for (let bx = x + 10; bx + 8 < x + w - 4; bx += 14) {
        pix.rect(bx + 2, y + 7, 3, 4, FRIDGE.frost);
        pix.rect(bx, y + 11, 7, mid - y - 11, FRIDGE.frost);
        pix.vline(bx + 1, y + 12, mid - y - 14, C.white);
      }
      // Нижний ярус: трубки телефонов.
      for (let bx = x + 9; bx + 12 < x + w - 4; bx += 16) {
        const by = mid + 6;
        pix.rect(bx, by, 12, 3, FRIDGE.frost);
        pix.rect(bx, by + 3, 3, 3, C.white);
        pix.rect(bx + 9, by + 3, 3, 3, C.white);
        pix.rect(bx + 3, by + 8, 6, 4, C.white);
      }
    },
    collide: oneway(wTiles),
  };
}

/** Большой клёпаный ящик: стальная рамка, доски с крестом (как в оригинале). */
export function bigCrate(wTiles, hTiles) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      crateFloor(pix, x, y, wTiles * T, hTiles * T);
      pix.rect(x, y, wTiles * T, 1, C.black);
    },
    collide: oneway(wTiles),
  };
}

/** Морозильный блок: белая решётка с тёмными окнами и жёлтыми бликами, сверху крышка. */
export function freezerUnit(wTiles, hTiles = 2) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      // Крышка-цилиндр сверху по центру — не выше верха блока.
      pix.rect(x, y, w, h, C.white);
      const grid = Math.floor(h * 0.55);
      for (let gy = y + 2; gy < y + grid; gy += 6)
        for (let gx = x + 2; gx < x + w - 2; gx += 7) {
          pix.rect(gx, gy, 6, 5, C.black);
          if ((gx + gy) % 3 === 0) pix.hline(gx + 1, gy + 2, 4, C.gold);
        }
      pix.rect(x, y + grid, w, h - grid, FRIDGE.frost);
      pix.hline(x, y + grid, w, C.black);
      pix.rect(x + Math.floor(w / 2) - 10, y + grid + 3, 20, 6, C.white);
      pix.rect(x + Math.floor(w / 2) - 9, y + grid + 4, 18, 4, C.silver);
      for (const sx of [x + 3, x + w - 8])
        for (let ly = grid + 2; ly < h - 1; ly += 2) pix.hline(sx, y + ly, 5, C.black);
    },
    collide: oneway(wTiles),
  };
}

/**
 * Заиндевевшая труба (как в оригинале): белое тело, зелёный иней снизу, кольца-хомуты,
 * торцы, чёрная тень под трубой. Верх трубы — верх тайла. valveAt — колонка вентиля (от левого края).
 */
export function pipe(wTiles, valveAt = -1) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      // Тень под трубой.
      pix.rect(x + 4, y + 14, w, 8, C.black);
      for (let lx = 0; lx < w; lx++) {
        const end = lx < 3 || lx >= w - 3;
        for (let ly = 0; ly < 14; ly++) {
          let c = C.white;
          if (ly === 0 || ly === 13) c = C.black;
          else if (ly >= 8) c = noise(x + lx, ly) % 4 < 3 - (ly - 8) / 3 ? FRIDGE.frost : C.white;
          else if (ly >= 6) c = noise(lx, x) % 5 === 0 ? FRIDGE.frost : C.white;
          if (end)
            c = lx === 1 || lx === w - 2 ? C.black : ly === 0 || ly === 13 ? C.black : C.white;
          pix.set(x + lx, y + ly, c);
        }
      }
      // Хомуты.
      for (let lx = 24; lx < w - 8; lx += 56) {
        pix.rect(x + lx, y, 5, 14, C.white);
        pix.vline(x + lx, y, 14, C.black);
        pix.vline(x + lx + 5, y, 14, C.black);
        pix.vline(x + lx + 2, y + 2, 10, FRIDGE.frost);
      }
      if (valveAt >= 0) {
        const vx = x + valveAt * T + 8;
        pix.rect(vx - 1, y - 9, 3, 9, FRIDGE.frost);
        pix.vline(vx, y - 9, 9, C.white);
        pix.rect(vx - 7, y - 11, 15, 3, C.white);
        pix.hline(vx - 7, y - 10, 15, FRIDGE.frost);
        pix.rect(vx - 2, y - 3, 5, 3, C.steel);
      }
    },
    collide: oneway(wTiles),
  };
}

/** Ферма (балка-полка с косой решёткой, как в оригинале). Верх — верх тайла, высота 20 px. */
export function girder(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x + 6, y + 18, w, 8, C.black);
      for (let lx = 0; lx < w; lx++) {
        for (let ly = 0; ly < 20; ly++) {
          let c;
          if (ly === 0 || ly === 19) c = C.black;
          else if (ly <= 3) c = ly === 1 ? C.white : C.steel;
          else if (ly === 4 || ly === 15) c = C.black;
          else if (ly >= 16) c = ly === 17 ? FRIDGE.wood : C.white;
          else {
            const z = lx % 16 < 8 ? lx % 8 : 7 - (lx % 8);
            const d = Math.abs(ly - 5 - z * 1.25);
            c = d < 1.2 ? C.black : d < 2.2 ? C.white : lx % 16 === 0 ? C.black : FRIDGE.wood;
          }
          if ((ly === 2 || ly === 17) && lx % 8 === 4) c = C.black;
          pix.set(x + lx, y + ly, c);
        }
      }
    },
    collide: oneway(wTiles),
  };
}

/**
 * Выход — чёрный проём вентиляции с инеем по краям (как в оригинале, кадр с таймером 1'03).
 * col, row — левый верх проёма в тайлах; низ проёма стоит на трубе. Зона выхода — в проёме.
 */
export function placeExitVent(m, col, row, wTiles = 3, hTiles = 3) {
  m.decor((p) => {
    const x = col * T;
    const y = row * T;
    const w = wTiles * T;
    const h = hTiles * T;
    p.rect(x, y, w, h, C.black);
    for (let ly = 0; ly < h; ly++) {
      const n = noise(x, y + ly) % 4;
      for (let k = 0; k < n + 2; k++) {
        p.set(x + 1 + k, y + ly, k === 0 ? C.white : FRIDGE.frost);
        p.set(x + w - 2 - k, y + ly, k === 0 ? C.white : FRIDGE.frost);
      }
    }
    p.rect(x, y, w, 3, C.white);
    p.hline(x, y + 3, w, FRIDGE.frost);
  });
  m.zone('exit', col * T + 4, row * T, wTiles * T - 8, hTiles * T);
}
