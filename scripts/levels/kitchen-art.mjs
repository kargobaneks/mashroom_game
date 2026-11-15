// Арт частей 1-2 «Кухня» и 1-3 «Мойка» уровня 1 (по структуре частей оригинала, своя обстановка).
// Предмет: { w, h (тайлы), draw(pix, x, y) — левый верх в px, collide(m, col, top) }.
import { NES as C } from './pixels.mjs';

const T = 16;

// ——— Фоны ———

/** Кафель кухни: тёплый, малоконтрастный (фон не спорит с предметами); пол — шахматка. */
export function tiles(pix, x0, y0, w, h, floorY = Infinity) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    if (y >= floorY)
      return (Math.floor(x / 8) + Math.floor((y - floorY) / 8)) % 2 ? C.cream : C.tan;
    if (x % 16 === 0 || y % 16 === 0) return C.skinPale;
    return C.cream;
  });
}

/** Кафель мойки: холодный, малоконтрастный; полоса фартука; пол — шахматка. */
export function sinkTiles(pix, x0, y0, w, h, floorY = Infinity) {
  pix.fillPattern(x0, y0, w, h, (x, y) => {
    if (y >= floorY)
      return (Math.floor(x / 8) + Math.floor((y - floorY) / 8)) % 2 ? C.silver : C.gray;
    if (y > floorY - 56 && y < floorY - 48) return C.lavender;
    if (x % 16 === 0 || y % 16 === 0) return C.lavender;
    return C.paleSky;
  });
}

/** Сплошной пол (рисуется отдельно поверх фона, если нужно другое покрытие). */
export function floorStrip(pix, x, y, w, h) {
  pix.fillPattern(x, y, w, h, (px, py) =>
    (Math.floor(px / 8) + Math.floor((py - y) / 8)) % 2 ? C.cream : C.tan,
  );
  pix.hline(x, y, w, C.black);
}

// ——— Полки, посуда, плиты ———

