import type Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { FONT_KEY } from './font';

export const UI_FONT = {
  size: 8,
  /** Межстрочный интервал при переносе, px. */
  lineSpacing: 3,
  color: 0xffffff,
  /** Поля по краям экрана для переноса строк. */
  margin: 8,
} as const;

/** Текст пиксельным шрифтом (см. ui/font.ts). Цвет — 0xRRGGBB. */
export function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  opts: { color?: number; align?: 'left' | 'center' } = {},
): Phaser.GameObjects.BitmapText {
  const txt = scene.add.bitmapText(x, y, FONT_KEY, str, UI_FONT.size);
  txt.setTint(opts.color ?? UI_FONT.color);
  txt.setLineSpacing(UI_FONT.lineSpacing);
  if (opts.align === 'center') {
    txt.setCenterAlign().setOrigin(0.5, 0);
    txt.setMaxWidth(DISPLAY.width - UI_FONT.margin * 2);
  } else {
    txt.setMaxWidth(DISPLAY.width - x - UI_FONT.margin);
  }
  return txt;
}
