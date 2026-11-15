import Phaser from 'phaser';
import { isSfxName, SFX, type SfxName } from '../config/sfx';
import { renderSfx } from './Synth';

const SFX_PREFIX = 'sfx-';
const MUSIC_PREFIX = 'music-';
const CURRENT_MUSIC = 'currentMusic';

export const sfxKey = (name: string): string => SFX_PREFIX + name;
export const musicKey = (name: string): string => MUSIC_PREFIX + name;

/**
 * Сгенерировать звуки-заглушки и положить в кэш Phaser. Звук, уже загруженный из файла
 * (подмена в dev, файлы композитора на этапе 4), не перезаписывается. Вызывать в Boot.create.
 */
export function registerSfx(scene: Phaser.Scene): void {
  const sound = scene.sound;
  if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) return; // нет Web Audio — играем без звука
  const ctx = sound.context;
  for (const [name, preset] of Object.entries(SFX)) {
    const key = sfxKey(name);
    if (scene.cache.audio.exists(key)) continue;
    const pcm = renderSfx(preset, ctx.sampleRate);
    const buf = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
    buf.getChannelData(0).set(pcm);
    scene.cache.audio.add(key, buf);
  }
}

/** Проиграть звук по имени. Неизвестное имя или отсутствие звука — тихо пропускаем. */
export function playSfx(scene: Phaser.Scene, name: SfxName | string): void {
  if (!isSfxName(name)) return;
  const key = sfxKey(name);
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key);
}

/**
 * Включить трек по кругу (ТЗ: титул, трек на уровень, босс, побег, финал). Своей музыки
 * пока нет: играет только то, что загружено из файлов. Тот же трек не перезапускается.
 */
export function playMusic(scene: Phaser.Scene, name: string): void {
  const key = musicKey(name);
  const registry = scene.game.registry;
  if (registry.get(CURRENT_MUSIC) === key) return;
  stopMusic(scene);
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { loop: true });
  registry.set(CURRENT_MUSIC, key);
}

export function stopMusic(scene: Phaser.Scene): void {
  const registry = scene.game.registry;
  const cur = registry.get(CURRENT_MUSIC) as string | undefined;
  if (cur) scene.sound.stopByKey(cur);
  registry.set(CURRENT_MUSIC, undefined);
}
