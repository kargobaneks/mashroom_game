// Арт уровня 5 «Дореформенный архив»: арена призрака по кадрам уровня 5 оригинала
// (docs/refs/level_5_boss_1.png, при свете): сверху тьма, ниже — стенные панели в синюю
// «шахматку», между ними — колонны со свечами, по краям — низкие тумбы-вазы, пол — синяя
// решётка-балюстрада. Цвета сняты с кадра.
import { NES as C } from './pixels.mjs';

export const ARCHIVE = {
  deep: 0x051796,
  light: 0x3171b5,
};

/** Стенная панель: шахматка «синий/чёрный», верхняя кромка — редкий пунктир. */
export function panel(pix, x0, y0, x1, y1) {
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      if (y < y0 + 2) {
        if ((x + y) % 4 === 0) pix.set(x, y, ARCHIVE.deep);
        continue;
      }
      pix.set(x, y, (x + y) % 2 === 0 ? ARCHIVE.deep : C.black);
    }
}

/** Завиток-орнамент (буква S) светло-синим: левый верх, 6 × 10. */
function scroll(pix, x, y, flip) {
  const rows = ['.####.', '#....#', '#.....', '.###..', '....#.', '.....#', '#....#', '.####.'];
  rows.forEach((r, ry) => {
    for (let rx = 0; rx < 6; rx++)
      if (r[rx] === '#') pix.set(flip ? x + 5 - rx : x + rx, y + ry, ARCHIVE.light);
  });
}

/**
 * Колонна со свечой (как в оригинале): свеча-цилиндр, капитель, ствол с завитками, база.
 * cx — центр, floorY — пол. Пламя — отдельным спрайтом (горит и в темноте).
 */
export function candlePillar(pix, cx, floorY) {
  const top = floorY - 92;
  // Свеча.
  pix.rect(cx - 6, top, 13, 32, ARCHIVE.light);
  pix.rect(cx - 7, top, 15, 2, ARCHIVE.light);
  pix.vline(cx + 3, top + 3, 28, ARCHIVE.deep);
  pix.vline(cx + 4, top + 3, 28, ARCHIVE.deep);
  pix.rect(cx - 2, top + 20, 2, 9, ARCHIVE.deep);
  // Капитель.
  const cap = top + 32;
  pix.rect(cx - 9, cap, 19, 3, ARCHIVE.light);
  pix.hline(cx - 9, cap + 3, 19, C.black);
  pix.rect(cx - 7, cap + 4, 15, 2, ARCHIVE.light);
  // Ствол с завитками.
  pix.rect(cx - 3, cap + 6, 7, floorY - cap - 18, ARCHIVE.light);
  pix.vline(cx + 2, cap + 6, floorY - cap - 18, ARCHIVE.deep);
  scroll(pix, cx - 10, cap + 10, false);
  scroll(pix, cx + 5, cap + 10, true);
  scroll(pix, cx - 10, cap + 22, false);
  scroll(pix, cx + 5, cap + 22, true);
  // База.
  pix.rect(cx - 8, floorY - 12, 17, 2, ARCHIVE.light);
  pix.rect(cx - 6, floorY - 9, 4, 9, ARCHIVE.light);
  pix.rect(cx + 3, floorY - 9, 4, 9, ARCHIVE.light);
  pix.rect(cx - 8, floorY - 2, 17, 2, ARCHIVE.light);
}

/** Низкая тумба-ваза у края (как в оригинале): на неё встают. cx — центр, верх — top. */
export function urn(pix, cx, top, floorY) {
  pix.rect(cx - 8, top, 17, 3, ARCHIVE.light);
  pix.hline(cx - 8, top + 3, 17, C.black);
  pix.rect(cx - 3, top + 4, 7, floorY - top - 10, ARCHIVE.light);
  pix.vline(cx + 2, top + 4, floorY - top - 10, ARCHIVE.deep);
  scroll(pix, cx - 10, top + 6, false);
  scroll(pix, cx + 5, top + 6, true);
  pix.rect(cx - 6, floorY - 12, 4, 10, ARCHIVE.light);
  pix.rect(cx + 3, floorY - 12, 4, 10, ARCHIVE.light);
  pix.rect(cx - 8, floorY - 2, 17, 2, ARCHIVE.light);
}

/**
 * Пол — балюстрада (как в оригинале): светлая кромка, цепь ромбов, частые балясины, внизу
 * поручень со столбиками. В середине решётки — тёмный пролёт (только рисунок, пол сплошной).
 */
export function balustrade(pix, x0, y0, w, gap = null) {
  pix.rect(x0, y0, w, 32, C.black);
  pix.hline(x0, y0, w, ARCHIVE.light);
  pix.hline(x0, y0 + 1, w, ARCHIVE.deep);
  for (let x = x0; x < x0 + w; x++) {
    if (gap && x >= gap[0] && x < gap[1]) continue;
    for (let ly = 3; ly < 13; ly++) {
      const u = (x - x0) % 10;
      const d = Math.abs(u - 5);
      if (Math.abs(ly - 8) === 5 - d || (ly === 8 && (u === 0 || u === 9)))
        pix.set(x, y0 + ly, ARCHIVE.light);
      else if ((x + ly) % 2 === 0) pix.set(x, y0 + ly, ARCHIVE.deep);
    }
    if ((x - x0) % 3 !== 2) pix.vline(x, y0 + 14, 8, ARCHIVE.light);
  }
  pix.hline(x0, y0 + 27, w, ARCHIVE.deep);
  pix.hline(x0, y0 + 28, w, ARCHIVE.light);
  for (let x = x0 + 8; x < x0 + w; x += 48) pix.rect(x, y0 + 29, 12, 3, ARCHIVE.light);
}
