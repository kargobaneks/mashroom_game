import { PALETTE } from '../ui/palette';
import type { BonusGame } from '../config/levels';
import { t } from '../systems/Text';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Заглушка бонус-игры (этап 2). */
export class Bonus extends BaseScene<{ game: BonusGame }> {
  constructor() {
    super('Bonus');
  }

  protected build({ game }: { game: BonusGame }): void {
    uiText(this, 32, 64, t('scene.bonus'));
    uiText(this, 32, 80, t(`bonus.${game}`), { color: PALETTE.peach });
    uiText(this, 32, 208, t('hint.confirm'), { color: PALETTE.gray });
  }

  protected tick(): void {
    if (this.controls.anyPressed('jump', 'start')) this.go({ type: 'done' });
  }
}
