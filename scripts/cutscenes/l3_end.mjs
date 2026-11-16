// Иллюстрации кат-сцены после уровня 3 (ТЗ: «капсулы нет, GRPZDC замечает злодея у склада»;
// в оригинале здесь Вжик замечает Толстопуза). Картинка — под текстовым окном, 248 × 160.
// Надписи и ведущих рисует сцена поверх (кириллица — нашим шрифтом, герои — их спрайтами).
import { NES as C, Pix } from '../levels/pixels.mjs';
import * as S from '../levels/ship-art.mjs';

export const W = 248;
export const H = 160;

/** 1. Трюм: распахнутый пустой контейнер «пост-СССР». */
export function holdEmpty() {
  const p = new Pix(W, H);
  S.hullWall(p, 0, 0, W, 128);
  S.porthole(p, 36, 40, 16);
  S.porthole(p, 220, 40, 16);
  S.deckFloor(p, 0, 128, W, 32);
  // Контейнер: синие рифлёные стенки, внутри темно и пусто.
  const x0 = 72;
  const y0 = 44;
  const cw = 120;
  const ch = 84;
  p.rect(x0, y0, cw, ch, C.black);
  p.rect(x0, y0, cw, 6, C.blue);
  p.hline(x0, y0, cw, C.periwinkle);
  for (let x = x0 + 8; x < x0 + cw - 8; x += 12) p.vline(x, y0 + 10, ch - 14, C.navy);
  p.rect(x0 + 6, y0 + 8, cw - 12, ch - 10, C.black);
  // Пыль на полу контейнера.
  for (let x = x0 + 10; x < x0 + cw - 10; x += 7) p.set(x, y0 + ch - 3, C.gray);
  // Распахнутые двери — косые створки по бокам.
  for (const [dx, dir] of [
    [x0, -1],
    [x0 + cw, 1],
  ]) {
    for (let k = 0; k < 22; k++) {
      const x = dx + dir * k;
      const top = y0 + Math.round(k * 0.3);
      p.vline(x, top, ch - Math.round(k * 0.6), k % 6 === 0 ? C.navy : C.blue);
    }
    p.vline(dx + dir * 22, y0 + 6, ch - 13, C.black);
  }
  p.rect(x0, y0 + ch, cw, 2, C.black);
  return p;
}

/** 2. Порт на закате: краны, море, холодильный склад; GRPZDC в небе. */
export function portDusk() {
  const p = new Pix(W, H);
  const bands = [C.purple, C.magenta, C.rose, C.orange, C.gold];
  bands.forEach((c, i) => p.rect(0, i * 20, W, 20, c));
  S.sea(p, 0, 100, W, 30);
  p.rect(0, 130, W, 30, C.gray);
  p.hline(0, 130, W, C.white);
  for (let x = 0; x < W; x += 32) p.vline(x, 131, 29, C.black);
  // Портовые краны — силуэты.
  for (const cx of [24, 92]) {
    p.rect(cx, 40, 6, 90, C.black);
    p.rect(cx - 20, 40, 60, 5, C.black);
    for (let k = 0; k < 8; k++) p.set(cx + 6 + k * 4, 45 + k * 3, C.black);
    p.vline(cx + 36, 45, 30, C.black);
  }
  // Холодильный склад: стена, крыша, ворота, иней и сосульки.
  const sx = 148;
  p.rect(sx, 64, 96, 66, C.silver);
  p.rect(sx - 4, 56, 104, 10, C.gray);
  p.hline(sx - 4, 56, 104, C.black);
  p.rect(sx + 30, 84, 36, 46, C.navy);
  for (let y = 86; y < 130; y += 6) p.hline(sx + 31, y, 34, C.blue);
  p.box(sx + 4, 67, 88, 13, C.white, C.black); // табличка — надпись рисует сцена
  for (let x = sx - 2; x < sx + 98; x += 5) p.vline(x, 66, 2 + ((x * 7) % 5), C.paleSky);
  // GRPZDC: маленький летун в наушниках с пропеллером на кепке.
  const gx = 136;
  const gy = 18;
  p.hline(gx - 4, gy, 12, C.black);
  p.vline(gx + 2, gy, 3, C.black);
  p.rect(gx - 1, gy + 3, 7, 3, C.red); // кепка
  p.rect(gx - 1, gy + 6, 7, 6, C.skinPale); // лицо
  p.rect(gx - 2, gy + 6, 2, 4, C.black); // наушники
  p.rect(gx + 5, gy + 6, 2, 4, C.black);
  p.hline(gx - 1, gy + 5, 8, C.black);
  p.set(gx + 1, gy + 8, C.black);
  p.set(gx + 4, gy + 8, C.black);
  p.rect(gx, gy + 12, 5, 7, C.green); // худи
  p.set(gx - 1, gy + 13, C.skinPale);
  p.set(gx + 6, gy + 11, C.skinPale); // рука показывает на склад
  p.set(gx + 7, gy + 10, C.skinPale);
  return p;
}

/** 3. Ворота склада: Дефицит Будущего — чиновник с циферблатом вместо лица. */
export function villainGate() {
  const p = new Pix(W, H);
  p.rect(0, 0, W, H, C.silver);
  // Ворота: тёмный проём с инеем.
  p.rect(64, 20, 120, 140, C.navy);
  for (let y = 24; y < H; y += 8) p.hline(66, y, 116, C.violet);
  p.rect(60, 16, 128, 6, C.gray);
  for (let x = 62; x < 186; x += 6) {
    const len = 3 + ((x * 5) % 7);
    p.vline(x, 22, len, C.paleSky);
    p.set(x, 22 + len, C.white);
  }
  // Табличка над воротами — надпись рисует сцена.
  p.box(74, 1, 100, 13, C.white, C.black);
  // Злодей: тёмный костюм, белая рубашка, вместо головы — циферблат.
  const vx = 108;
  const vy = 60;
  p.ellipse(vx + 16, vy + 12, 13, 13, C.black);
  p.ellipse(vx + 16, vy + 12, 11, 11, C.white);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.set(vx + 16 + Math.round(Math.cos(a) * 9), vy + 12 + Math.round(Math.sin(a) * 9), C.black);
  }
  // Стрелки застыли.
  p.vline(vx + 16, vy + 5, 7, C.black);
  for (let k = 0; k < 5; k++) p.set(vx + 16 + k, vy + 12 + Math.round(k * 0.6), C.red);
  p.rect(vx + 2, vy + 26, 28, 44, C.black);
  p.rect(vx + 13, vy + 26, 6, 14, C.white);
  p.vline(vx + 16, vy + 28, 12, C.red); // галстук
  p.rect(vx - 4, vy + 30, 6, 30, C.black);
  p.rect(vx + 30, vy + 30, 6, 30, C.black);
  p.rect(vx + 4, vy + 70, 10, 26, C.black);
  p.rect(vx + 18, vy + 70, 10, 26, C.black);
  // Портфель.
  p.box(vx + 30, vy + 56, 14, 10, C.brown, C.black);
  // Пол.
  p.rect(0, 150, W, 10, C.gray);
  p.hline(0, 150, W, C.white);
  return p;
}

export const L3_END = { l3_end_1: holdEmpty, l3_end_2: portDusk, l3_end_3: villainGate };
