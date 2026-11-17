import titleArtUrl from '../../assets/title/title.png';
import tilesUrl from '../../assets/tilesets/placeholder.png';
import { CUTSCENE_IMAGES, cutsceneTextureKey } from '../data/cutscenes';
import { artTextureKey, LEVELS } from '../data/levels';
import { registerHeroSprites } from '../render/heroSprites';
import { TILESET_KEY } from '../render/LevelView';
import { registerSpriteAtlas } from '../render/spriteAtlas';
import { musicKey, registerSfx, sfxKey } from '../systems/Audio';
import { MUSIC_FILES } from '../systems/musicFiles';
import { newRun, routeOf } from '../systems/Flow';
import { t } from '../systems/Text';
import { registerPixelFont } from '../ui/font';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';
import { TITLE_ART_KEY } from './Title';

/** Загрузка ассетов, сборка шрифта, спрайтов и звуков-заглушек, затем титул. */
export class Boot extends BaseScene {
  private ready = false;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image(TILESET_KEY, tilesUrl);
    this.load.image(TITLE_ART_KEY, titleArtUrl);
    for (const parts of Object.values(LEVELS)) {
      for (const part of parts) this.load.image(artTextureKey(part.artTileset), part.artUrl);
    }
    for (const [bg, url] of Object.entries(CUTSCENE_IMAGES))
      this.load.image(cutsceneTextureKey(bg), url);
    // Музыка из репозитория (assets/music).
    for (const f of MUSIC_FILES) this.load.audio(musicKey(f.name), f.url);
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
    for (const o of list) {
      const key = o.kind === 'sfx' ? sfxKey(o.name) : musicKey(o.name);
      // Локальная версия важнее той, что в репозитории.
      if (this.cache.audio.exists(key)) this.cache.audio.remove(key);
      this.load.audio(key, o.url);
    }
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
    if (!this.ready) return;
    // Только dev: ?story=N[&players=2][&part=K] — сразу на шаг N сценария (STORY), например
    // 7 — бонус «Кран»; part — часть уровня (с 0), например ?story=15&part=5 — коридор 9-5.
    const story = import.meta.env.DEV ? new URLSearchParams(location.search).get('story') : null;
    if (story !== null) {
      const players = new URLSearchParams(location.search).get('players') === '2' ? 2 : 1;
      const run = { ...newRun(players, 'sergey'), step: Number(story) };
      const route = routeOf(run);
      const part = Number(new URLSearchParams(location.search).get('part') ?? 0);
      this.startRun(run, route.scene === 'Level' && part > 0 ? { ...route, part } : route);
      return;
    }
    this.switchTo({ scene: 'Title' });
  }
}
