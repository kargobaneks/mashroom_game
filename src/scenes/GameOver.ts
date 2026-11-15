import { PALETTE } from '../ui/palette';
import { t } from '../systems/Text';
import { Menu } from '../ui/Menu';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

export class GameOver extends BaseScene<{ canContinue: boolean }> {
  private menu!: Menu;

  constructor() {
    super('GameOver');
  }

  protected build({ canContinue }: { canContinue: boolean }): void {
    uiText(this, 32, 64, t('scene.gameOver'));
    this.menu = new Menu(
      this,
      [
        { label: t('gameOver.continue', { left: this.run.continuesLeft }), enabled: canContinue },
        { label: t('gameOver.menu') },
      ],
      40,
      96,
      16,
    );
    uiText(this, 32, 208, t('hint.menu'), { color: PALETTE.gray });
  }

  protected tick(): void {
    const picked = this.menu.update(this.controls);
    if (picked === 0) this.go({ type: 'continue' });
    else if (picked === 1) this.go({ type: 'quit' });
  }
}
