import { isSfxName } from '../config/sfx';

/**
 * Только для `npm run dev`: локальные файлы звуков и музыки из assets/dev-overrides/
 * (папка в .gitignore, в прод-сборку не попадает — модуль подключается лишь в dev-ветке).
 * Ищем и во вложенных папках; берём только файлы, чьё имя — известный ключ:
 * sfx/…/jump.wav заменяет сгенерированный «jump», music/…/level1.mp3 — трек уровня 1.
 * Ключи звуков — config/sfx.ts; треки — MUSIC_KEYS ниже.
 */
const files = import.meta.glob('/assets/dev-overrides/{sfx,music}/**/*.{wav,ogg,mp3}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

import { MUSIC_KEYS } from '../systems/musicFiles';

export interface Override {
  readonly kind: 'sfx' | 'music';
  readonly name: string;
  readonly url: string;
}

export const DEV_OVERRIDES: readonly Override[] = Object.entries(files).flatMap(([path, url]) => {
  const m = /\/dev-overrides\/(sfx|music)\/(?:.*\/)?([^/]+)\.(?:wav|ogg|mp3)$/.exec(path);
  if (!m) return [];
  const kind = m[1] as 'sfx' | 'music';
  const name = m[2]!;
  const known = kind === 'sfx' ? isSfxName(name) : MUSIC_KEYS.includes(name);
  return known ? [{ kind, name, url }] : [];
});