/** Настенная полка с посудой: платформа. */
export function shelf(wTiles, load = 'pots') {
  return {
    w: wTiles,
    h: 1,
    draw(pix, x, y) {
      const w = wTiles * T;
      pix.rect(x, y, w, 5, C.olive);
      pix.hline(x, y, w, C.gold);
      pix.hline(x, y + 4, w, C.darkOlive);
      pix.rect(x + 3, y + 5, 3, 8, C.darkOlive);
      pix.rect(x + w - 6, y + 5, 3, 8, C.darkOlive);
      for (let k = 4; k < w - 12; k += 14) {
        if (load === 'pots') {
          pix.box(x + k, y - 9, 12, 9, C.silver, C.gray);
          pix.hline(x + k - 1, y - 9, 14, C.gray);
        } else if (load === 'plates') {
          for (let p = 0; p < 4; p++)
            pix.hline(x + k, y - 2 - p * 2, 12, p % 2 ? C.silver : C.white);
        } else {
          pix.box(x + k + 2, y - 11, 8, 11, C.paleSky, C.silver);
          pix.rect(x + k + 3, y - 7, 6, 6, k % 28 ? C.gold : C.red);
        }
      }
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Стопка тарелок: твёрдая, на неё можно встать. */
export function plateStack(hTiles = 2) {
  return {
    w: 1,
    h: hTiles,
    draw(pix, x, y) {
      const h = hTiles * T;
      for (let py = 0; py < h; py += 3) {
        pix.hline(x + 1, y + py, 14, C.white);
        pix.hline(x + 1, y + py + 1, 14, C.silver);
        pix.hline(x + 2, y + py + 2, 12, C.paleSky);
      }
    },
    collide(m, col, top) {
      m.oneway(col, col, top);
    },
  };
}

/** Огромная кастрюля: твёрдая. */
export const bigPot = {
  w: 2,
  h: 2,
  draw(pix, x, y) {
    pix.box(x + 2, y + 6, 28, 26, C.silver, C.gray);
    pix.hline(x, y + 6, 32, C.gray);
    pix.rect(x, y + 10, 3, 4, C.black);
    pix.rect(x + 29, y + 10, 3, 4, C.black);
    pix.rect(x + 4, y + 2, 24, 4, C.gray);
    pix.rect(x + 13, y, 6, 2, C.black);
    for (let k = 0; k < 3; k++) pix.set(x + 9 + k * 7, y - 3 - (k % 2) * 2, C.white);
  },
  collide(m, col, top) {
    m.oneway(col, col + 1, top);
  },
};

/** Кухонная тумба со столешницей во всю высоту от пола: твёрдая, верх — рабочая поверхность. */
export function counter(wTiles, hTiles = 2) {
  return {
    w: wTiles,
    h: hTiles,
    draw(pix, x, y) {
      const w = wTiles * T;
      const h = hTiles * T;
      pix.rect(x, y, w, h, C.white);
      pix.rect(x, y, w, 4, C.gray);
      pix.hline(x, y, w, C.silver);
      for (let dx = 2; dx < w - 2; dx += 16) {
        pix.box(x + dx, y + 6, 14, h - 8, C.white, C.silver);
        pix.rect(x + dx + 6, y + 9, 3, 2, C.gray);
      }
      pix.hline(x, y + h - 1, w, C.gray);
    },
    collide(m, col, top) {
      m.oneway(col, col + wTiles - 1, top);
    },
  };
}

/** Плита в ряду тумб (той же высоты): конфорки раскалены — опасная поверхность, на плите кастрюля. */
export const stove = {
  w: 3,
  h: 2,
  draw(pix, x, y) {
    const w = 3 * T;
    pix.box(x, y + 4, w, 2 * T - 4, C.white, C.black);
    pix.box(x + 6, y + 12, w - 12, 2 * T - 16, C.gray, C.black);
    pix.rect(x, y, w, 5, C.black);
    for (const cx of [x + 12, x + 36]) {
      pix.ellipse(cx, y + 2, 8, 2, C.red);
      pix.ellipse(cx, y + 2, 5, 1, C.gold);
    }
    // Кастрюля с паром на дальней конфорке.
    pix.box(x + 28, y - 10, 16, 10, C.silver, C.black);
    for (let k = 0; k < 3; k++) pix.set(x + 31 + k * 5, y - 14 - (k % 2) * 3, C.white);
  },
  collide(m, col, top) {
    m.hazard(col, col + 2, top);
    m.oneway(col, col + 2, top);
  },
};

/** Холодильник (декор у стены). */
export function fridge(pix, x, floorY) {
  pix.box(x, floorY - 96, 40, 96, C.white, C.gray);
  pix.hline(x, floorY - 60, 40, C.gray);
  pix.rect(x + 32, floorY - 88, 3, 20, C.silver);
  pix.rect(x + 32, floorY - 52, 3, 30, C.silver);
  pix.rect(x + 6, floorY - 84, 10, 8, C.gold);
  pix.rect(x + 18, floorY - 80, 8, 6, C.sky);
}

/** Вытяжка (декор). */
export function hood(pix, x, y) {
  pix.rect(x + 12, y - 40, 24, 40, C.silver);
  pix.rect(x, y, 48, 8, C.silver);
  pix.hline(x, y + 7, 48, C.gray);
}

/** Шкаф во всю высоту шахты (декор по бокам вертикального экрана). */
export function tallCabinet(pix, x, y, w, h) {
  pix.box(x, y, w, h, C.olive, C.darkOlive);
  for (let py = y + 8; py < y + h - 8; py += 48) {
    pix.box(x + 4, py, w - 8, 40, C.tan, C.darkOlive);
    pix.rect(x + w - 10, py + 18, 3, 6, C.darkOlive);
  }
}

// ——— Бутылки сиропа с помпами (помпа — отдельный объект-лифт) ———

/** Бутылка сиропа: твёрдая, горлышко — верх. Рисунок подстраивается под высоту (1–4 тайла). */
export function syrupBottle(hTiles, color = C.darkRed) {
  return {
    w: 2,
    h: hTiles,
    draw(pix, x, y) {
      const h = hTiles * T;
      const neck = Math.min(8, Math.floor(h / 3));
      pix.rect(x + 12, y, 8, neck, C.silver);
      pix.hline(x + 11, y, 10, C.gray);
      const by = y + neck;
      const bh = h - neck;
      pix.box(x + 2, by, 28, bh, C.paleSky, C.silver);
      pix.rect(
        x + 4,
        by + Math.max(2, Math.floor(bh / 4)),
        24,
        bh - Math.max(3, Math.floor(bh / 4)) - 1,
        color,
      );
      // Этикетка — только если хватает высоты, и всегда внутри корпуса.
      if (bh >= 14) {
        const lh = Math.min(14, bh - 6);
        const ly = by + Math.floor((bh - lh) / 2);
        pix.box(x + 6, ly, 20, lh, C.white, C.black);
        pix.hline(x + 9, ly + Math.floor(lh / 2) - 1, 14, color);
        if (lh >= 10) pix.hline(x + 9, ly + lh - 4, 10, C.black);
      }
      pix.vline(x + 6, by + 2, bh - 4, C.white);
    },
    collide(m, col, top) {
      m.oneway(col, col + 1, top);
    },
  };
}

// ——— Мойка ———

/** Духовка: корпус твёрдый (верх — платформа), за стеклом — курица на решётке. */
export const oven = {
  w: 4,
  h: 3,
  draw(pix, x, y) {
    const w = 4 * T;
    const h = 3 * T;
    pix.box(x, y, w, h, C.silver, C.black);
    pix.rect(x + 2, y + 2, w - 4, 6, C.gray);
    for (let k = 0; k < 4; k++) pix.ellipse(x + 10 + k * 14, y + 5, 2, 2, C.black);
    pix.box(x + 6, y + 12, w - 12, h - 16, C.black, C.gray);
    pix.hline(x + 8, y + 30, w - 16, C.gray);
    pix.ellipse(x + w / 2, y + 25, 10, 5, C.orange);
    pix.ellipse(x + w / 2 - 2, y + 23, 6, 2, C.tan);
    pix.rect(x + w / 2 + 8, y + 26, 5, 2, C.cream);
    pix.rect(x + 10, y + 13, w - 20, 2, C.salmon);
  },
  collide(m, col, top) {
    m.oneway(col, col + 3, top);
  },
};

/**
 * Внутренность огромной мойки (масштаб бурундука): шлифованная сталь, слив на дне.
 * Рисуется как фон экрана; борта и дно — столкновения ставятся отдельно.
 */
export function sinkInterior(pix, x, y, w, h, bottomY) {
  pix.fillPattern(x, y, w, h, (px, py) => {
    if (py >= bottomY) return py === bottomY ? C.white : C.silver;
    return px % 7 === 0 || (px * 3 + py) % 53 === 0 ? C.silver : C.paleSky;
  });
  // Слив.
  const cx = x + Math.floor(w / 2);
  pix.ellipse(cx, bottomY + 2, 12, 2, C.gray);
  pix.ellipse(cx, bottomY + 2, 8, 1, C.black);
}

/** Стальной борт мойки (передний план). */
export function sinkWall(pix, x, y, w, h) {
  pix.rect(x, y, w, h, C.silver);
  pix.vline(x + 2, y, h, C.white);
  pix.vline(x + w - 3, y, h, C.gray);
  pix.rect(x - 2, y, w + 4, 4, C.white);
  pix.hline(x - 2, y + 4, w + 4, C.gray);
}

/** Кран над мойкой: труба сверху, носик вправо. Возвращает точку, откуда бьёт струя. */
export function faucet(pix, x, y) {
  pix.rect(x, y, 8, 30, C.silver);
  pix.vline(x + 1, y, 30, C.white);
  pix.rect(x, y + 24, 40, 8, C.silver);
  pix.hline(x, y + 24, 40, C.white);
  pix.rect(x + 34, y + 32, 8, 6, C.gray);
  pix.ellipse(x + 4, y - 2, 8, 3, C.red);
  return { x: x + 36, y: y + 38 };
}

/** Вентиль у пола (декор; зона-триггер ставится отдельно). */
export function valve(pix, x, floorY) {
  pix.rect(x + 6, floorY - 24, 4, 24, C.gray);
  pix.ellipse(x + 8, floorY - 26, 7, 3, C.red);
  pix.hline(x + 1, floorY - 26, 15, C.darkRed);
}

/**
 * Выход из части: служебная дверь (2 тайла, вплотную к стене справа) и зона exit — проём двери
 * (без 4 px по краям). Переход — когда центр игрока внутри проёма, то есть игрок вошёл в дверь.
 */
export function placeExitDoor(m, col, floorRow) {
  const T2 = 16;
  m.decor((p) => exitDoor(p, col * T2, floorRow * T2));
  m.zone('exit', col * T2 + 4, floorRow * T2 - 48, 24, 48);
}

/** Служебная дверь (рисунок). */
export function exitDoor(pix, x, floorY) {
  pix.box(x, floorY - 64, 32, 64, C.olive, C.darkOlive);
  pix.rect(x + 4, floorY - 58, 24, 20, C.paleSky);
  pix.rect(x + 24, floorY - 34, 3, 6, C.gold);
  pix.box(x + 6, floorY - 78, 20, 10, C.green, C.darkGreen);
  pix.rect(x + 9, floorY - 75, 14, 4, C.white);
}
