// Арт уровня 7 «Салун» по картам оригинала (docs/refs/level7/map_7-*.png): вход в шахту — бурая
// каменная кладка, небо в проёмах, деревянные балки-полки, бочки «POWDER», лопаты; шахта —
// тёмно-зелёный камень, каменные плиты под потолком, деревянные фермы-иксы под путями, рельсы.
import { NES as C } from './pixels.mjs';

export const W7 = {
  rockA: 0x503000,
  rockB: 0x881400,
  rockLight: 0xac7c00,
  wood: 0x881400,
  woodLight: 0xe45c10,
  woodDark: 0x503000,
  mineA: 0x002810,
  mineB: 0x00200c,
  mineLight: 0x004818,
  slab: 0x587858,
  slabDark: 0x3c503c,
  rail: C.silver,
  sleeper: 0x503000,
  sky: C.sky,
  barrel: 0xac7c00,
  hoop: C.gray,
  cobble: C.silver,
};

const noise = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

/** Каменная кладка: круглые камни на тёмном. */
export function rockWall(pix, x0, y0, w, h, light = W7.rockLight, mid = W7.rockB, dark = W7.rockA) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const cy = Math.floor(y / 10);
    const ox = (cy % 2) * 6;
    const lx = (x + ox) % 12;
    const ly = y % 10;
    const edge = lx === 0 || ly === 0;
    if (edge) return C.black;
    const n = noise(Math.floor((x + ox) / 12), cy) % 3;
    if (lx <= 2 && ly <= 2) return light;
    return n === 0 ? dark : mid;
  });
}

/** Шахта: тёмно-зелёный камень. */
export function mineWall(pix, x0, y0, w, h) {
  rockWall(pix, x0, y0, w, h, W7.mineLight, W7.mineA, W7.mineB);
}

export function sky(pix, x, y, w, h) {
  pix.rect(x, y, w, h, W7.sky);
  for (let i = 0; i < Math.floor(w / 48) + 1; i++) {
    const cx = x + 8 + (noise(x + i, y) % Math.max(1, w - 24));
    const cy = y + 12 + (noise(y + i, x) % Math.max(1, h - 24));
    pix.rect(cx, cy, 12, 2, C.white);
    pix.rect(cx + 3, cy - 2, 6, 2, C.white);
  }
}

/** Деревянная балка-полка (уступ), верх на y, высота 16. */
export function beam(pix, x, y, w) {
  pix.rect(x, y, w, 16, W7.wood);
  pix.rect(x, y, w, 3, W7.woodLight);
  pix.rect(x, y + 13, w, 3, W7.woodDark);
  for (let bx = x + 4; bx < x + w; bx += 24) pix.rect(bx, y + 6, 2, 2, C.black);
}

/** Вертикальный столб. */
export function post(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++) {
    pix.set(x, y, C.black);
    pix.rect(x + 1, y, 3, 1, W7.woodLight);
    pix.rect(x + 4, y, 8, 1, W7.wood);
    pix.rect(x + 12, y, 3, 1, W7.woodDark);
    pix.set(x + 15, y, C.black);
  }
}

/** Бочка (с надписью POWDER, если big). Низ на bottom, ширина w, высота h. */
export function barrel(pix, x, bottom, w, h, big = false) {
  const y = bottom - h;
  for (let yy = y; yy < bottom; yy++) {
    const t = (yy - y) / h;
    const bulge = Math.round(Math.sin(t * Math.PI) * 2);
    pix.rect(x + 2 - bulge, yy, w - 4 + bulge * 2, 1, W7.barrel);
  }
  for (const hy of [y + 2, y + Math.floor(h / 2), bottom - 4]) pix.rect(x, hy, w, 2, W7.hoop);
  for (let sx = x + 5; sx < x + w - 3; sx += 6) pix.vline(sx, y + 4, h - 8, W7.woodDark);
  if (big) {
    pix.rect(x + 3, y + Math.floor(h / 2) - 6, w - 6, 9, C.cream);
    for (let i = 0; i < w - 10; i += 4)
      pix.rect(x + 5 + i, y + Math.floor(h / 2) - 4, 2, 5, C.black);
  }
}

