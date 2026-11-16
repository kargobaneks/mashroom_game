// Арт уровня 5 «Дореформенный архив»: склад и портретный зал по кадрам уровня 5 оригинала
// (docs/refs/level_5_part_1..10.png). Склад: синяя стена в шахматку с трещинами (сквозь них
// видна кладка), цепные колонны с лампами-горгульями, цепная балка поперёк, красные балки-
// платформы, широкий красный пол над балюстрадой, деревянные шкафы-ступени, большая дверь «22».
// Зал: обои с узором, серый деревянный столб, полки с подсвечниками, свечи, буфет, портрет.
// Цвета сняты с кадров.
import { NES as C } from './pixels.mjs';

const T = 16;

export const W5 = {
  wallA: 0x0103a5,
  wallB: 0x06009a,
  brick: 0x21028e,
  wine: 0x5d1308,
  red: 0xd33b20,
  cream: 0xfce0a8,
  chain: 0x7c7c7c,
  domeCyan: 0x5fe0b0,
  domePurple: 0xb030c0,
  paper: 0x21028e,
  paperPat: 0x183af5,
  sideboard: 0x7c160d,
  gray: 0x5e5e5e,
};

const noise = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

// ——— Склад: фон ———

/** Стена склада: синяя шахматка. */
export function wall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => ((x + y) % 2 === 0 ? W5.wallA : W5.wallB));
}

/** Трещина в штукатурке, сквозь неё видна кладка (как в оригинале). Центр, размер ~56×32. */
export function crack(pix, cx, cy) {
  for (let y = -14; y <= 14; y++)
    for (let x = -26; x <= 26; x++) {
      const r = (x * x) / 26 / 26 + (y * y) / 14 / 14;
      if (r > 1) continue;
      const brickEdge =
        (y + 14) % 9 === 0 || (x + 26 + (Math.floor((y + 14) / 9) % 2) * 8) % 16 === 0;
      pix.set(cx + x, cy + y, brickEdge || r > 0.85 ? C.black : W5.brick);
    }
  // Лучи трещин.
  for (const [dx, dy, len] of [
    [1, -1, 10],
    [-1, -1, 8],
    [1, 1, 9],
    [-1, 0.5, 9],
  ])
    for (let i = 0; i < len; i++)
      pix.set(cx + Math.sign(dx) * (24 + i), cy + Math.round(dy * i * 0.6) - 2, C.black);
}

/** Цепная колонна (вертикальная): винная рамка, внутри серая цепь. x — левый край, ширина 16. */
export function chainPillar(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++) {
    pix.set(x, y, C.black);
    pix.set(x + 1, y, W5.wine);
    pix.set(x + 2, y, W5.wine);
    pix.set(x + 13, y, W5.wine);
    pix.set(x + 14, y, W5.wine);
    pix.set(x + 15, y, C.black);
    for (let lx = 3; lx < 13; lx++) {
      const ly = (y - y0) % 16;
      // Звено: овал, чередуется ребром.
      const link =
        ly < 8
          ? (lx === 4 || lx === 11) && ly > 0 && ly < 7
          : (lx === 6 || lx === 9) && ly > 8 && ly < 15;
      const cap = (ly === 0 || ly === 7) && lx > 4 && lx < 11;
      const cap2 = (ly === 8 || ly === 15) && lx > 6 && lx < 9;
      pix.set(x + lx, y, link || cap || cap2 ? C.chain : lx % 5 === 0 ? W5.wine : C.black);
    }
  }
}

/** Цепная балка поперёк (фон): винная, внутри серый орнамент. y — верх, высота 16. */
export function chainBeam(pix, x0, x1, y) {
  for (let x = x0; x < x1; x++) {
    pix.set(x, y, C.black);
    pix.set(x, y + 1, W5.wine);
    pix.set(x, y + 14, W5.wine);
    pix.set(x, y + 15, C.black);
    for (let ly = 2; ly < 14; ly++) {
      const u = x % 24;
      const v = ly - 2;
      const curl = Math.abs(((u + v * 2) % 12) - 6) === 0 || (v === 6 && u % 12 < 6);
      pix.set(x, y + ly, curl ? C.chain : (x + ly) % 7 === 0 ? W5.wine : C.black);
    }
  }
}

