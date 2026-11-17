// Арт уровня 6 «Часовая башня» по карте оригинала (docs/refs/level6/map_6.png): чёрная стена
// с тёмно-зелёной кладкой, ярко-зелёные трубы (фон), серые клёпаные плиты-уступы, полосатые
// латунные трубы-ступени, окна с небом и облаками, шестерни с цепью (путь платформ на цепях).
import { NES as C } from './pixels.mjs';

const T = 16;

export const W6 = {
  brick: 0x0c3a2a,
  pipe: C.green,
  pipeDark: C.darkGreen,
  pipeLight: C.lime,
  slab: C.silver,
  slabDark: C.gray,
  brass: C.paleYellow,
  brassDark: C.olive,
  sky: C.sky,
  cloud: C.white,
  city: C.azure,
  gear: 0xd8d0a0,
  gearDark: C.olive,
};

const noise = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

/** Стена: чёрная, кирпичи обведены тёмно-зелёным (как в оригинале). */
export function wall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const row = Math.floor(y / 8);
    const bx = (x + (row % 2) * 8) % 16;
    return y % 8 === 0 || bx === 0 ? W6.brick : C.black;
  });
}

/** Вертикальная зелёная труба фона, ширина 16, с муфтами. */
export function pipeV(pix, x, y0, y1) {
  for (let y = y0; y < y1; y++) {
    const collar = (y - y0) % 48 < 6;
    for (let dx = 0; dx < T; dx++) {
      const edge = dx === 0 || dx === T - 1;
      const c = edge ? C.black : dx < 4 ? W6.pipeLight : dx > 11 ? W6.pipeDark : W6.pipe;
      pix.set(x + dx, y, collar && !edge ? (dx % 3 === 0 ? W6.pipeDark : W6.pipeLight) : c);
    }
  }
}

/** Горизонтальная зелёная труба фона, толщина 6. */
export function pipeH(pix, x0, x1, y) {
  for (let x = x0; x < x1; x++) {
    pix.set(x, y, C.black);
    pix.set(x, y + 1, W6.pipeLight);
    pix.set(x, y + 2, W6.pipe);
    pix.set(x, y + 3, W6.pipe);
    pix.set(x, y + 4, W6.pipeDark);
    pix.set(x, y + 5, C.black);
  }
}

/** Окно с небом, облаками и шпилями города (как в оригинале). */
export function window(pix, x, y, w, h) {
  pix.rect(x, y, w, h, W6.sky);
  for (let i = 0; i < Math.floor(w / 40) + 1; i++) {
    const cx = x + 8 + ((noise(x + i, y) % Math.max(1, w - 24)) | 0);
    const cy = y + 8 + ((noise(y, x + i) % Math.max(1, h / 2)) | 0);
    pix.rect(cx, cy, 10, 2, W6.cloud);
    pix.rect(cx + 3, cy - 2, 5, 2, W6.cloud);
  }
  // Силуэт города внизу.
  for (let xx = x; xx < x + w; xx++) {
    const n = noise(Math.floor(xx / 6), 7) % 14;
    const spire = xx % 37 === 5 ? 22 : 0;
    const top = y + h - 6 - n - spire;
    for (let yy = Math.max(y, top); yy < y + h; yy++) pix.set(xx, yy, W6.city);
  }
}

/** Серая клёпаная плита (уступ), x, y — левый верх, w в px, высота 16 (thick — 32). */
export function slab(pix, x, y, w, h = T) {
  pix.rect(x, y, w, h, W6.slab);
  pix.rect(x, y + h - 3, w, 3, W6.slabDark);
  for (let bx = x; bx < x + w; bx += 32) {
    pix.vline(bx, y, h, W6.slabDark);
    for (const [rx, ry] of [
      [4, 3],
      [27, 3],
      [4, h - 6],
      [27, h - 6],
    ])
      if (bx + rx < x + w) pix.rect(bx + rx, y + ry, 2, 2, C.black);
  }
}

/** Латунная полосатая труба-ступень (тонкий уступ): верх на y, высота 8. */
export function brassPipe(pix, x, y, w) {
  for (let xx = x; xx < x + w; xx++) {
    const band = Math.floor((xx - x) / 4) % 2 === 0;
    for (let dy = 0; dy < 8; dy++) {
      const c = dy === 0 || dy === 7 ? C.black : band ? W6.brass : W6.brassDark;
      pix.set(xx, y + dy, dy === 1 && band ? C.white : c);
    }
  }
  // Кронштейны.
  for (const xx of [x + 2, x + w - 6]) pix.rect(xx, y + 8, 4, 6, W6.brassDark);
}

/** Шестерня: центр, радиус. */
export function gear(pix, cx, cy, r = 10) {
  for (let y = -r - 3; y <= r + 3; y++)
    for (let x = -r - 3; x <= r + 3; x++) {
      const d = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const tooth = Math.cos(a * 8) > 0.3 ? 3 : 0;
      if (d <= r + tooth) {
        const c =
          d < 3 ? C.black : d < r * 0.45 ? W6.gearDark : d > r + tooth - 1.2 ? C.black : W6.gear;
        pix.set(cx + x, cy + y, c);
      }
    }
}

/** Цепь между шестернями: петля по прямоугольнику пути платформы (x0..x1, y0..y1). */
export function chainLoop(pix, x0, y0, x1, y1) {
  const dot = (x, y, i) => pix.set(x, y, i % 4 < 2 ? W6.gear : C.black);
  let i = 0;
  for (let x = x0; x <= x1; x++) {
    dot(x, y0 + 4, i++);
    dot(x, y1 + 4, i++);
  }
  for (let y = y0 + 4; y <= y1 + 4; y++) {
    dot(x0, y, i++);
    dot(x1, y, i++);
  }
}

/** Циферблат часовой башни (на нём — год фазы Щелина, его пишет игра). Центр, радиус. */
export function clockFace(pix, cx, cy, r) {
  pix.ellipse(cx, cy, r + 3, r + 3, C.black);
  pix.ellipse(cx, cy, r + 2, r + 2, W6.brassDark);
  pix.ellipse(cx, cy, r, r, C.cream);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pix.rect(
      Math.round(cx + Math.cos(a) * (r - 3)) - 1,
      Math.round(cy + Math.sin(a) * (r - 3)) - 1,
      2,
      2,
      C.black,
    );
  }
}
