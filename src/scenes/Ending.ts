import { PALETTE } from '../ui/palette';
import { playMusic } from '../systems/Audio';
import { t } from '../systems/Text';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Заглушка финала. Титры и сцена после титров — этап 3. */
export class Ending extends BaseScene {
  constructor() {
    super('Ending');
  }

  protected build(): void {
    playMusic(this, 'ending');
    uiText(this, 32, 64, t('scene.ending'));
    uiText(this, 32, 88, t('ending.text'), { color: PALETTE.peach });
    uiText(this, 32, 208, t('hint.confirm'), { color: PALETTE.gray });
  }

  protected tick(): void {
    if (this.controls.anyPressed('jump', 'start')) this.go({ type: 'done' });
  }
}
