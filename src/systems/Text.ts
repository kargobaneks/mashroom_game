import ru from '../data/text/ru.json';

const TABLE: Readonly<Record<string, string>> = ru;

/**
 * Игровой текст из data/text/ru.json. Параметры подставляются вместо {имя}.
 * Отсутствующий ключ возвращается как [ключ] — видно на экране, но игра не падает.
 */
export function t(key: string, params: Readonly<Record<string, string | number>> = {}): string {
  const raw = TABLE[key];
  if (raw === undefined) {
    if (import.meta.env?.DEV) console.warn(`[text] missing key: ${key}`);
    return `[${key}]`;
  }
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : String(v);
  });
}

export function hasText(key: string): boolean {
  return key in TABLE;
}
