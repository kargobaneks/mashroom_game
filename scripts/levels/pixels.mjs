// Пиксельный холст RGBA для рисования фонов и мебели уровня кодом. Цвета — из палитры NES.

/** Палитра NES (2C02), используемые цвета — по номерам. */
export const NES = {
  black: 0x000000,
  gray: 0x7c7c7c,
  silver: 0xbcbcbc,
  white: 0xfcfcfc,
  darkRed: 0xa81000,
  red: 0xf83800,
  salmon: 0xf87858,
  skinPale: 0xf0d0b0,
  brown: 0x881400,
  orange: 0xe45c10,
  tan: 0xfca044,
  cream: 0xfce0a8,
  darkOlive: 0x503000,
  olive: 0xac7c00,
  gold: 0xf8b800,
  paleYellow: 0xf8d878,
  darkGreen: 0x007800,
  green: 0x00a800,
  lime: 0xb8f818,
  paleLime: 0xd8f878,
  darkTeal: 0x004058,
  teal: 0x008888,
  aqua: 0x00e8d8,
  cyan: 0x00fcfc,
  blue: 0x0058f8,
  sky: 0x3cbcfc,
  paleSky: 0xa4e4fc,
  navy: 0x0000bc,
  lavender: 0xb8b8f8,
  purple: 0x940084,
  magenta: 0xd800cc,
  pink: 0xf878f8,
  palePink: 0xf8b8f8,
  rose: 0xf85898,
};

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4); // прозрачный
  }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === null || c === undefined) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = (c >> 16) & 255;
    this.data[i + 1] = (c >> 8) & 255;
    this.data[i + 2] = c & 255;
    this.data[i + 3] = 255;
  }

  rect(x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  hline(x, y, w, c) {
    this.rect(x, y, w, 1, c);
  }

  vline(x, y, h, c) {
    this.rect(x, y, 1, h, c);
  }

  /** Прямоугольник с контуром. */
  box(x, y, w, h, fill, outline) {
    this.rect(x, y, w, h, outline);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01) <= 1)
          this.set(cx + x, cy + y, c);
      }
    }
  }

  /** Повторить узор pattern(x, y) → цвет | null по прямоугольнику. */
  fillPattern(x0, y0, w, h, pattern) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) this.set(x, y, pattern(x, y));
  }

  /** Нарисовать ASCII-картинку: символ → цвет по таблице, '.' — пропуск. */
  ascii(x0, y0, rows, colors) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch !== '.' && colors[ch] !== undefined) this.set(x0 + x, y0 + y, colors[ch]);
      }
    });
  }

  /** Плитка 16×16 (x, y — в тайлах) как ключ для поиска одинаковых. */
  tileKey(tx, ty, T) {
    const parts = [];
    for (let y = 0; y < T; y++) {
      const i = ((ty * T + y) * this.w + tx * T) * 4;
      parts.push(this.data.subarray(i, i + T * 4).toString('base64'));
    }
    return parts.join('|');
  }

  tileIsEmpty(tx, ty, T) {
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++)
        if (this.data[((ty * T + y) * this.w + tx * T + x) * 4 + 3] !== 0) return false;
    }
    return true;
  }

  copyTile(tx, ty, T, dst, dx, dy) {
    for (let y = 0; y < T; y++) {
      const si = ((ty * T + y) * this.w + tx * T) * 4;
      const di = ((dy + y) * dst.w + dx) * 4;
      this.data.copy(dst.data, di, si, si + T * 4);
    }
  }
}
