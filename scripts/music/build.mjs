// Собирает музыку игры: каждая песня из songs.mjs → assets/music/<ключ>.ogg (Ogg Vorbis, нужен
// ffmpeg). Запуск: npm run music. Ключи — те, что играет игра (src/systems/musicFiles.ts).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SONGS } from './songs.mjs';
import { renderSong, SAMPLE_RATE, toWav } from './synth.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = join(root, 'assets/music');
mkdirSync(dir, { recursive: true });

for (const [name, song] of Object.entries(SONGS)) {
  const pcm = renderSong({ name, ...song });
  const wav = join(dir, `${name}.wav`);
  const ogg = join(dir, `${name}.ogg`);
  writeFileSync(wav, toWav(pcm));
  // Встроенный кодер vorbis (libvorbis есть не в каждой сборке ffmpeg): экспериментальный, только стерео.
  // prettier-ignore
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'vorbis', '-strict', 'experimental', '-ac', '2', '-q:a', '5', ogg]);
  rmSync(wav);
  console.log(`${name}.ogg: ${(pcm.length / SAMPLE_RATE).toFixed(1)} s`);
}
