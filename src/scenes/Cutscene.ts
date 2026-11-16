import { cutsceneTextureKey, framesOf, type CutsceneFrame } from '../data/cutscenes';
import { heroFrameName, HEROES_TEXTURE } from '../render/heroSprites';
import { partnerOf } from '../systems/Flow';
import { t } from '../systems/Text';
import { DialogueBox } from '../ui/DialogueBox';
import { PALETTE } from '../ui/palette';
import { FONT_KEY } from '../ui/font';
import { UI_FONT } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Иллюстрация — под текстовым окном. */
const PICTURE = { x: 4, y: 74 } as const;

/**
 * Кат-сцена (ТЗ: «Кат-сцены»): вверху окно с рамкой, текст печатается по символу, под ним
 * иллюстрация. Прыжок допечатывает строку или листает дальше, Start пропускает всю сцену.
 */
export class Cutscene extends BaseScene<{ id: string }> {
  private frames: readonly CutsceneFrame[] = [];
  private index = 0;
  private box: DialogueBox | null = null;
  private layer: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Cutscene');
  }

  protected build({ id }: { id: string }): void {
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.frames = framesOf(id);
    this.index = 0;
    this.layer = [];
    this.show();
  }

  private speakerName(frame: CutsceneFrame): string {
    switch (frame.speaker) {
      case 'player1':
        return t(`hero.${this.run.hero}`);
      case 'player2':
        return t(`hero.${partnerOf(this.run.hero)}`);
      case 'grpzdc':
        return t('speaker.grpzdc');
      default:
        return '';
    }
  }

  private show(): void {
    for (const o of this.layer) o.destroy();
    this.layer = [];
    const f = this.frames[this.index]!;
    if (f.bg) {
      this.layer.push(this.add.image(PICTURE.x, PICTURE.y, cutsceneTextureKey(f.bg)).setOrigin(0));
    }
    for (const a of f.actors ?? []) {
      if (a.player === 2 && this.run.players !== 2) continue;
      const hero = a.player === 1 ? this.run.hero : partnerOf(this.run.hero);
      this.layer.push(
        this.add
          .sprite(PICTURE.x + a.x, PICTURE.y + a.y, HEROES_TEXTURE, heroFrameName(hero, 'idle'))
          .setOrigin(0.5, 1),
      );
    }
    for (const l of f.labels ?? []) {
      this.layer.push(
        this.add
          .bitmapText(PICTURE.x + l.x, PICTURE.y + l.y, FONT_KEY, t(l.textKey), UI_FONT.size)
          .setOrigin(0.5, 0)
          .setTint(PALETTE.black),
      );
    }
    this.box = new DialogueBox(this, this.speakerName(f), t(f.textKey));
  }

  protected tick(): void {
    if (this.controls.anyPressed('start')) {
      this.go({ type: 'done' });
      return;
    }
    if (!this.box?.update(this.controls)) return;
    this.index++;
    if (this.index >= this.frames.length) this.go({ type: 'done' });
    else this.show();
  }
}