/** Лампа-горгулья на колонне (как в оригинале): бирюзовый колпак с фиолетовым огнём, серая фигура. */
export function gargoyleLamp(pix, cx, y) {
  // Фиолетовый огонь над колпаком.
  for (let i = 0; i < 4; i++)
    pix.rect(cx - 6 + i * 4, y - 10 + (i % 2) * 3, 2, 10 - (i % 2) * 3, W5.domePurple);
  pix.ellipse(cx, y + 4, 8, 6, W5.domeCyan);
  pix.rect(cx - 8, y + 4, 17, 6, W5.domeCyan);
  pix.rect(cx - 8, y + 9, 17, 2, W5.domePurple);
  pix.hline(cx - 8, y + 11, 17, C.black);
  // Горгулья: голова, крылья, лапы.
  pix.rect(cx - 7, y + 12, 15, 18, C.gray);
  pix.rect(cx - 5, y + 15, 3, 2, C.black);
  pix.rect(cx + 3, y + 15, 3, 2, C.black);
  pix.rect(cx - 3, y + 21, 7, 3, C.black);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++)
      pix.hline(cx + s * (8 + i) - (s < 0 ? 2 : 0), y + 14 + i, 3, i % 3 === 0 ? C.black : C.gray);
    pix.rect(cx + s * 5 - 2, y + 30, 4, 4, C.gray);
  }
  pix.hline(cx - 7, y + 12, 15, C.silver);
}

// ——— Склад: пол и мебель ———

/**
 * Пол склада (как в оригинале): кремовая кромка, широкая красная полоса, ниже — тёмная
 * балюстрада: зубчатый карниз и винные столбики на чёрном. y0 — верх пола, h — высота.
 */
export function floor(pix, x0, y0, w, h) {
  pix.rect(x0, y0, w, h, C.black);
  pix.hline(x0, y0, w, W5.cream);
  pix.rect(x0, y0 + 1, w, 2, W5.red);
  pix.rect(x0, y0 + 3, w, 9, W5.wine);
  pix.hline(x0, y0 + 12, w, C.black);
  for (let x = x0; x < x0 + w; x++) {
    const u = (x - x0) % 8;
    for (let ly = 14; ly < 19; ly++)
      if (u >= 1 && u <= 5 && ly - 14 <= u - 1) pix.set(x, y0 + ly, W5.wine);
    pix.set(x, y0 + 19, W5.wine);
    if ((x - x0) % 16 < 2) pix.vline(x, y0 + 20, h - 20, W5.wine);
    else if ((x - x0) % 16 === 2) pix.vline(x, y0 + 20, h - 20, W5.red);
  }
}

const oneway = (wTiles) => (m, col, top) => m.oneway(col, col + wTiles - 1, top);

/**
 * Красная балка (как в оригинале): кремовая кромка, красное тело с заклёпками и накладками,
 * тёмный низ и тень. Верх — верх тайла, высота 16. Мебель: oneway.
 */
export function girder(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x + 3, y + 16, w, 3, C.black);
      pix.rect(x, y, w, 16, W5.red);
      pix.hline(x, y, w, W5.cream);
      pix.hline(x, y + 1, w, W5.cream);
      pix.rect(x, y + 12, w, 4, W5.wine);
      for (let bx = x + 10; bx < x + w - 6; bx += 34) {
        for (const [dx, dy] of [
          [0, 4],
          [4, 4],
          [0, 8],
          [4, 8],
        ])
          pix.set(bx + dx + 12, y + dy, C.black);
        pix.rect(bx, y + 3, 3, 12, W5.cream);
        pix.vline(bx + 3, y + 3, 12, W5.wine);
      }
    },
    collide: oneway(wTiles),
  };
}

/**
 * Деревянный шкаф-ступень (как в оригинале): сверху — тёмная крышка с кремовой окантовкой,
 * ниже — красные доски с волокнами. doors — двустворчатые дверцы посередине. Мебель: oneway.
 */
