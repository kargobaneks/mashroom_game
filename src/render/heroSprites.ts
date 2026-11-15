import type Phaser from 'phaser';
import { composeHero, HERO_PALETTES, HERO_POSES, HERO_SPRITE, type HeroPose } from '../art/heroes';
import type { HeroId } from '../systems/Flow';

export const HEROES_TEXTURE = 'heroes';
const HERO_IDS: readonly HeroId[] = ['sergey', 'ivan'];

export function heroFrameName(hero: HeroId, pose: HeroPose): string {
  return `${hero}:${pose}`;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Собрать текстуру ведущих: строка на героя, столбец на позу. Вызывать один раз в Boot. */
export function registerHeroSprites(scene: Phaser.Scene): void {
  if (scene.textures.exists(HEROES_TEXTURE)) return;
  const { width: W, height: H } = HERO_SPRITE;
  const tex = scene.textures.createCanvas(
    HEROES_TEXTURE,
    W * HERO_POSES.length,
    H * HERO_IDS.length,
  );
  if (!tex) throw new Error('Cannot create hero texture');
  const ctx = tex.getContext();
  HERO_IDS.forEach((hero, row) => {
    const pal = HERO_PALETTES[hero];
    HERO_POSES.forEach((pose, col) => {
      const ox = col * W;
      const oy = row * H;
      composeHero(hero, pose).forEach((line, y) => {
        for (let x = 0; x < line.length; x++) {
          const c = line[x] as 'D' | 'S' | 'H' | '.';
          if (c === '.') continue;
          ctx.fillStyle = hex(pal[c]);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      });
      tex.add(heroFrameName(hero, pose), 0, ox, oy, W, H);
    });
  });
  tex.refresh();
}
