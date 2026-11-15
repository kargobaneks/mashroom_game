import type Phaser from 'phaser';
import {
  buildGlyphs,
  FONT_CELL,
  FONT_LETTER_SPACING,
  FONT_SPACE_ADVANCE,
  glyphFor,
  LOWERCASE_RANGES,
  type Glyph,
} from '../systems/PixelFont';

export const FONT_KEY = 'pixel';
const ATLAS_COLUMNS = 16;

interface CharData {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  xOffset: number;
  yOffset: number;
  xAdvance: number;
  data: object;
  kerning: object;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/**
 * Собирает текстуру пиксельного шрифта из данных глифов и регистрирует её как BitmapFont.
 * Глифы белые — цвет задаётся tint-ом. Вызывать один раз при загрузке (Boot).
 */
export function registerPixelFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(FONT_KEY)) return;

  const glyphs = buildGlyphs();
  const rowsCount = Math.ceil(glyphs.length / ATLAS_COLUMNS);
  const texW = ATLAS_COLUMNS * FONT_CELL.width;
  const texH = rowsCount * FONT_CELL.height;
  const tex = scene.textures.createCanvas(FONT_KEY, texW, texH);
  if (!tex) throw new Error('Cannot create font texture');
  const ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';

  const chars: Record<number, CharData> = {};
  const place = new Map<Glyph, { x: number; y: number }>();
  glyphs.forEach((g, i) => {
    const x = (i % ATLAS_COLUMNS) * FONT_CELL.width;
    const y = Math.floor(i / ATLAS_COLUMNS) * FONT_CELL.height;
    place.set(g, { x, y });
    g.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++)
        if (row[rx] === '#') ctx.fillRect(x + rx, y + ry, 1, 1);
    });
  });
  tex.refresh();

  const entry = (g: Glyph): CharData => {
    const p = place.get(g);
    if (!p) throw new Error(`Glyph not placed: ${g.char}`);
    return {
      x: p.x,
      y: p.y,
      width: g.width,
      height: FONT_CELL.height,
      centerX: Math.floor(g.width / 2),
      centerY: Math.floor(FONT_CELL.height / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: g.width + FONT_LETTER_SPACING,
      data: {},
      kerning: {},
      u0: p.x / texW,
      v0: p.y / texH,
      u1: (p.x + g.width) / texW,
      v1: (p.y + FONT_CELL.height) / texH,
    };
  };

  const byChar = new Map(glyphs.map((g) => [g.char, g]));
  for (const g of glyphs) chars[g.char.charCodeAt(0)] = entry(g);
  for (const range of LOWERCASE_RANGES) {
    for (const ch of range) {
      const g = glyphFor(ch, byChar);
      if (g) chars[ch.charCodeAt(0)] = entry(g);
    }
  }
  chars[' '.charCodeAt(0)] = {
    ...entry(glyphs[0]!),
    width: 0,
    u1: 0,
    v1: 0,
    xAdvance: FONT_SPACE_ADVANCE,
  };

  scene.cache.bitmapFont.add(FONT_KEY, {
    data: { font: FONT_KEY, size: FONT_CELL.height, lineHeight: FONT_CELL.height, chars },
    texture: FONT_KEY,
    frame: null,
  });
}
