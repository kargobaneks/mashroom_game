// Арт уровня 1 «Сытая Москва» — зал кофейни в масштабе бурундука (как зал ресторана в оригинале):
// нижний ярус — стулья и столы на высоких ножках, пола не видно, между ними провалы;
// верхний ярус — длинный подоконник под окнами с маркизой. На столах — кружки, сахарницы,
// ноутбуки: ступеньки наверх. Всё рисуется кодом, цвета — палитра NES.
// Предмет: { w, h (тайлы), draw(pix, x, y) — левый верх в px, collide(m, col, top) — столкновения }.
import { NES as C } from './pixels.mjs';

const T = 16;
/** Низ экрана: ножки мебели уходят за него. */
const SCREEN_BOTTOM = 15 * T;

// ——— Фоны ———

/** Обои зала на всю высоту: кремовые с ромбической сеткой-лозой. */
export function hallWall(pix, x0, y0, w, h) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    const u = (((x + y) % 32) + 32) % 32;
    const v = (((x - y) % 32) + 32) % 32;
    if (u === 0 || v === 0) return C.tan;
    if ((u === 16 && v % 4 === 0) || (v === 16 && u % 4 === 0)) return C.paleYellow;
    return C.cream;
  });
}

/**
 * Окно-витрина над подоконником: маркиза в полоску, стекло, силуэты Москвы.
 * x, w — в px; окно стоит от верха экрана до линии подоконника sillY.
 */
export function hallWindow(pix, x, w, sillY) {
  const top = 14;
  const h = sillY - top;
  pix.rect(x, top, w, h, C.white);
  pix.rect(x + 4, top + 12, w - 8, h - 12, C.paleSky);
  for (let i = 0; i < w - 8; i += 12) {
    const bh = 10 + ((i * 37 + x) % 21);
    pix.rect(x + 4 + i, sillY - bh, 10, bh, C.lavender);
    for (let wy = sillY - bh + 3; wy < sillY - 3; wy += 5) pix.set(x + 7 + i, wy, C.paleSky);
  }
  for (let k = 0; k < 20; k++) pix.set(x + 12 + k, top + 16 + k, C.white);
  for (let mx = x + 64; mx < x + w - 4; mx += 64) pix.rect(mx, top, 3, h, C.white);
  // Маркиза: зелёно-белые полосы с фестонами.
  for (let ax = x - 4; ax < x + w + 4; ax++) {
    const stripe = Math.floor((ax - x + 64) / 8) % 2 === 0;
    pix.rect(ax, 0, 1, top + 8, stripe ? C.green : C.white);
    const sc = (ax - x + 64) % 8;
    if (sc > 1 && sc < 6) pix.set(ax, top + 8, stripe ? C.green : C.white);
  }
  pix.hline(x - 4, top + 9, w + 8, C.darkGreen);
}

// ——— Верхний ярус ———

/** Подоконник: длинная платформа с тёмной тенью снизу. */
export function sill(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, 8, C.red);
      pix.hline(x, y, w, C.salmon);
      pix.hline(x, y + 2, w, C.cream);
      pix.hline(x, y + 7, w, C.darkRed);
      pix.rect(x + 4, y + 8, w, 6, C.black);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

// ——— Нижний ярус: стулья и столы на высоких ножках ———

