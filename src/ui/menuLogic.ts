/** Чистая логика меню (без Phaser) — тестируется отдельно. */
export interface MenuItem {
  readonly label: string;
  readonly enabled?: boolean;
}

/** Индекс следующего доступного пункта (с переходом через край). */
export function nextEnabled(items: readonly MenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (items[i]?.enabled !== false) return i;
  }
  return from;
}
