import { Rng } from '../sim/Rng';

/**
 * Мини-синтезатор чиптюн-эффектов в духе jsfxr: заглушки звуков до этапа 4 (ТЗ: «Звук»).
 * Чистый модуль: пресет → PCM-сэмплы. Phaser-обвязка — systems/Audio.ts.
 */
export type Wave = 'square' | 'triangle' | 'saw' | 'noise';

export interface SfxPreset {
  readonly wave: Wave;
  /** Скважность для square: 0.125, 0.25, 0.5 — как у NES. */
  readonly duty?: number;
  /** Частота в начале, Гц. */
  readonly freq: number;
  /** Частота в конце (скольжение), Гц. */
  readonly freqEnd?: number;
  /** Арпеджио: множители частоты по очереди, шаг arpStep секунд. */
  readonly arpeggio?: readonly number[];
  readonly arpStep?: number;
  readonly attack: number;
  readonly sustain: number;
  readonly decay: number;
  readonly volume: number;
}

export function presetDuration(p: SfxPreset): number {
  return p.attack + p.sustain + p.decay;
}

/** Громкость огибающей в момент t (0…1). */
function envelope(p: SfxPreset, t: number): number {
  if (t < p.attack) return p.attack > 0 ? t / p.attack : 1;
  if (t < p.attack + p.sustain) return 1;
  const d = t - p.attack - p.sustain;
  return p.decay > 0 ? Math.max(0, 1 - d / p.decay) : 0;
}

export function renderSfx(p: SfxPreset, sampleRate: number, seed = 1): Float32Array {
  const dur = presetDuration(p);
  const n = Math.max(1, Math.round(dur * sampleRate));
  const out = new Float32Array(n);
  const rng = new Rng(seed);
  const duty = p.duty ?? 0.5;
  let phase = 0;
  let noise = 0;
  let lastNoisePhase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const k = n > 1 ? i / (n - 1) : 0;
    let f = p.freqEnd === undefined ? p.freq : p.freq * Math.pow(p.freqEnd / p.freq, k);
    if (p.arpeggio && p.arpeggio.length > 0 && p.arpStep) {
      const step = Math.min(p.arpeggio.length - 1, Math.floor(t / p.arpStep));
      f *= p.arpeggio[step] ?? 1;
    }
    phase = (phase + f / sampleRate) % 1;
    let s: number;
    switch (p.wave) {
      case 'square':
        s = phase < duty ? 1 : -1;
        break;
      case 'triangle':
        s = 1 - 4 * Math.abs(phase - 0.5);
        break;
      case 'saw':
        s = 2 * phase - 1;
        break;
      case 'noise':
        // Новое случайное значение раз в период — «шипение» с высотой, как у шумового канала NES.
        if (phase < lastNoisePhase) noise = rng.next() * 2 - 1;
        lastNoisePhase = phase;
        s = noise;
        break;
    }
    out[i] = s * envelope(p, t) * p.volume;
  }
  return out;
}
