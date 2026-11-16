// Уровень 3, арена Бордачёва: шахта трюма, где всё поднимается (по кадрам арены уровня 3
// оригинала: три колонны стальных платформ, платформы непрерывно едут вверх, босс и герои
// прыгают с платформы на платформу).
// Замер оригинала: колонны 0–60, 94–162, 197–256 px; шаг по вертикали ~86 px; средняя колонна
// сдвинута относительно боковых (34 и 52 px). У нас — по сетке 16 px: колонны по 4 тайла
// (0–64, 96–160, 192–256), шаг 80 px, средняя ниже боковой на 32 px (запрыгнуть можно) и выше
// следующей боковой на 48 px (только спрыгнуть).
// На стенах — красные плафоны: на них встают (ступенька 32 вверх с боковой, 16 — до средней).
// Камера опускается сама (сегмент rise), каждые 160 px мир переносится вверх — шахта
// бесконечная, поэтому весь арт повторяется с периодом 160.
// Сетка 16 × 30: экран и ещё 2 периода под ним.
import { MapBuilder, TILE } from './lib.mjs';
import * as S from './ship-art.mjs';

const PERIOD = 80;
const WRAP = 2 * PERIOD;
const COLS = { left: 0, mid: 6, right: 12 };
const W = 4;

export function buildLevel3Arena() {
  const m = new MapBuilder(16, 30);
  const H = 30 * TILE;
  const sideRows = [];
  const midRows = [];
  for (let r = 0; r < 30; r++) {
    if (r % 5 === 3) sideRows.push(r);
    if (r % 5 === 0) midRows.push(r);
  }

  m.paint((p) => {
    S.hullWall(p, 0, 0, 16 * TILE, H);
    S.pipeTower(p, 104, 0, H);
    S.clampPipe(p, 10, 0, H);
    S.clampPipe(p, 245, 0, H);
    for (let oy = -WRAP; oy < H + WRAP; oy += WRAP) {
      // Иллюминаторы и плафоны чередуются слева и справа, как в оригинале.
      S.porthole(p, 220, oy + 98);
      S.porthole(p, 36, oy + 18);
    }
  });
  // Плафоны — тоже опора (как в оригинале): у внутреннего края боковой колонны, слева и справа
  // через ярус. Боковая → плафон (32 px вверх) → средняя (16 px) — можно забраться наверх.
  const LAMPS = [
    { col: 2, top: 96 },
    { col: 13, top: 16 },
  ];
  for (const { col, top } of LAMPS) {
    for (let y = top; y < H; y += WRAP) {
      m.paint((p) => S.lamp(p, col * TILE + 2, y));
      m.oneway(col, col, y / TILE);
    }
  }
  const shelf = (col, row) => {
    m.decor((p) => S.platform(p, col * TILE, row * TILE, W * TILE), col * TILE, (col + W) * TILE);
    if (col + W < 16) m.paint((p) => S.platformShadow(p, (col + W) * TILE + 1, row * TILE));
    m.oneway(col, col + W - 1, row);
  };
  for (const r of sideRows) {
    shelf(COLS.left, r);
    shelf(COLS.right, r);
  }
  for (const r of midRows) shelf(COLS.mid, r);

  // Герой — на левой платформе, Бордачёв — на правой повыше.
  m.point('spawn', COLS.left + 1, 13);
  m.point('respawn', COLS.mid + 2, 10);
  m.point('bossPoint', COLS.right + 2, 8);

  m.segment('rise', 0, 0, 16 * TILE, H, { boss: 'bordachev', wrap: WRAP });
  return m;
}
