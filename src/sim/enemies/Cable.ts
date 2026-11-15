import { ENEMIES } from '../../config/enemies';
import type { Point } from '../geom';
import type { TileGrid } from '../TileGrid';
import type { World } from '../World';
import { Enemy } from './Enemy';

const C = ENEMIES.cable;

/**
 * Кабель-змейка: ползёт по поверхности твёрдых тайлов — по полу, вверх по стене, через край
 * вниз и дальше под ним, огибая углы (ТЗ). Тонкие платформы (мебель) не считаются — сквозь них
 * она проползает, как игрок проходит.
 *
 * Точка (px, py) лежит на границе тайлов; dir — направление вдоль поверхности, n — нормаль
 * наружу от твёрдого. Решение о повороте — только в углах сетки.
 */
export class Cable extends Enemy {
  private px: number;
  private py: number;
  private dx: number;
  private dy = 0;
  private nx = 0;
  private ny = -1;

  constructor(at: Point, spawnId: number, facing: -1 | 1 = -1) {
    super('cable', C.width, C.height, at, spawnId);
    this.px = Math.round(at.x);
    this.py = Math.round(at.y);
    this.dx = facing;
    this.facing = facing;
    this.place();
  }

  /** Куда сейчас прижата змейка (для отрисовки и тестов). */
  get surfaceNormal(): Point {
    return { x: this.nx, y: this.ny };
  }

  protected update(world: World): void {
    for (let i = 0; i < C.speed; i++) this.crawl(world.grid);
    if (this.dx !== 0) this.facing = this.dx > 0 ? 1 : -1;
    this.place();
  }

  private crawl(g: TileGrid): void {
    const T = g.size;
    if (this.px % T === 0 && this.py % T === 0) this.turnAtCorner(g, this.px / T, this.py / T);
    this.px += this.dx;
    this.py += this.dy;
  }

  /** Угол сетки (X, Y): впереди стена — вверх по ней; впереди пусто — за край, вниз. */
  private turnAtCorner(g: TileGrid, X: number, Y: number): void {
    const tile = (sx: number, sy: number) =>
      g.isSolid(X + (sx < 0 ? -1 : 0), Y + (sy < 0 ? -1 : 0));
    const outer = tile(this.dx || this.nx, this.dy || this.ny);
    const inner = tile(this.dx || -this.nx, this.dy || -this.ny);
    const { dx, dy, nx, ny } = this;
    if (outer) {
      // Внутренний угол: ползёт вверх по стене.
      this.dx = nx;
      this.dy = ny;
      this.nx = -dx;
      this.ny = -dy;
    } else if (!inner) {
      // Внешний угол: огибает край.
      this.dx = -nx;
      this.dy = -ny;
      this.nx = dx;
      this.ny = dy;
    }
  }

  private place(): void {
    const half = this.w / 2;
    this.x = this.px + this.nx * half - half;
    this.y = this.py + this.ny * half - half;
  }
}
