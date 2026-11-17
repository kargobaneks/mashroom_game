// Арт уровня 9 «Студия Конца Истории» по картам логова Толстопуза оригинала
// (docs/refs/level9/map_9-*.png): тот же цех, что в Мире будущего (future-art.mjs: тёмно-синие
// панели, сине-зелёные балки, стены в жёлто-чёрную полосу, белые трубы), плюс своё —
// лента конвейера в жёлто-чёрную полосу на роликах, пресс с соплами лазеров, белые генераторы
// на колёсах, висящие полосатые платформы на цепях, потолочный рельс пушек, крюки на цепях.
import { NES as C } from './pixels.mjs';
import { W8 } from './future-art.mjs';

const stripe = (x, y) => (Math.floor((x + y) / 4) % 2 === 0 ? C.gold : C.black);

/** Лента конвейера: верх — полоса (по ней едут), ниже — ролики в раме; высота h. */
export function conveyor(pix, x, y, w, h = 16) {
  pix.rect(x, y, w, h, C.black);
  pix.fillPattern(x, y + 1, w, 5, stripe);
  pix.hline(x, y, w, C.white);
  for (let rx = x + 8; rx < x + w - 4; rx += 16)
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > 4.5) continue;
        pix.set(rx + dx, y + 11 + dy, d > 3.3 ? C.gray : d < 1.2 ? C.black : C.silver);
      }
}

/** Блок пресса: машинерия под потолком — серые трубы, решётки, белая рама. */
export function press(pix, x, y, w, h) {
  pix.fillPattern(x, y, w, h, (px, py) => {
    const gx = (px - x) % 32;
    const gy = (py - y) % 24;
    if (gx === 0 || gy === 0) return C.black;
    if (gx < 10) return gy < 3 ? C.white : gx < 3 ? C.white : gx > 7 ? C.gray : C.silver;
    if (gy > 18) return C.gray;
    return (px + py) % 4 === 0 ? C.black : W8.girder;
  });
  pix.hline(x, y + h - 1, w, C.black);
  pix.hline(x, y + h - 3, w, C.white);
}

/** Сопло лазера под прессом: cx — центр, y — верх (низ пресса), 8 px вниз. */
export function nozzle(pix, cx, y) {
  for (let dy = 0; dy < 8; dy++) {
    const half = 6 - Math.floor(dy / 2);
    for (let dx = -half; dx < half; dx++) {
      const edge = dx === -half || dx === half - 1 || dy === 7;
      pix.set(cx + dx, y + dy, edge ? C.black : dx < 0 ? C.silver : C.gray);
    }
  }
  pix.set(cx - 1, y + 6, C.red);
  pix.set(cx, y + 6, C.red);
}

/** Белый генератор на колёсах, 48 × 32; x, y — левый верх. Стоит на полу, на него встают. */
export function generator(pix, x, y) {
  pix.rect(x, y, 48, 24, C.black);
  pix.rect(x + 1, y + 1, 46, 22, C.white);
  pix.rect(x + 1, y + 16, 46, 7, C.silver);
  for (let k = 0; k < 4; k++) pix.vline(x + 8 + k * 3, y + 5, 8, C.black);
  pix.rect(x + 28, y + 5, 14, 8, C.black);
  pix.rect(x + 30, y + 7, 4, 4, C.red);
  pix.rect(x + 36, y + 7, 4, 4, C.ledGreen);
  // Красная платформа с колёсами.
  pix.rect(x + 2, y + 24, 44, 3, C.black);
  pix.rect(x + 3, y + 24, 42, 2, C.rose);
  for (const wx of [x + 10, x + 38])
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= 3.5) pix.set(wx + dx, y + 28 + dy, d > 2.4 ? C.black : C.gray);
      }
}

/** Висящая платформа в жёлто-чёрную полосу на двух цепях (до потолка ceil); высота 16. */
export function hanger(pix, x, y, w, ceil) {
  for (const cx of [x + 6, x + w - 7])
    for (let cy = ceil; cy < y; cy++) {
      const link = (cy - ceil) % 6;
      pix.set(cx - 1, cy, link < 4 ? C.silver : null);
      pix.set(cx + 1, cy, link < 4 ? C.silver : null);
      if (link === 0 || link === 3) pix.set(cx, cy, C.silver);
    }
  pix.rect(x, y, w, 16, C.black);
  pix.fillPattern(x + 1, y + 1, w - 2, 14, stripe);
  pix.rect(x + 3, y + 4, w - 6, 8, C.black);
  for (let dx = 5; dx < w - 6; dx += 6) pix.rect(x + dx, y + 6, 3, 4, C.gold);
  pix.hline(x, y, w, C.white);
}

/** Потолочный рельс пушек: двутавр по низу потолка. */
export function rail(pix, x, y, w) {
  pix.rect(x, y, w, 6, C.black);
  pix.hline(x, y + 1, w, C.silver);
  pix.hline(x, y + 4, w, C.gray);
  for (let dx = 4; dx < w; dx += 16) pix.rect(x + dx, y + 2, 2, 2, C.white);
}

/** Крюк на цепи (декор). */
export function hook(pix, cx, ceil, bottom) {
  for (let y = ceil; y < bottom - 8; y++) {
    const link = (y - ceil) % 6;
    if (link < 4) {
      pix.set(cx - 1, y, C.silver);
      pix.set(cx + 1, y, C.silver);
    }
    if (link === 0 || link === 3) pix.set(cx, y, C.silver);
  }
  const t = bottom - 8;
  for (let dy = 0; dy < 8; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const r = Math.hypot(dx, dy - 3);
      if (r > 3 && r < 5 && !(dx < 0 && dy < 3)) pix.set(cx + dx, t + dy, C.gold);
    }
}

/** Трещины потолка (побег): ломаные чёрные линии. */
export function cracks(pix, x, y, w, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) % 1000) / 1000;
  for (let n = 0; n < w / 24; n++) {
    let cx = x + rnd() * w;
    let cy = y;
    for (let k = 0; k < 14; k++) {
      pix.set(cx, cy, C.black);
      pix.set(cx + 1, cy, C.black);
      cy += 1;
      cx += rnd() < 0.5 ? -1 : 1;
    }
  }
}
