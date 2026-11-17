import type { Rect } from './geom';
import type { TileGrid } from './TileGrid';

/** Тело с хитбоксом и скоростью, пиксели за кадр. */
export interface Body extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
}

/** Платформа «только сверху»; dy — на сколько она сдвинулась по вертикали за этот кадр. */
export interface PlatformRect extends Rect {
  readonly dy?: number;
}

export interface MoveOptions {
  /** Проваливаться сквозь oneway-платформы (вниз + прыжок). */
  readonly dropThrough?: boolean;
  /** Не замечать oneway-платформы вовсе (летящие снаряды). */
  readonly ignoreOneway?: boolean;
  /** Дополнительные платформы «только сверху». */
  readonly platforms?: readonly Rect[];
  /** Твёрдые блоки — например, лежащие ящики: в них упираются и на них встают. */
  readonly solids?: readonly Rect[];
}

export interface MoveResult {
  hitWall: boolean;
  hitCeiling: boolean;
  landed: boolean;
}

const EPS = 0.001;

/**
 * Сдвинуть тело на (vx, vy) с учётом тайлов: сначала по X, потом по Y.
 * Скорости меньше размера тайла, поэтому за шаг пересекается не больше одной границы.
 */
export function moveBody(b: Body, grid: TileGrid, opts: MoveOptions = {}): MoveResult {
  const T = grid.size;
  const res: MoveResult = { hitWall: false, hitCeiling: false, landed: false };

  if (b.vx !== 0) {
    const nx = b.x + b.vx;
    const ty0 = Math.floor(b.y / T);
    const ty1 = Math.floor((b.y + b.h - EPS) / T);
    const tx = b.vx > 0 ? Math.floor((nx + b.w - EPS) / T) : Math.floor(nx / T);
    let blocked = false;
    for (let ty = ty0; ty <= ty1 && !blocked; ty++) blocked = grid.isSolid(tx, ty);
    let x = blocked ? (b.vx > 0 ? tx * T - b.w : (tx + 1) * T) : nx;
    for (const s of opts.solids ?? []) {
      const vOverlap = b.y < s.y + s.h - EPS && b.y + b.h > s.y + EPS;
      if (!vOverlap) continue;
      if (b.vx > 0 && b.x + b.w <= s.x + EPS && x + b.w > s.x) {
        x = s.x - b.w;
        blocked = true;
      } else if (b.vx < 0 && b.x >= s.x + s.w - EPS && x < s.x + s.w) {
        x = s.x + s.w;
        blocked = true;
      }
    }
    b.x = x;
    res.hitWall = blocked;
  }

  const tx0 = Math.floor(b.x / T);
  const tx1 = Math.floor((b.x + b.w - EPS) / T);

  if (b.vy > 0) {
    const oldBottom = b.y + b.h;
    const newBottom = oldBottom + b.vy;
    const ty = Math.floor((newBottom - EPS) / T);
    let landY = Infinity;
    for (let tx = tx0; tx <= tx1; tx++) {
      if (grid.isSolid(tx, ty)) landY = Math.min(landY, ty * T);
      else if (
        !opts.dropThrough &&
        !opts.ignoreOneway &&
        grid.isOneway(tx, ty) &&
        oldBottom <= ty * T + EPS
      ) {
        landY = Math.min(landY, ty * T);
      }
    }
    for (const s of opts.solids ?? []) {
      const hOverlap = b.x < s.x + s.w - EPS && b.x + b.w > s.x + EPS;
      if (hOverlap && oldBottom <= s.y + EPS && newBottom >= s.y) landY = Math.min(landY, s.y);
    }
    if (!opts.dropThrough) {
      for (const p of opts.platforms ?? []) {
        const hOverlap = b.x < p.x + p.w && b.x + b.w > p.x;
        // Поднявшаяся за этот кадр платформа (цепь) могла проскочить мимо ног — допуск на её ход.
        const rose = Math.max(0, -((p as PlatformRect).dy ?? 0));
        if (hOverlap && oldBottom <= p.y + rose + EPS && newBottom >= p.y)
          landY = Math.min(landY, p.y);
      }
    }
    if (landY !== Infinity) {
      b.y = landY - b.h;
      b.vy = 0;
      res.landed = true;
    } else {
      b.y += b.vy;
    }
  } else if (b.vy < 0) {
    const ny = b.y + b.vy;
    const ty = Math.floor(ny / T);
    let ceil = -Infinity;
    for (let tx = tx0; tx <= tx1; tx++) if (grid.isSolid(tx, ty)) ceil = (ty + 1) * T;
    for (const s of opts.solids ?? []) {
      const hOverlap = b.x < s.x + s.w - EPS && b.x + b.w > s.x + EPS;
      if (hOverlap && b.y >= s.y + s.h - EPS && ny < s.y + s.h) ceil = Math.max(ceil, s.y + s.h);
    }
    if (ceil !== -Infinity) {
      b.y = ceil;
      b.vy = 0;
      res.hitCeiling = true;
    } else {
      b.y = ny;
    }
  }

  b.onGround = res.landed;
  return res;
}

/** Есть ли опора под передним краем тела (для разворота врагов у обрыва). */
export function groundAhead(
  b: Rect,
  dir: 1 | -1,
  grid: TileGrid,
  platforms: readonly Rect[] = [],
): boolean {
  const T = grid.size;
  const probeX = dir > 0 ? b.x + b.w + 1 : b.x - 1;
  const probeY = b.y + b.h + 1;
  const tx = Math.floor(probeX / T);
  const ty = Math.floor(probeY / T);
  if (grid.isSolid(tx, ty) || grid.isOneway(tx, ty)) return true;
  return platforms.some(
    (p) => probeX >= p.x && probeX < p.x + p.w && Math.abs(p.y - (b.y + b.h)) < 1,
  );
}
