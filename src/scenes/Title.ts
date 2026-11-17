import { PALETTE } from '../ui/palette';
import { DISPLAY } from '../config/display';
import { playMusic } from '../systems/Audio';
import { t } from '../systems/Text';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

const BLINK_FRAMES = 30;
/** Картинка титула (scripts/title/build_title.py): ведущие, раскол неба, логотип. */
export const TITLE_ART_KEY = 'title-art';

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
    this.cameras.main.setBackgroundColor(PALETTE.black);
    // Как в оригинале: ведущие по бокам, логотип посередине (картинка с логотипом «КОМНАТА»).
    this.add.image(0, 4, TITLE_ART_KEY).setOrigin(0);
    uiText(this, cx, 162, t('game.subtitle'), { align: 'center', color: PALETTE.peach });
    uiText(this, cx, 178, t('game.tagline'), { align: 'center', color: PALETTE.sky });
    this.prompt = uiText(this, cx, 214, t('title.pressStart'), { align: 'center' });
  }

  protected tick(): void {
    this.frame++;
    this.prompt.setVisible(Math.floor(this.frame / BLINK_FRAMES) % 2 === 0);
    if (this.controls.anyPressed('start', 'jump')) this.switchTo({ scene: 'PlayerSelect' });
  }
}