export function cabinet(wTiles, hTiles, doors = false) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      pix.rect(x, y, w, h, C.black);
      // Крышка.
      pix.rect(x, y, w, 12, W5.wine);
      pix.hline(x + 1, y + 1, w - 2, W5.cream);
      pix.vline(x + 1, y + 1, 10, W5.cream);
      pix.vline(x + w - 2, y + 1, 10, W5.cream);
      pix.hline(x, y + 12, w, C.black);
      // Доски с волокнами.
      for (let px = x; px < x + w; px++) {
        const u = (px - x) % 16;
        for (let py = y + 13; py < y + h; py++) {
          let c = W5.red;
          if (u === 0 || u === 15) c = C.black;
          else if (
            noise(px, Math.floor((py - y) / 3)) % 7 === 0 ||
            (u + Math.floor((py - y) / 5)) % 6 === 0
          )
            c = W5.wine;
          pix.set(px, py, c);
        }
      }
      if (doors) {
        const dx = x + Math.floor(w / 2) - 14;
        pix.rect(dx, y + 16, 28, h - 16, W5.wine);
        for (let i = 0; i < 4; i++) pix.rect(dx + 2 + i * 6, y + 17, 4, 4, C.black);
        pix.rect(dx + 2, y + 24, 11, h - 26, C.black);
        pix.rect(dx + 15, y + 24, 11, h - 26, C.black);
        pix.rect(dx + 3, y + 25, 9, h - 28, W5.wine);
        pix.rect(dx + 16, y + 25, 9, h - 28, W5.wine);
      }
    },
    collide: oneway(wTiles),
  };
}

/**
 * Большая дверь «22» с кольцом-львом (как в оригинале) — выход со склада. col, floorRow — в
 * тайлах; ширина 6, высота 5 тайлов. Зона выхода — у створки.
 */
export function placeBigDoor(m, col, floorRow) {
  m.decor((p) => {
    const x = col * T;
    const y = (floorRow - 5) * T;
    const w = 6 * T;
    const h = 5 * T;
    p.rect(x, y, w, h, C.gray);
    p.rect(x + 2, y + 2, w - 4, h - 2, C.black);
    p.rect(x + 4, y + 4, w - 8, h - 4, C.silver);
    p.rect(x + 6, y + 6, w - 12, h - 6, W5.wine);
    // Петли справа.
    for (const hy of [y + 16, y + 52]) p.rect(x + w - 6, hy, 4, 10, C.silver);
    // Табличка «22».
    p.rect(x + 28, y + 22, 40, 9, C.gray);
    const two = ['###', '..#', '###', '#..', '###'];
    for (const ox of [x + 41, x + 49])
      two.forEach((r, ry) => {
        for (let rx = 0; rx < 3; rx++)
          if (r[rx] === '#') p.rect(ox + rx * 2 - 2, y + 24 + ry, 2, 1, C.black);
      });
    // Кольцо-лев.
    p.ellipse(x + 48, y + 46, 8, 6, C.gray);
    p.rect(x + 44, y + 44, 2, 2, C.black);
    p.rect(x + 51, y + 44, 2, 2, C.black);
    p.ellipse(x + 48, y + 58, 6, 5, C.silver);
    p.ellipse(x + 48, y + 58, 4, 3, W5.wine);
  });
  m.zone('exit', col * T + 32, (floorRow - 4) * T, 32, 4 * T);
}

// ——— Портретный зал ———

/** Обои зала (как в оригинале): тёмно-фиолетовые с синим узором-решёткой. */
export function wallpaper(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const u = ((x % 24) + 24) % 24;
    const v = ((y % 32) + 32) % 32;
    const d = Math.abs(u - 12) + Math.abs(v - 16) * 0.75;
    const ring = Math.abs(d - 10) < 1.2;
    const stem = (u === 12 && (v < 4 || v > 28)) || (v === 16 && (u < 3 || u > 21));
    const dot = (u + v) % 4 === 0 && d < 4;
    return ring || stem || dot ? W5.paperPat : W5.paper;
  });
}

/** Серый деревянный столб (фон): волокна. x — левый край, ширина 32. */
export function woodPost(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++)
    for (let lx = 0; lx < 32; lx++) {
      const n = noise(x + lx, Math.floor(y / 3));
      pix.set(
        x + lx,
        y,
        lx === 0 || lx === 31 ? C.black : n % 5 === 0 ? C.black : n % 3 === 0 ? W5.gray : W5.paper,
      );
    }
}

/** Полка вдоль стены (как в оригинале): тонкая голубая кромка с тенью. Oneway, ширина в тайлах. */
export function wallShelf(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.hline(x, y, w, C.sky);
      pix.rect(x, y + 1, w, 3, W5.paperPat);
      pix.hline(x, y + 4, w, C.black);
      pix.rect(x + w - 4, y + 1, 4, 6, W5.paperPat);
    },
    collide: oneway(wTiles),
  };
}