/** Стул: широкое мягкое сиденье (платформа), спинка с одной стороны, ножки уходят вниз. */
export function chair(wTiles = 4, back = 'left') {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      const bx = back === 'left' ? x + 2 : x + w - 8;
      pix.box(bx, y - 2 * T, 6, 2 * T + 2, C.red, C.darkRed);
      pix.vline(bx + 2, y - 2 * T + 1, 2 * T, C.salmon);
      pix.box(x, y, w, 9, C.red, C.darkRed);
      pix.hline(x + 1, y + 1, w - 2, C.salmon);
      pix.hline(x + 2, y + 3, w - 4, C.white);
      const legH = SCREEN_BOTTOM - (y + 9);
      for (const lx of [x + 6, x + w - 12]) {
        pix.rect(lx, y + 9, 6, legH, C.darkRed);
        pix.vline(lx + 1, y + 9, legH, C.red);
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Столик: мраморная столешница (платформа), одна ножка по центру уходит вниз. */
export function table(wTiles = 7) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, 8, C.white);
      pix.hline(x, y, w, C.paleSky);
      pix.hline(x, y + 6, w, C.silver);
      pix.hline(x, y + 7, w, C.gray);
      for (let k = 8; k < w - 8; k += 20) pix.hline(x + k, y + 3, 6, C.paleSky);
      const cx = x + Math.floor(w / 2);
      const legH = SCREEN_BOTTOM - (y + 8);
      pix.rect(cx - 6, y + 8, 12, legH, C.darkRed);
      pix.rect(cx - 4, y + 8, 3, legH, C.red);
      pix.rect(cx - 9, y + 8, 18, 4, C.darkRed);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Стойка выдачи у служебного спуска: твёрдая до низа экрана. */
export function serviceCounter(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, SCREEN_BOTTOM - y, C.darkOlive);
      pix.rect(x, y, w, 5, C.silver);
      pix.hline(x, y, w, C.white);
      for (let px = x + 6; px < x + w - 6; px += 20)
        pix.box(px, y + 12, 14, SCREEN_BOTTOM - y - 16, C.brown, C.darkOlive);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

// ——— Предметы на столах (ступеньки наверх и декор) ———

/** Огромная кружка латте с сердечком на пенке: на неё можно встать. */
export const latteCup = {
  w: 2,
  h: 2,
  draw(pix, x, y) {
    pix.box(x + 1, y + 4, 26, 28, C.white, C.gray);
    pix.rect(x + 3, y + 4, 22, 4, C.tan);
    pix.ellipse(x + 14, y + 6, 4, 1, C.cream);
    pix.set(x + 12, y + 5, C.cream);
    pix.set(x + 16, y + 5, C.cream);
    pix.rect(x + 27, y + 10, 4, 3, C.gray);
    pix.rect(x + 29, y + 12, 3, 10, C.gray);
    pix.rect(x + 27, y + 21, 4, 3, C.gray);
    pix.rect(x + 3, y + 26, 22, 2, C.silver);
    pix.hline(x, y + 31, 32, C.silver);
  },
  collide(m, col, top) {
    m.oneway(col, col + 1, top);
  },
};

/** Ноутбук хипстера (декор на столе). */
export const laptop = {
  w: 2,
  h: 1,
  draw(pix, x, y) {
    pix.rect(x + 4, y + 2, 20, 12, C.gray);
    pix.rect(x + 6, y + 4, 16, 8, C.sky);
    pix.hline(x + 8, y + 6, 8, C.white);
    pix.hline(x + 8, y + 9, 5, C.white);
    pix.rect(x, y + 14, 28, 2, C.silver);
  },
  collide() {},
};

/** Тарелка с круассаном (декор). */
export const croissant = {
  w: 2,
  h: 1,
  draw(pix, x, y) {
    pix.ellipse(x + 14, y + 13, 13, 2, C.white);
    pix.ellipse(x + 14, y + 9, 9, 4, C.gold);
    pix.ellipse(x + 14, y + 8, 6, 2, C.paleYellow);
    for (const dx of [-6, -2, 2, 6]) pix.vline(x + 14 + dx, y + 6, 6, C.olive);
  },
  collide() {},
};

/** Сахарница-дозатор: твёрдая, на неё можно запрыгнуть. */
export const sugar = {
  w: 1,
  h: 2,
  draw(pix, x, y) {
    pix.rect(x + 4, y + 2, 8, 4, C.silver);
    pix.box(x + 2, y + 6, 12, 26, C.white, C.silver);
    pix.rect(x + 4, y + 20, 8, 10, C.cream);
  },
  collide(m, col, top) {
    m.oneway(col, col, top);
  },
};

/** Высокий стакан айс-латте с трубочкой: твёрдый, 1×2. */
export const icedLatte = {
  w: 1,
  h: 2,
  draw(pix, x, y) {
    pix.box(x + 1, y + 4, 14, 28, C.paleSky, C.silver);
    pix.rect(x + 2, y + 16, 12, 15, C.tan);
    pix.rect(x + 2, y + 12, 12, 4, C.cream);
    pix.box(x + 4, y + 7, 4, 4, C.white, C.paleSky);
    pix.box(x + 8, y + 18, 4, 4, C.white, C.cream);
    pix.vline(x + 10, y - 4, 12, C.green);
    pix.vline(x + 11, y - 4, 2, C.green);
  },
  collide(m, col, top) {
    m.oneway(col, col, top);
  },
};

/** Авокадо-тост на доске (декор). */
export const avocadoToast = {
  w: 2,
  h: 1,
  draw(pix, x, y) {
    pix.rect(x + 1, y + 12, 30, 4, C.olive);
    pix.hline(x + 1, y + 12, 30, C.tan);
    pix.rect(x + 6, y + 6, 20, 6, C.tan);
    pix.rect(x + 7, y + 4, 18, 3, C.lime);
    for (const dx of [9, 14, 19]) pix.set(x + dx, y + 5, C.darkGreen);
  },
  collide() {},
};

// ——— Служебный спуск, шахта и подвал ———

/** Открытый служебный люк в стене-полу (декор вокруг проёма). */
export function hatch(pix, x, y, wTiles) {
  const w = wTiles * T;
  pix.rect(x, y, w, SCREEN_BOTTOM - y, C.black);
  pix.rect(x - 4, y - 2, 4, 6, C.darkOlive);
  pix.box(x + w - 10, y - 34, 10, 34, C.olive, C.darkOlive);
}

/** Кирпич: подсобка (светлее) и шахта/подвал (тёмный). */
export function brickWall(pix, x0, y0, w, h, dark, floorY = Infinity) {
  const brick = dark ? C.darkRed : C.salmon;
  const mortar = dark ? C.black : C.skinPale;
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    if (y >= floorY) return (y - floorY) % 6 === 0 ? C.black : C.gray;
    const row = Math.floor(y / 8);
    if (y % 8 === 0) return mortar;
    if ((x + (row % 2) * 8) % 16 === 0) return mortar;
    return (x * 7 + row * 13) % 29 === 0 ? (dark ? C.brown : C.red) : brick;
  });
}

