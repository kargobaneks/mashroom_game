import { CAMERA, RISING_ARENA } from '../config/camera';
import { DISPLAY } from '../config/display';
import type { Point, Rect } from './geom';
import type { Segment } from './level';

/**
 * Камера с сегментами. Прокручивается только вперёд: ушедшая за край часть уровня недоступна.
 * В коопе идёт за лидером, но не дальше, чем позволяет отстающий (он остаётся на экране,
 * край экрана его толкает). Дойдя до конца сегмента, переходит в следующий.
 */
export class Camera {
  x = 0;
  y = 0;
  index = 0;
  readonly w = DISPLAY.width;
  readonly h = DISPLAY.height;

  constructor(readonly segments: readonly Segment[]) {
    this.enter(0);
  }

  get segment(): Segment {
    const s = this.segments[this.index];
    if (!s) throw new Error(`No camera segment ${this.index}`);
    return s;
  }

  get view(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Позиция камеры в начале сегмента. */
  static startOf(s: Segment): Point {
    return s.dir === 'up' ? { x: s.x, y: s.y + s.h - DISPLAY.height } : { x: s.x, y: s.y };
  }

  /** Перейти в сегмент (в его начало). */
  enter(index: number): void {
    this.index = index;
    const p = Camera.startOf(this.segment);
    this.x = p.x;
    this.y = p.y;
  }

  /**
   * Сдвинуть камеру за игроками. Возвращает сегмент, в который камера только что вошла.
   * bodies — активные игроки (на экране, управляемые).
   */
  update(bodies: readonly Rect[]): Segment | null {
    if (bodies.length === 0) return null;
    const s = this.segment;
    switch (s.dir) {
      case 'right': {
        const lead = Math.max(...bodies.map((b) => b.x + b.w / 2));
        const lagLeft = Math.min(...bodies.map((b) => b.x));
        const maxX = s.x + s.w - this.w;
        const target = Math.min(lead - this.w * CAMERA.followRight, lagLeft, maxX);
        this.x = Math.max(this.x, target);
        if (this.x >= maxX) return this.advance();
        return null;
      }
      case 'down': {
        const lead = Math.max(...bodies.map((b) => b.y + b.h / 2));
        const lagTop = Math.min(...bodies.map((b) => b.y));
        const maxY = s.y + s.h - this.h;
        const target = Math.min(lead - this.h * CAMERA.followDown, lagTop, maxY);
        this.y = Math.max(this.y, target);
        if (this.y >= maxY) return this.advance();
        return null;
      }
      case 'up': {
        const lead = Math.min(...bodies.map((b) => b.y + b.h / 2));
        const lagBottom = Math.max(...bodies.map((b) => b.y + b.h));
        const target = Math.max(lead - this.h * CAMERA.followUp, lagBottom - this.h, s.y);
        this.y = Math.min(this.y, target);
        if (this.y <= s.y) return this.advance();
        return null;
      }
      case 'lock':
        return null;
      case 'rise':
        // Платформы поднимаются: камера опускается сама, игроки её не двигают.
        this.y += RISING_ARENA.speed;
        return null;
    }
  }

  /** Арена rise: камера опустилась на период шахты — перенести её вверх. Возвращает сдвиг, px. */
  wrapRise(): number {
    const s = this.segment;
    if (s.dir !== 'rise' || !s.wrap || this.y < s.y + s.wrap) return 0;
    this.y -= s.wrap;
    return -s.wrap;
  }

  private advance(): Segment | null {
    if (this.index + 1 >= this.segments.length) return null;
    this.enter(this.index + 1);
    return this.segment;
  }

  /**
   * Удержать тело в пределах экрана: по горизонтали всегда, сверху — кроме прокрутки вверх.
   * На арене rise верх экрана сталкивает с поднявшейся платформы — герой падает ниже.
   */
  clamp(b: Rect): void {
    if (b.x < this.x) b.x = this.x;
    if (b.x + b.w > this.x + this.w) b.x = this.x + this.w - b.w;
    const s = this.segment;
    if ((s.dir === 'down' || s.dir === 'lock' || s.dir === 'rise') && b.y < this.y) b.y = this.y;
  }

  /** Упал ли игрок в пропасть: ниже экрана (или ниже сегмента при прокрутке вниз). */
  fellOut(b: Rect): boolean {
    const s = this.segment;
    const floor = s.dir === 'down' ? s.y + s.h : this.y + this.h;
    return b.y > floor;
  }

  /** Виден ли прямоугольник с запасом margin. */
  sees(r: Rect, margin: number): boolean {
    return (
      r.x + r.w > this.x - margin &&
      r.x < this.x + this.w + margin &&
      r.y + r.h > this.y - margin &&
      r.y < this.y + this.h + margin
    );
  }
}
