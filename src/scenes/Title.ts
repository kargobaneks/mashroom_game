import { PALETTE } from '../ui/palette';
import { DISPLAY } from '../config/display';
import { playMusic } from '../systems/Audio';
import { t } from '../systems/Text';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

const BLINK_FRAMES = 30;

export class Title extends BaseScene {
  private prompt!: Phaser.GameObjects.BitmapText;
  private frame = 0;

  constructor() {
    super('Title');
  }

  protected build(): void {
    this.frame = 0;
    playMusic(this, 'title');
    const cx = DISPLAY.width / 2;
    uiText(this, cx, 64, t('game.title'), { align: 'center' }).setScale(2);
    uiText(this, cx, 92, t('game.subtitle'), { align: 'center' });
    uiText(this, cx, 116, t('game.tagline'), { align: 'center', color: PALETTE.sky });
    this.prompt = uiText(this, cx, 176, t('title.pressStart'), { align: 'center' });
  }

  protected tick(): void {
    this.frame++;
    this.prompt.setVisible(Math.floor(this.frame / BLINK_FRAMES) % 2 === 0);
    if (this.controls.anyPressed('start', 'jump')) this.switchTo({ scene: 'PlayerSelect' });
  }
}