/** Труба-уступ в шахте: платформа. */
export function pipe(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, 8, C.gray);
      pix.hline(x, y, w, C.silver);
      pix.hline(x, y + 7, w, C.black);
      for (let k = 6; k < w; k += 14) pix.rect(x + k, y, 3, 8, C.silver);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

// ——— Подвал: арена ———

/** Обжарочный барабан (декор). */
export function roaster(pix, x, floorY) {
  pix.box(x, floorY - 70, 56, 46, C.darkRed, C.black);
  pix.ellipse(x + 28, floorY - 47, 16, 16, C.silver);
  pix.ellipse(x + 28, floorY - 47, 12, 12, C.darkOlive);
  pix.rect(x + 20, floorY - 100, 16, 30, C.silver);
  pix.rect(x + 8, floorY - 24, 6, 24, C.black);
  pix.rect(x + 42, floorY - 24, 6, 24, C.black);
}

/** Полка арены (платформа). */
export function arenaShelf(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, 4, C.olive);
      pix.hline(x, y, w, C.gold);
      pix.rect(x + 4, y + 4, 3, 6, C.darkOlive);
      pix.rect(x + w - 7, y + 4, 3, 6, C.darkOlive);
      for (let k = 6; k < w - 10; k += 12) {
        pix.box(x + k, y - 10, 8, 10, C.paleSky, C.silver);
        pix.rect(x + k + 1, y - 6, 6, 5, k % 24 ? C.gold : C.red);
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Ступенька-ящик (твёрдая). */
export const step = {
  w: 1,
  h: 1,
  draw(pix, x, y) {
    pix.box(x, y, T, T, C.olive, C.darkOlive);
    pix.hline(x + 1, y + 1, T - 2, C.gold);
    pix.vline(x + 7, y + 2, T - 3, C.darkOlive);
  },
  collide(m, col, top) {
    m.oneway(col, col, top);
  },
};

/** Низкая тумба у стены арены: твёрдая, высотой 1 тайл. */
export function counterBlock(wTiles) {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, T, C.olive);
      pix.hline(x, y, w, C.gold);
      for (let k = x + 4; k < x + w - 4; k += 16) pix.box(k, y + 4, 12, 10, C.tan, C.darkOlive);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Молочная пена у пола арены (декор поверх пола). */
export function milkFoam(pix, x, y, w, h) {
  pix.fillPattern(x, y, w, h, (px, py) => {
    const wave = Math.round(Math.sin(px / 5) * 2);
    if (py - y < 3 + wave) return null;
    return (px * 3 + py * 5) % 11 === 0 ? C.paleSky : C.white;
  });
}