/** Подсвечник-капитель на полке (декор). cx — центр, y — верх полки. */
export function holder(pix, cx, y) {
  pix.rect(cx - 7, y - 24, 15, 3, C.sky);
  pix.rect(cx - 2, y - 21, 5, 21, C.sky);
  pix.vline(cx + 1, y - 21, 21, W5.paperPat);
  for (const s of [-1, 1]) {
    pix.vline(cx + s * 6, y - 14, 8, C.sky);
    pix.hline(cx + s * 6 - (s < 0 ? 0 : 2), y - 6, 3, C.sky);
  }
}

/** Высокая белая свеча на подсвечнике (декор). cx — центр, y — верх полки. */
export function tallCandle(pix, cx, y) {
  holder(pix, cx, y);
  pix.rect(cx - 6, y - 64, 13, 40, C.white);
  pix.rect(cx - 6, y - 64, 13, 4, C.silver);
  pix.rect(cx - 5, y - 60, 3, 6, C.white);
  pix.vline(cx + 4, y - 60, 36, C.silver);
  pix.rect(cx - 1, y - 68, 3, 4, C.gray);
}

/**
 * Красный буфет с решётчатой дверцей (как в оригинале): на него встают. Ширина/высота в тайлах.
 */
export function sideboard(wTiles, hTiles) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      pix.rect(x, y, w, h, W5.sideboard);
      pix.hline(x, y, w, C.salmon);
      pix.hline(x, y + 1, w, W5.red);
      for (let px = x + 16; px < x + w - 16; px++)
        for (let py = y + 4; py < y + 14; py++) {
          const u = (px - x) % 8;
          const v = py - y - 4;
          if (Math.abs(u - 4) === Math.abs(v - 5) % 5) pix.set(px, py, W5.cream);
        }
      for (let px = x + 16; px < x + w - 16; px += 2)
        pix.vline(px, y + 15, Math.max(0, h - 19), W5.cream);
      pix.hline(x, y + h - 2, w, C.black);
    },
    collide: oneway(wTiles),
  };
}

/**
 * Портрет в серой раме (как в оригинале): человек в цилиндре — у нас «Дефицит Будущего»
 * с циферблатом вместо лица. Нижняя планка рамы — полка (oneway), на ней тайник.
 * col, row — левый верх, размер 7×7 тайлов.
 */
export function placePortrait(m, col, row) {
  const x = col * T;
  const y = row * T;
  const w = 7 * T;
  const h = 7 * T;
  m.decor((p) => {
    p.rect(x, y, w, h, C.gray);
    p.rect(x + 4, y + 4, w - 8, h - 8, C.black);
    for (let i = 6; i < w - 6; i += 4) {
      p.rect(x + i, y + 6, 2, 2, C.gray);
      p.rect(x + i, y + h - 8, 2, 2, C.gray);
    }
    for (let i = 6; i < h - 6; i += 4) {
      p.rect(x + 6, y + i, 2, 2, C.gray);
      p.rect(x + w - 8, y + i, 2, 2, C.gray);
    }
    const ix = x + 10;
    const iy = y + 10;
    p.rect(ix, iy, w - 20, h - 20, W5.paper);
    // Цилиндр, плечи, циферблат вместо лица.
    const cx = x + w / 2;
    p.rect(cx - 12, iy + 6, 24, 18, C.black);
    p.rect(cx - 18, iy + 23, 36, 4, C.black);
    p.ellipse(cx, iy + 40, 12, 12, C.silver);
    p.ellipse(cx, iy + 40, 10, 10, C.white);
    p.vline(cx, iy + 32, 9, C.black);
    p.hline(cx, iy + 40, 7, C.black);
    p.rect(cx - 30, iy + 56, 60, h - 20 - 56, C.black);
    p.rect(cx - 4, iy + 56, 8, h - 20 - 56, W5.paperPat);
    // Нижняя планка рамы — толстая, на ней можно стоять.
    p.rect(x - 4, y + h - 16, w + 8, 16, C.gray);
    p.hline(x - 4, y + h - 16, w + 8, C.silver);
    for (let i = 0; i < w + 8; i += 6) p.rect(x - 2 + i, y + h - 10, 3, 3, C.black);
  });
  // Нижняя планка рамы — полка.
  m.oneway(col, col + 6, row + 6);
}
