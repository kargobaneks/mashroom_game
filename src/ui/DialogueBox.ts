import type Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { playSfx } from '../systems/Audio';
import type { Controls } from '../systems/Input';
import { PALETTE } from './palette';
import { uiText } from './text';

export const DIALOGUE = {
  /** Печать по 1 символу за столько кадров (ТЗ: «Кат-сцены»). */
  framesPerChar: 2,
  /** Звук печати — раз в столько символов. */
  charsPerBlip: 2,
  box: { x: 4, y: 4, w: DISPLAY.width - 8, h: 64 },
  padding: 8,
  depth: 2000,
} as const;

/**
 * Окно реплики вверху экрана: текст печатается по символу. Прыжок допечатывает строку
 * или закрывает окно, Start — закрывает сразу.
 */
export class DialogueBox {
  private readonly objects: Phaser.GameObjects.GameObject[];
  private readonly scene: Phaser.Scene;
  private readonly body: Phaser.GameObjects.BitmapText;
  private shown = 0;
  private frame = 0;

  constructor(
    scene: Phaser.Scene,
    speaker: string,
    private readonly text: string,
  ) {
    this.scene = scene;
    const b = DIALOGUE.box;
    const p = DIALOGUE.padding;
    const bg = scene.add
      .rectangle(b.x, b.y, b.w, b.h, PALETTE.black)
      .setOrigin(0)
      .setStrokeStyle(1, PALETTE.white);
    const sp = uiText(scene, b.x + p, b.y + p, speaker, { color: PALETTE.peach });
    this.body = uiText(scene, b.x + p, b.y + p + 14, '');
    this.body.setMaxWidth(b.w - p * 2);
    this.objects = [bg, sp, this.body];
    for (const o of [bg, sp, this.body]) o.setScrollFactor(0).setDepth(DIALOGUE.depth);
  }

  get complete(): boolean {
    return this.shown >= this.text.length;
  }

  /** true — окно закрыто, можно продолжать. */
  update(controls: Controls): boolean {
    if (controls.anyPressed('start')) return this.close();
    if (controls.anyPressed('jump')) {
      if (!this.complete) this.shown = this.text.length;
      else return this.close();
    }
    if (!this.complete && ++this.frame % DIALOGUE.framesPerChar === 0) {
      this.shown++;
      if (this.text[this.shown - 1] !== ' ' && this.shown % DIALOGUE.charsPerBlip === 0)
        playSfx(this.scene, 'text');
    }
    this.body.setText(this.text.slice(0, this.shown));
    return false;
  }

  private close(): boolean {
    for (const o of this.objects) o.destroy();
    return true;
  }
}
