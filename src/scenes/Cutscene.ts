import { PALETTE } from '../ui/palette';
import { t } from '../systems/Text';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Заглушка кат-сцены: текстовое окно сверху. Печать по символу и JSON-кадры — этап 2. */
export class Cutscene extends BaseScene<{ id: string }> {
  constructor() {
    super('Cutscene');
  }

  protected build({ id }: { id: string }): void {
    this.add.rectangle(4, 4, 248, 72, PALETTE.black).setOrigin(0).setStrokeStyle(1, PALETTE.white);
    uiText(this, 12, 12, t('scene.cutscene', { id }), { color: PALETTE.gray });
    uiText(this, 12, 28, t(`cutscene.${id}`));
    uiText(this, 12, 208, t('hint.confirm'), { color: PALETTE.gray });
  }

  protected tick(): void {
    if (this.controls.anyPressed('jump', 'start')) this.go({ type: 'done' });
  }
}
