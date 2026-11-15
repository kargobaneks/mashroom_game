import type Phaser from 'phaser';
import type { Controls } from '../systems/Input';
import { uiText } from './text';

export interface MenuItem {
  readonly label: string;
  readonly enabled?: boolean;
}

/** Индекс следующего доступного пункта (с переходом через край). */
export function nextEnabled(items: readonly MenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (items[i]?.enabled !== false) return i;
  }
  return from;
}

/** Вертикальное меню: ↑↓ — выбор, прыжок/действие/Start — подтвердить. */
export class Menu {
  private index: number;
  private readonly texts: Phaser.GameObjects.BitmapText[];

  constructor(
    scene: Phaser.Scene,
    private readonly items: readonly MenuItem[],
    x: number,
    y: number,
    lineHeight: number,
  ) {
    this.index = items[0]?.enabled === false ? nextEnabled(items, 0, 1) : 0;
    this.texts = items.map((it, i) => uiText(scene, x, y + i * lineHeight, it.label));
    this.render();
  }

  /** Возвращает индекс выбранного пункта, если игрок подтвердил выбор на этом шаге. */
  update(controls: Controls): number | null {
    if (controls.anyPressed('down')) this.move(1);
    if (controls.anyPressed('up')) this.move(-1);
    return controls.anyPressed('jump', 'action', 'start') ? this.index : null;
  }

  private move(dir: 1 | -1): void {
    this.index = nextEnabled(this.items, this.index, dir);
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
