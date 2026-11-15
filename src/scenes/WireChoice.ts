import { PALETTE } from '../ui/palette';
import { t } from '../systems/Text';
import { Menu } from '../ui/Menu';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Выбор провода после уровня 1. Эффекты («смысл» → +1 жизнь) — этап 2. */
export class WireChoice extends BaseScene {
  private menu!: Menu;

  constructor() {
    super('WireChoice');
  }

  protected build(): void {
    uiText(this, 32, 64, t('scene.wire'));
    this.menu = new Menu(
      this,
      [{ label: t('wire.hype') }, { label: t('wire.meaning') }],
      40,
      96,
      16,
    );
    uiText(this, 32, 208, t('hint.menu'), { color: PALETTE.gray });
  }

  protected tick(): void {
    if (this.menu.update(this.controls) !== null) this.go({ type: 'done' });
  }
}
