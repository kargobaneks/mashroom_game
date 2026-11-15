import type { Rect } from './geom';

/**
 * Сетка тайлов уровня: три слоя из Tiled — solid (стены и пол), oneway (тонкие платформы,
 * сквозь которые прыгают снизу), hazard (опасная поверхность). За краями карты по горизонтали —
 * стена, сверху и снизу — пустота (снизу — пропасть).
 */
export class TileGrid {
  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly size: number,
    private readonly solid: Uint8Array,
    private readonly oneway: Uint8Array,
    private readonly hazard: Uint8Array,
  ) {}

  /** Для тестов: '#' — solid, '=' — oneway, '^' — hazard, остальное — пусто. */
  static fromAscii(lines: readonly string[], size = 16): TileGrid {
    const rows = lines.length;
    const cols = Math.max(...lines.map((l) => l.length));
    const solid = new Uint8Array(cols * rows);
    const oneway = new Uint8Array(cols * rows);
    const hazard = new Uint8Array(cols * rows);
    lines.forEach((line, ty) => {
      for (let tx = 0; tx < line.length; tx++) {
        const i = ty * cols + tx;
        const ch = line[tx];
        if (ch === '#') solid[i] = 1;
        else if (ch === '=') oneway[i] = 1;
        else if (ch === '^') hazard[i] = 1;
      }
    });
    return new TileGrid(cols, rows, size, solid, oneway, hazard);
  }

  get widthPx(): number {
    return this.cols * this.size;
  }

  get heightPx(): number {
    return this.rows * this.size;
  }

  isSolid(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.cols) return true;
    if (ty < 0 || ty >= this.rows) return false;
    return this.solid[ty * this.cols + tx] === 1;
  }

  isOneway(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return false;
    return this.oneway[ty * this.cols + tx] === 1;
  }

  isHazard(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return false;
    return this.hazard[ty * this.cols + tx] === 1;
  }

  setSolid(tx: number, ty: number, value: boolean): void {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return;
    this.solid[ty * this.cols + tx] = value ? 1 : 0;
  }

  /** Касается ли прямоугольник хоть одной solid-клетки. */
  rectHitsSolid(r: Rect): boolean {
    return this.anyTile(r, (tx, ty) => this.isSolid(tx, ty));
  }

  rectTouchesHazard(r: Rect): boolean {
    return this.anyTile(r, (tx, ty) => this.isHazard(tx, ty));
  }

  private anyTile(r: Rect, test: (tx: number, ty: number) => boolean): boolean {
    const eps = 0.001;
    const x0 = Math.floor(r.x / this.size);
    const x1 = Math.floor((r.x + r.w - eps) / this.size);
    const y0 = Math.floor(r.y / this.size);
    const y1 = Math.floor((r.y + r.h - eps) / this.size);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) if (test(tx, ty)) return true;
    return false;
  }
}
