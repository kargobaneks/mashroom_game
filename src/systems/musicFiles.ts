/**
 * Музыка игры из репозитория: assets/music/<трек>.mp3|ogg|wav — коммитится и попадает в сборку.
 * Свои локальные версии для разработки — в assets/dev-overrides/music/ (их приоритет выше).
 * Только своя или лицензированная музыка: треки оригинала сюда не кладём (CONCEPT.md).
 */
const files = import.meta.glob('/assets/music/**/*.{wav,ogg,mp3}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Боссы по уровням: 1 Агранович … 9 Машина Конца Истории (имя — как в коде боссов). */
export const BOSS_NAMES: readonly string[] = [
  'agranovich',
  'uralov',
  'bordachev',
  'mikitko',
  'shchelin',
  'duo',
  'markov',
  'machine',
];

/** Треки, которые игра включает (ТЗ: титул, трек на уровень, босс, парк, побег, финал). */
export const MUSIC_KEYS: readonly string[] = [
  'title',
  ...Array.from({ length: 9 }, (_, i) => `level${i + 1}`),
  'park',
  'boss',
  // Свой трек босса (не нашёлся — играет общий `boss`).
  ...BOSS_NAMES.map((b) => `boss-${b}`),
  'escape',
  'ending',
];

/** Треки из assets/music: имя файла — ключ трека; файлы с другими именами пропускаются. */
export const MUSIC_FILES: readonly { readonly name: string; readonly url: string }[] =
  Object.entries(files).flatMap(([path, url]) => {
    const m = /\/([^/]+)\.(?:wav|ogg|mp3)$/.exec(path);
    const name = m?.[1];
    return name && MUSIC_KEYS.includes(name) ? [{ name, url }] : [];
  });
