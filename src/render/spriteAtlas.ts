import type Phaser from 'phaser';
import { SPRITES, spriteFrameName } from '../art/sprites';

export const SPRITES_TEXTURE = 'sprites';
const ATLAS_WIDTH = 256;
const GAP = 1;

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Собрать атлас всех спрайтов из art/sprites.ts (полками слева направо). Вызывать в Boot. */
export function registerSpriteAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(SPRITES_TEXTURE)) return;

  // Раскладка полками.
  const places: {
    id: string;
    frame: string;
    rows: readonly string[];
    pal: Readonly<Record<string, number>>;
    x: number;
    y: number;
    w: number;
    h: number;
  }[] = [];
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const [id, def] of Object.entries(SPRITES)) {
    for (const [frame, rows] of Object.entries(def.frames)) {
      if (x + def.w > ATLAS_WIDTH) {
        x = 0;
        y += shelf + GAP;
        shelf = 0;
      }
      places.push({ id, frame, rows, pal: def.palette, x, y, w: def.w, h: def.h });
      x += def.w + GAP;
      shelf = Math.max(shelf, def.h);
    }
  }
  const height = y + shelf;

  const tex = scene.textures.createCanvas(SPRITES_TEXTURE, ATLAS_WIDTH, height);
  if (!tex) throw new Error('Cannot create sprite atlas');
  const ctx = tex.getContext();
  for (const p of places) {
    p.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const c = row[rx];
        if (c === undefined || c === '.') continue;
        const color = p.pal[c];
        if (color === undefined) throw new Error(`Sprite ${p.id}:${p.frame}: no colour for '${c}'`);
        ctx.fillStyle = hex(color);
        ctx.fillRect(p.x + rx, p.y + ry, 1, 1);
      }
    });
    tex.add(spriteFrameName(p.id, p.frame), 0, p.x, p.y, p.w, p.h);
  }
  tex.refresh();
}
