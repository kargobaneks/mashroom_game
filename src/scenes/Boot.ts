import tilesUrl from '../../assets/tilesets/placeholder.png';
import { artTextureKey, LEVELS } from '../data/levels';
import { registerHeroSprites } from '../render/heroSprites';
import { TILESET_KEY } from '../render/LevelView';
import { registerSpriteAtlas } from '../render/spriteAtlas';
import { musicKey, registerSfx, sfxKey } from '../systems/Audio';
import { t } from '../systems/Text';
import { registerPixelFont } from '../ui/font';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Загрузка ассетов, сборка шрифта, спрайтов и звуков-заглушек, затем титул. */
export class Boot extends BaseScene {
  private ready = false;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image(TILESET_KEY, tilesUrl);
    for (const parts of Object.values(LEVELS)) {
      for (const part of parts) this.load.image(artTextureKey(part.artTileset), part.artUrl);
    }
  }

  protected build(): void {
    this.ready = false;
    registerPixelFont(this);
    registerHeroSprites(this);
    registerSpriteAtlas(this);
    uiText(this, 8, 8, t('scene.boot'));
    if (import.meta.env.DEV) {
      // Только dev: локальные звуки из assets/dev-overrides/. Импорт стоит прямо в этой ветке,
      // чтобы сборщик выкинул его из прод-сборки вместе с файлами.
      void import('../dev/overrides')
        .then(({ DEV_OVERRIDES }) => this.loadOverrides(DEV_OVERRIDES))
        .then(() => this.finish());
    } else {
      this.finish();
    }
  }

  private async loadOverrides(
    list: readonly { kind: 'sfx' | 'music'; name: string; url: string }[],
  ): Promise<void> {
    if (list.length === 0) return;
    for (const o of list)
      this.load.audio(o.kind === 'sfx' ? sfxKey(o.name) : musicKey(o.name), o.url);
    await new Promise<void>((resolve) => {
      this.load.once('complete', () => resolve());
      this.load.start();
    });
  }

  private finish(): void {
    // Сгенерированные заглушки — для всего, что не загружено из файлов.
    registerSfx(this);
    this.ready = true;
  }

  protected tick(): void {
    if (this.ready) this.switchTo({ scene: 'Title' });
  }
}
