// Чиптюн-синтезатор в духе NES для музыки игры: прямоугольник 25% (мелодия), прямоугольник
// 12,5% (арпеджио), треугольник (бас), шум (ударные). Песня — данные (songs.mjs): темп, размер,
// такты с аккордом и мелодией, стиль баса и ударных.
const RATE = 22050;

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** «C#5», «Eb4» → MIDI. */
function midi(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) throw new Error(`note ${name}`);
  return (Number(m[3]) + 1) * 12 + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

/** «Am», «F#m», «Bb», «Bdim» → корень (MIDI, 2-я октава) и арпеджио (3–4-я октава). */
function chord(name) {
  const m = /^([A-G])([#b]?)(m|dim)?$/.exec(name);
  if (!m) throw new Error(`chord ${name}`);
  const pc = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const third = m[3] ? 3 : 4;
  const fifth = m[3] === 'dim' ? 6 : 7;
  const root = 36 + pc; // C2…B2
  const a = 48 + pc;
  return { root, fifth: root + fifth, arp: [a, a + third, a + fifth, a + 12] };
}

/** «E5:4 E5:2 R:2» → [[midi | null, шестнадцатых]]. */
function melody(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const [n, len] = tok.split(':');
      return [n === 'R' ? null : midi(n), Number(len)];
    });
}

const pulse = (phase, duty) => (phase % 1 < duty ? 1 : -1);
const triangle = (phase) => {
  const p = phase % 1;
  const v = p < 0.5 ? p * 4 - 1 : 3 - p * 4;
  return Math.round(v * 7.5) / 7.5; // 4-битная лесенка, как у NES
};

/**
 * Отрисовать песню в PCM (Float32, моно).
 * song: { bpm, steps (шестнадцатых в такте: 16 или 12), lead: duty, arp: bool,
 *         bass: 'octave' | 'pulse' | 'boomchick' | 'walk' | 'long',
 *         drums: 'rock' | 'march' | 'waltz' | 'gallop' | 'light' | 'fast',
 *         bars: [[аккорд, мелодия-строка], …] }
 */
export function renderSong(song) {
  const STEP = 60 / song.bpm / 4;
  const steps = song.steps ?? 16;
  const bars = song.bars.map(([c, m]) => ({ chord: chord(c), notes: melody(m) }));
  bars.forEach((b, i) => {
    const sum = b.notes.reduce((s, [, l]) => s + l, 0);
    if (sum !== steps) throw new Error(`${song.name}: bar ${i + 1} has ${sum}/${steps}`);
  });
  const n = Math.round(bars.length * steps * STEP * RATE);
  const out = new Float32Array(n);
  const add = (t0, dur, fn) => {
    const i0 = Math.round(t0 * RATE);
    const i1 = Math.min(n, Math.round((t0 + dur) * RATE));
    for (let i = i0; i < i1; i++) out[i] += fn((i - i0) / RATE, (i1 - i) / RATE);
  };
  let noise = 1;
  const lfsr = () => {
    const bit = (noise ^ (noise >> 1)) & 1;
    noise = (noise >> 1) | (bit << 14);
    return noise & 1 ? 1 : -1;
  };
  const kick = (t0, v = 0.35) =>
    add(
      t0,
      0.12,
      (t) => v * Math.exp(-t * 22) * Math.sin(2 * Math.PI * (110 * Math.exp(-t * 25) + 45) * t),
    );
  const snare = (t0, v = 0.14) => add(t0, 0.14, (t) => v * Math.exp(-t * 20) * lfsr());
  const hat = (t0, v = 0.05) => add(t0, 0.03, (t) => v * Math.exp(-t * 90) * lfsr());
  const tri = (t0, dur, m, v = 0.22) =>
    add(t0, dur, (t, left) => v * Math.min(1, left / 0.01) * triangle(t * hz(m)));

  bars.forEach((bar, b) => {
    const t = b * steps * STEP;
    const c = bar.chord;
    // Мелодия.
    let s = 0;
    for (const [m, len] of bar.notes) {
      if (m !== null) {
        const f = hz(m);
        add(t + s * STEP, len * STEP * 0.92, (x, left) => {
          const vib = x > 0.15 ? 1 + 0.004 * Math.sin(x * 2 * Math.PI * 6) : 1;
          const env =
            Math.min(1, x / 0.005) * Math.min(1, left / 0.02) * (0.85 + 0.15 * Math.exp(-x * 6));
          return 0.16 * env * pulse(x * f * vib, song.lead ?? 0.25);
        });
      }
      s += len;
    }
    // Арпеджио шестнадцатыми.
    if (song.arp !== false)
      for (let k = 0; k < steps; k++) {
        const f = hz(c.arp[k % 4]);
        add(t + k * STEP, STEP * 0.8, (x) => 0.06 * Math.exp(-x * 18) * pulse(x * f, 0.125));
      }
    // Бас.
    const bass = song.bass ?? 'octave';
    if (bass === 'octave')
      for (let k = 0; k < steps; k += 2)
        tri(t + k * STEP, STEP * 1.8, c.root + ((k / 2) % 2 ? 12 : 0));
    else if (bass === 'pulse')
      for (let k = 0; k < steps; k++) tri(t + k * STEP, STEP * 0.8, c.root);
    else if (bass === 'boomchick')
      for (let k = 0; k < steps; k += 4)
        tri(t + k * STEP, STEP * 1.6, (k / 4) % 2 ? c.fifth : c.root);
    else if (bass === 'walk') {
      const w = [c.root, c.arp[1] - 12, c.fifth, c.root + 12];
      for (let k = 0; k < steps; k += 4) tri(t + k * STEP, STEP * 3.6, w[(k / 4) % 4]);
    } else if (bass === 'long') tri(t, steps * STEP * 0.95, c.root);
    // Ударные.
    const drums = song.drums ?? 'rock';
    for (let k = 0; k < steps; k += 2) {
      const x = t + k * STEP;
      if (drums === 'rock' || drums === 'fast') {
        if (k === 0 || k === 8 || (drums === 'fast' && (k === 6 || k === 14))) kick(x);
        else if (k === 4 || k === 12) snare(x);
        else hat(x);
      } else if (drums === 'march') {
        if (k === 0 || k === 8) kick(x);
        else if (k === 4 || k === 12) snare(x, 0.12);
        if (k === 12 && b % 2 === 1) for (const d of [13, 14, 15]) snare(t + d * STEP, 0.08);
      } else if (drums === 'waltz') {
        if (k === 0) kick(x, 0.28);
        else if (k === 4 || k === 8) hat(x, 0.06);
      } else if (drums === 'gallop') {
        if (k % 4 === 0) kick(x, 0.25);
        else snare(x, 0.07);
        hat(x + STEP, 0.04);
      } else if (drums === 'light') {
        if (k === 0) kick(x, 0.2);
        hat(x, 0.035);
      }
    }
    if (song.fillLast && b === bars.length - 1)
      for (const k of [steps - 4, steps - 3, steps - 2, steps - 1]) snare(t + k * STEP, 0.12);
  });
  return out;
}

/** PCM → WAV 16 бит моно (нормализация до −1 дБ). */
export function toWav(pcm) {
  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  const gain = 0.89 / (peak || 1);
  const data = Buffer.alloc(pcm.length * 2);
  pcm.forEach((v, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * gain)) * 32767), i * 2),
  );
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

export const SAMPLE_RATE = RATE;
