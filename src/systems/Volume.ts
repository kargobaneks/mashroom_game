/**
 * Громкость музыки и звуков — отдельно, шагами 0…10 (ползунки в меню паузы). Хранится в браузере
 * (localStorage); нет доступа к хранилищу — работают значения по умолчанию.
 */
export type VolumeChannel = 'music' | 'sfx';

export const VOLUME_STEPS = 10;
const DEFAULTS: Record<VolumeChannel, number> = { music: 7, sfx: 8 };
const KEY = (c: VolumeChannel) => `komnata.volume.${c}`;

const levels: Record<VolumeChannel, number> = { ...DEFAULTS };
for (const c of ['music', 'sfx'] as const) {
  try {
    const raw = globalThis.localStorage?.getItem(KEY(c));
    const n = raw === null || raw === undefined ? NaN : Number(raw);
    if (Number.isInteger(n) && n >= 0 && n <= VOLUME_STEPS) levels[c] = n;
  } catch {
    // Хранилище недоступно (приватное окно) — по умолчанию.
  }
}

/** Шаг громкости 0…10. */
export function volumeStep(c: VolumeChannel): number {
  return levels[c];
}

/** Громкость 0…1 для Phaser. */
export function volume(c: VolumeChannel): number {
  return levels[c] / VOLUME_STEPS;
}

/** Сдвинуть на шаг (±1), в пределах 0…10. Возвращает новый шаг. */
export function nudgeVolume(c: VolumeChannel, delta: number): number {
  levels[c] = Math.max(0, Math.min(VOLUME_STEPS, levels[c] + delta));
  try {
    globalThis.localStorage?.setItem(KEY(c), String(levels[c]));
  } catch {
    // Не сохранилось — ничего страшного.
  }
  return levels[c];
}

/** Ползунок текстом: «■■■■■■■□□□». */
export function volumeBar(c: VolumeChannel): string {
  return '■'.repeat(levels[c]) + '□'.repeat(VOLUME_STEPS - levels[c]);
}
