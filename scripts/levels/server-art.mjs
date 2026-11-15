// Арт уровня 2 «Серверная когнитивной войны» (по структуре уровня 2 оригинала — канализации:
// фиолетовые стены, трубы как платформы, светлый пол плитами, пропасти; своя обстановка —
// серверные стойки, кабельные лотки, медные трубы охлаждения).
// Предмет: { w, h (тайлы), draw(pix, x, y) — левый верх в px, collide(m, col, top) }.
// Мебель не останавливает (как в оригинале): у стоек, лотков и труб — только верх (oneway).
import { NES as C } from './pixels.mjs';

const T = 16;

// ——— Фоны ———

/**
 * Стена серверной: крупные фиолетовые панели с чёрными швами и синими подтёками-бликами,
 * как кирпич в канализации оригинала. Через каждые 128 px — клёпаная колонна.
 */
export function wall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const row = Math.floor(y / 32);
    const off = row % 2 ? 24 : 0;
    const lx = (x + off) % 48;
    const ly = y % 32;
    // Клёпаная колонна.
    const cx = x % 128;
    if (cx >= 56 && cx < 72) {
      if (cx === 56 || cx === 71) return C.black;
      if ((cx === 60 || cx === 66) && y % 16 === 6) return C.periwinkle;
      if ((cx === 61 || cx === 67) && y % 16 === 7) return C.black;
      return cx < 59 ? C.azure : C.navy;
    }
    if (ly === 0 || lx === 0) return C.black;
    if (ly === 1 || lx === 1) return C.blue;
    // Подтёки — короткие вертикальные блики под верхним швом.
    if (ly < 9 && (lx * 7 + row * 3) % 11 === 0) return C.blue;
    return C.violet;
  });
}

/** Тёмная шахта: стены темнее, чтобы спуск читался отдельно. */
export function shaftWall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const lx = x % 32;
    const ly = y % 16;
    if (lx === 0 || ly === 0) return C.black;
    if (lx === 1 || ly === 1) return C.violet;
    return C.navy;
  });
}

/**
 * Фальшпол серверной: светлые плиты (как плиты пола в канализации оригинала) с бликом,
 * под ними — тёмное подполье с кабелями. y — верх пола, h — толщина до низа экрана.
 */
export function raisedFloor(pix, x, y, w, h) {
  pix.fillPattern(x, y, w, h, (px, py) => {
    const ly = py - y;
    const lx = (px - x) % 32;
    if (ly < 14) {
      if (ly === 0 || ly === 13 || lx === 0) return C.black;
      if (ly === 1 || lx === 1) return C.white;
      if (ly === 2 && lx < 12) return C.white;
      return C.mint;
    }
    if (ly === 14) return C.black;
    // Подполье: кабели волной по тёмному.
    const wave = Math.round(Math.sin((px + ly * 3) / 9) * 2);
    if (ly === 20 + wave) return C.orange;
    if (ly === 25 - wave) return C.azure;
    return C.black;
  });
}

/** Пропасть в полу: чёрный провал с обрывками кабелей. */
export function pit(pix, x, y, w, h) {
  pix.rect(x, y, w, h, C.black);
  for (let k = 6; k < w - 4; k += 13) {
    const len = 8 + ((k * 5) % 11);
    pix.vline(x + k, y, len, k % 2 ? C.orange : C.azure);
  }
}

// ——— Мебель ———

/** Серверная стойка: 2 тайла шириной, hTiles высотой; верх — платформа. */
export function rack(hTiles = 2) {
  return {
    w: 2,
    h: hTiles,
    draw(pix, x, y) {
      const h = hTiles * T;
      pix.rect(x, y, 32, h, C.gray);
      pix.rect(x, y, 32, 3, C.silver);
      pix.hline(x, y, 32, C.white);
      pix.vline(x + 2, y + 3, h - 3, C.black);
      pix.vline(x + 29, y + 3, h - 3, C.black);
      for (let u = y + 5; u < y + h - 3; u += 6) {
        pix.rect(x + 4, u, 24, 4, C.black);
        pix.hline(x + 4, u, 24, C.silver);
        const n = (u * 7 + x) % 5;
        pix.set(x + 7, u + 2, n === 0 ? C.red : C.ledGreen);
        pix.set(x + 9, u + 2, n === 3 ? C.gold : C.ledGreen);
        pix.hline(x + 13, u + 2, 12, C.gray);
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + 1, top);
    },
  };
}

