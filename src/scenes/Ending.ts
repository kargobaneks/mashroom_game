import { framesOf } from '../data/cutscenes';
import { DISPLAY } from '../config/display';
import { playMusic } from '../systems/Audio';
import { t } from '../systems/Text';
import { DialogueBox } from '../ui/DialogueBox';
import { PALETTE } from '../ui/palette';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Строки титров (ключи текста). */
const CREDITS = [
  'credits.title',
  'credits.hosts',
  'credits.guests',
  'credits.helpers',
  'credits.slogan',
];

/**
 * Финал (ТЗ: «Уровень 9 → побег → Ending → титры → сцена после титров → Title»): окна текста
 * рассказчика, потом титры, потом сцена после титров. Прыжок листает, Start пропускает всё.
 */
export class Ending extends BaseScene {
  private steps: ({ kind: 'text'; key: string } | { kind: 'credits' })[] = [];
  private index = 0;
  private box: DialogueBox | null = null;
  private layer: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Ending');
  }

  protected build(): void {
    playMusic(this, 'ending');
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.steps = [
      ...framesOf('ending').map((f) => ({ kind: 'text' as const, key: f.textKey })),
      { kind: 'credits' as const },
      ...framesOf('post').map((f) => ({ kind: 'text' as const, key: f.textKey })),
    ];
    this.index = 0;
    this.show();
  }

  private show(): void {
    for (const o of this.layer) o.destroy();
    this.layer = [];
    this.box = null;
    const step = this.steps[this.index]!;
    if (step.kind === 'text') {
      this.box = new DialogueBox(this, '', t(step.key));
      return;
    }
    let y = 40;
    for (const key of CREDITS) {
      const line = uiText(this, DISPLAY.width / 2, y, t(key), {
        align: 'center',
        color: key === 'credits.title' ? PALETTE.peach : PALETTE.white,
      });
      this.layer.push(line);
      y += line.height + 12;
    }
    this.layer.push(
      uiText(this, DISPLAY.width / 2, DISPLAY.height - 20, t('hint.confirm'), {
        align: 'center',
        color: PALETTE.gray,
      }),
    );
  }

  protected tick(): void {
    if (this.controls.anyPressed('start')) {
      this.go({ type: 'done' });
      return;
    }
    const next = this.box ? this.box.update(this.controls) : this.controls.anyPressed('jump');
    if (!next) return;
    this.index++;
    if (this.index >= this.steps.length) this.go({ type: 'done' });
    else this.show();
  }
}
