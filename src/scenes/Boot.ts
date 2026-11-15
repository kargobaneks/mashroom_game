import { t } from '../systems/Text';
import { registerPixelFont } from '../ui/font';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Загрузка ассетов и сборка пиксельного шрифта, затем титул. */
export class Boot extends BaseScene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Этап 1+: загрузка по assets/manifest.json.
  }

  protected build(): void {
    registerPixelFont(this);
    uiText(this, 8, 8, t('scene.boot'));
  }

  protected tick(): void {
    this.switchTo({ scene: 'Title' });
  }
}