/** Мощёный пол (серые камни), верх на y. */
export function cobbles(pix, x, y, w, h) {
  pix.fillPattern(x, y, w, h, (xx, yy) => {
    const lx = (xx + Math.floor((yy - y) / 12) * 8) % 16;
    const ly = (yy - y) % 12;
    if (lx === 0 || ly === 0) return C.black;
    return lx < 4 && ly < 4 ? C.white : W7.cobble;
  });
}

/** Каменные плиты под потолком шахты. */
export function ceilingSlab(pix, x, y, w) {
  pix.rect(x, y, w, 16, W7.slab);
  pix.rect(x, y + 13, w, 3, W7.slabDark);
  pix.rect(x, y, w, 1, C.black);
  for (let bx = x; bx < x + w; bx += 64) pix.vline(bx, y, 16, W7.slabDark);
}

/** Ферма-икс под путями. */
export function truss(pix, x, top, bottom, w = 64) {
  for (let i = 0; i <= w; i++) {
    const yy1 = top + Math.round(((bottom - top) * i) / w);
    const yy2 = bottom - Math.round(((bottom - top) * i) / w);
    for (const yy of [yy1, yy2]) pix.rect(x + i, yy, 1, 4, W7.wood);
  }
}

/** Рельсы: шпалы и рельс, верх рельса на y. */
export function rails(pix, x0, x1, y) {
  for (let x = x0; x < x1; x++) {
    pix.set(x, y, C.black);
    pix.set(x, y + 1, W7.rail);
    pix.set(x, y + 2, W7.rail);
    pix.set(x, y + 3, C.black);
  }
  for (let x = x0 + 2; x < x1 - 4; x += 10) pix.rect(x, y + 4, 6, 4, W7.sleeper);
}

/** Отбойник в конце пути. */
export function bumper(pix, x, y) {
  pix.rect(x, y - 16, 6, 16, W7.woodDark);
  pix.rect(x + 1, y - 15, 4, 3, C.red);
}

/** Лопата, воткнутая в землю (декор, как в оригинале). */
export function shovel(pix, x, bottom) {
  pix.rect(x + 3, bottom - 64, 2, 48, W7.woodDark);
  pix.ellipse(x + 4, bottom - 10, 6, 9, 0x3c5c18);
}

/** Карточный стол: зелёное сукно, ножки. Верх на y, ширина w. */
export function cardTable(pix, x, y, w, floorY) {
  pix.rect(x, y, w, 4, 0x007800);
  pix.rect(x, y + 4, w, 4, W7.woodDark);
  pix.rect(x + 4, y + 8, 4, floorY - y - 8, W7.woodDark);
  pix.rect(x + w - 8, y + 8, 4, floorY - y - 8, W7.woodDark);
  // Разбросанные карты на сукне.
  for (const dx of [10, 26, 40]) pix.rect(x + dx, y - 1, 6, 2, C.white);
}

/** Масти на балке (как на уступах арены оригинала). */
export function suits(pix, x, y) {
  const heart = ['.R.R.', 'RRRRR', '.RRR.', '..R..'];
  const spade = ['..D..', '.DDD.', 'DDDDD', '..D..'];
  pix.ascii(x, y, heart, { R: C.red });
  pix.ascii(x + 12, y, spade, { D: C.black });
}

/** Стойка салуна (за ней — камео). Низ на bottom, верх стойки на 24 px выше. */
export function barCounter(pix, x, bottom, w) {
  pix.rect(x, bottom - 24, w, 24, W7.wood);
  pix.rect(x, bottom - 24, w, 3, W7.woodLight);
  for (let bx = x + 6; bx < x + w - 4; bx += 12) pix.rect(bx, bottom - 18, 6, 14, W7.woodDark);
  pix.rect(x + w - 14, bottom - 32, 4, 8, 0x00a800);
  pix.rect(x + w - 13, bottom - 36, 2, 4, 0x00a800);
}
