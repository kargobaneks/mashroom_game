import type { Rect } from './geom';
import type { LetterGlyph } from './Item';
import type { World } from './World';

export type ProjectileKind =
  | 'latte'
  | 'stream'
  | 'paintball'
  | 'headline'
  | 'globe'
  | 'nut'
  | 'beam'
  | 'wrench'
  | 'bolt'
  | 'gear'
  | 'mothShot'
  | 'card'
  | 'pebble'
  | 'scrap'
  | 'letter'
  | 'spark';

/** Снаряд врага или босса. Ранит игрока при касании, гаснет о стену или за экраном. */
export class Projectile implements Rect {
  alive = true;
  x: number;
  y: number;

  constructor(
    readonly kind: ProjectileKind,
    /** Центр. */
    cxStart: number,
    cyStart: number,
    readonly w: number,
    readonly h: number,
    public vx: number,
    public vy: number,
    readonly gravity = 0,
    /** Пробивает укрытие в ящике (кран, луч призрака — на следующих уровнях). */
    readonly ignoresHide = false,
    /** Что делает при касании: ранит или (заголовок Уралова) накачивает шкалу паники. */
    readonly effect: 'hurt' | 'panic' = 'hurt',
    /** Синусоида по вертикали (заголовки по ветру): амплитуда, px, и шаг фазы. */
    readonly wave: { amplitude: number; frequency: number } | null = null,
  ) {
    this.x = cxStart - w / 2;
    this.y = cyStart - h / 2;
  }

  private phase = 0;
  /** Ускорение по горизонтали (шестерёнки 1991-го летят назад, к Щелину). */
  ax = 0;
  /** Шестерёнка, которая упадёт на пол и станет предметом (первая в очереди Щелина). */
  landsAsItem = false;
  /** Такая шестерёнка коснулась пола: мир кладёт на это место предмет. */
  landed = false;
  /** Летит сквозь стены и пол (второй обломок шара проваливается сквозь пол, как в оригинале). */
  ghost = false;
  /** Не ранит (обломок шара, который ляжет на пол: иначе он бьёт героя в левом углу, 18.11). */
  harmless = false;
  /** Предел скорости падения (буква арены Микитко падает не быстрее предметов). */
  maxVy = Infinity;
  /** Падающая буква: какая (рисунок). */
  glyph: LetterGlyph = 'yat';

  update(world: World): void {
    this.vy = Math.min(this.vy + this.gravity, this.maxVy);
    this.vx += this.ax;
    this.x += this.vx;
    this.y += this.vy;
    if (this.wave) {
      const before = Math.sin(this.phase) * this.wave.amplitude;
      this.phase += this.wave.frequency;
      this.y += Math.sin(this.phase) * this.wave.amplitude - before;
    }
    if (!this.ghost && world.grid.rectHitsSolid(this)) {
      this.alive = false;
      if (this.landsAsItem && this.vy > 0) this.landed = true;
    } else if (!world.camera.sees(this, 16)) this.alive = false;
  }
}
