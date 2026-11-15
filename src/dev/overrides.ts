/**
 * Только для `npm run dev`: локальные файлы звуков и музыки из assets/dev-overrides/
 * (папка в .gitignore, в прод-сборку не попадает — модуль подключается лишь в dev-ветке).
 * Имя файла = ключ: sfx/jump.wav заменяет сгенерированный «jump», music/level1.ogg — трек уровня 1.
 * Ключи звуков — config/sfx.ts; треки: title, level1…level9, park, boss, escape, ending.
 */
const files = import.meta.glob('/assets/dev-overrides/{sfx,music}/*.{wav,ogg,mp3}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface Override {
  readonly kind: 'sfx' | 'music';
  readonly name: string;
  readonly url: string;
}

export const DEV_OVERRIDES: readonly Override[] = Object.entries(files).flatMap(([path, url]) => {
  const m = /\/(sfx|music)\/([^/]+)\.(?:wav|ogg|mp3)$/.exec(path);
  return m ? [{ kind: m[1] as 'sfx' | 'music', name: m[2]!, url }] : [];
});
