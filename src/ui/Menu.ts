import type Phaser from 'phaser';
import { playSfx } from '../systems/Audio';
import type { Controls } from '../systems/Input';
import { uiText } from './text';

import { nextEnabled, type MenuItem } from './menuLogic';

export type { MenuItem };

/** Вертикальное меню: ↑↓ — выбор, прыжок/действие/Start — подтвердить. */
export class Menu {
  private index: number;
  private items: readonly MenuItem[];
  private readonly texts: Phaser.GameObjects.BitmapText[];

  constructor(
    private readonly scene: Phaser.Scene,
    items: readonly MenuItem[],
    x: number,
    y: number,
    lineHeight: number,
  ) {
    this.items = items;
    this.index = items[0]?.enabled === false ? nextEnabled(items, 0, 1) : 0;
    this.texts = items.map((_, i) => uiText(scene, x, y + i * lineHeight, ''));
    this.render();
  }

  get objects(): Phaser.GameObjects.GameObject[] {
    return this.texts;
  }

  setDepth(depth: number): this {
    for (const t of this.texts) t.setDepth(depth);
    return this;
  }

  setScrollFactor(f: number): this {
    for (const t of this.texts) t.setScrollFactor(f);
    return this;
  }

  /** Какой пункт сейчас выделен. */
  get selected(): number {
    return this.index;
  }

  /** Сменить подписи (число пунктов то же). */
  setLabels(items: readonly MenuItem[]): void {
    this.items = items;
    this.render();
  }

  /**
   * Возвращает индекс выбранного пункта, если игрок подтвердил выбор на этом шаге.
   * Start подтверждает только в меню без своего смысла для Start (см. confirmWithStart).
   */
  update(controls: Controls, confirmWithStart = true): number | null {
    if (controls.anyPressed('down')) this.move(1);
    if (controls.anyPressed('up')) this.move(-1);
    const keys = confirmWithStart
      ? (['jump', 'action', 'start'] as const)
      : (['jump', 'action'] as const);
    if (!controls.anyPressed(...keys)) return null;
    playSfx(this.scene, 'menu');
    return this.index;
  }

  private move(dir: 1 | -1): void {
    this.index = nextEnabled(this.items, this.index, dir);
    playSfx(this.scene, 'menu');
    this.render();
  }

  private render(): void {
    this.texts.forEach((txt, i) => {
      const item = this.items[i];
      const enabled = item?.enabled !== false;
      txt.setText(`${i === this.index ? '▶' : ' '} ${item?.label ?? ''}`);
      txt.setAlpha(enabled ? 1 : 0.4);
    });
  }
}