/** Кабельный лоток на подвесах: платформа, снизу свисают кабели. */
export function cableTray(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      // Подвесы к потолку.
      for (const hx of [x + 6, x + w - 8]) pix.rect(hx, y - 40, 2, 40, C.gray);
      pix.rect(x, y, w, 6, C.silver);
      pix.hline(x, y, w, C.white);
      pix.hline(x, y + 5, w, C.gray);
      for (let k = 4; k < w; k += 8) pix.vline(x + k, y + 1, 4, C.gray);
      // Кабели провисают между подвесами.
      for (let k = 0; k < w; k++) {
        const sag = Math.round(Math.sin((k / w) * Math.PI) * 5);
        pix.set(x + k, y + 7 + sag, C.orange);
        pix.set(x + k, y + 9 + Math.round(sag * 0.6), C.azure);
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/**
 * Медная труба охлаждения (как трубы-платформы в канализации оригинала): горизонтальный
 * участок — платформа; legs — опускать ли колена к полу по краям (до floorY).
 */
export function copperPipe(wTiles, floorY = null) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      const tube = (tx, ty, tw, th, vertical) => {
        pix.rect(tx, ty, tw, th, C.orange);
        if (vertical) {
          pix.rect(tx + 2, ty, 3, th, C.tan);
          pix.vline(tx + 3, ty, th, C.white);
          pix.rect(tx + tw - 3, ty, 3, th, C.brown);
        } else {
          pix.rect(tx, ty + 2, tw, 3, C.tan);
          pix.hline(tx, ty + 3, tw, C.white);
          pix.rect(tx, ty + th - 3, tw, 3, C.brown);
        }
      };
      if (floorY !== null) {
        tube(x, y + 12, 12, floorY - y - 12, true);
        tube(x + w - 12, y + 12, 12, floorY - y - 12, true);
      }
      tube(x, y, w, 12, false);
      // Муфты.
      for (let k = 14; k < w - 8; k += 40) {
        pix.rect(x + k, y - 1, 4, 14, C.brown);
        pix.vline(x + k + 1, y - 1, 14, C.tan);
      }
      // Колена — светлые «бочонки» по краям, как в оригинале.
      for (const ex of [x, x + w - 12]) {
        pix.rect(ex, y - 1, 12, 14, C.white);
        pix.rect(ex + 1, y + 9, 10, 3, C.tan);
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Вертикальная синяя труба на стене (декор, как синие трубы оригинала). */
export function bluePipe(pix, x, y0, y1) {
  pix.rect(x, y0, 12, y1 - y0, C.blue);
  pix.rect(x + 2, y0, 3, y1 - y0, C.azure);
  pix.vline(x + 3, y0, y1 - y0, C.paleSky);
  pix.rect(x + 9, y0, 3, y1 - y0, C.navy);
  for (let y = y0 + 20; y < y1 - 8; y += 64) {
    pix.rect(x - 2, y, 16, 6, C.azure);
    pix.hline(x - 2, y, 16, C.paleSky);
  }
}

/** Монитор с паническим заголовком на стене (декор). */
export function wallMonitor(pix, x, y) {
  pix.box(x, y, 40, 28, C.black, C.gray);
  pix.rect(x + 3, y + 3, 34, 8, C.red);
  for (let k = 0; k < 3; k++) pix.rect(x + 8 + k * 9, y + 4, 2, 5, C.white);
  for (let r = 0; r < 3; r++) pix.hline(x + 4, y + 14 + r * 4, 28 - r * 6, C.silver);
  pix.rect(x + 18, y + 28, 4, 6, C.gray);
}

/** Дверь серверной с зелёной табличкой «выход» и зона выхода. */
export function placeExitDoor(m, col, floorRow) {
  m.decor((p) => {
    const x = col * T;
    const fy = floorRow * T;
    p.box(x, fy - 64, 32, 64, C.gray, C.black);
    p.rect(x + 3, fy - 61, 26, 58, C.silver);
    p.rect(x + 6, fy - 56, 20, 14, C.black);
    p.rect(x + 8, fy - 54, 16, 10, C.paleSky);
    p.rect(x + 23, fy - 32, 4, 3, C.black);
    p.box(x + 4, fy - 78, 24, 10, C.green, C.darkGreen);
    p.rect(x + 7, fy - 75, 18, 4, C.white);
  });
  m.zone('exit', col * T + 4, floorRow * T - 48, 24, 48);
}
